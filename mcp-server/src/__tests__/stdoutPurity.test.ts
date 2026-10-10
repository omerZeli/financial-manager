import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import type { Salary } from '@financial-manager/shared';

// Property 8: stdout purity
// Validates: Requirements 14.1, 14.2, 14.3
//
// "No tool call or boot step writes to stdout except MCP protocol frames. All
//  logs/errors go to stderr."
//
// Strategy
// --------
// We boot the REAL server (index.ts `main()`) and invoke a REAL tool handler,
// but mock every external boundary so nothing touches the network, the real
// stdout protocol stream, or any credential:
//
//   - ../config.js      -> loadConfig returns a PLACEHOLDER Config (no creds).
//   - ../auth/session.js-> createSession returns a fake session whose
//                          getClient() hands back a stub client. The real
//                          tools/registry, tool handlers and salary service
//                          still execute against this stub.
//   - ../data/salaries.js-> fetchSalaries returns fixture rows, so a handler
//                          can run end-to-end without a database.
//   - the MCP SDK's McpServer + StdioServerTransport are replaced with fakes:
//       * the fake McpServer records every registerTool(name, cfg, handler)
//         call so we can pull a registered handler and invoke it ourselves,
//         simulating a tool call;
//       * the fake transport makes server.connect() a no-op so the real
//         StdioServerTransport never takes over the process's real stdout.
//
// With the real StdioServerTransport mocked away, the ONLY code paths that
// could write to the process stdout are the server's own boot + handler code.
// The invariant under test is that those paths write NOTHING to stdout - every
// diagnostic (the readiness line, any error) goes to stderr via console.error
// (which writes to process.stderr).
//
// All values here are opaque PLACEHOLDERS - there are no real credentials.

// ---------------------------------------------------------------------------
// Fixtures + fakes
// ---------------------------------------------------------------------------

// Fixture salary rows the mocked data reader returns. Overridable per test so
// the property run can vary the data the real service/handler process.
let salaryRows: Salary[] = [];

function makeSalary(partial: Partial<Salary> & { id: string }): Salary {
  return {
    id: partial.id,
    user_id: partial.user_id ?? 'user-1',
    month: partial.month ?? '2024-01-01',
    employer: partial.employer ?? 'ACME',
    bruto: partial.bruto ?? 10000,
    neto: partial.neto ?? 8000,
    created_at: partial.created_at ?? '2024-01-01T00:00:00.000Z',
  };
}

// A minimal stub Supabase client. The salary service/data reader are mocked out
// below, so no query actually runs through this - but ToolContext.client must
// be non-null, and a defensive query chain keeps any accidental call inert.
const fakeClient = {
  from: () => {
    const chain: Record<string, unknown> = {};
    const self = () => chain as never;
    chain.select = self;
    chain.eq = self;
    chain.gte = self;
    chain.lte = self;
    chain.order = self;
    chain.limit = self;
    chain.then = (resolve: (v: { data: Salary[]; error: null }) => void) =>
      resolve({ data: salaryRows, error: null });
    return chain;
  },
};

// Captured registered tool handlers from the fake McpServer, keyed by name.
type RegisteredHandler = (
  args: Record<string, unknown>,
) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;
let registeredHandlers: Map<string, RegisteredHandler>;
let connectCalls: number;

// Mock the config loader: placeholder Config, no real credentials, no env read.
vi.mock('../config.js', () => ({
  loadConfig: () => ({
    supabaseUrl: 'https://placeholder.example.supabase.co',
    supabaseAnonKey: 'placeholder-anon-key',
    userEmail: 'placeholder@example.com',
    userPassword: 'placeholder-password',
  }),
}));

// Mock the auth session: no network sign-in; hand back the stub client.
vi.mock('../auth/session.js', () => ({
  createSession: async () => ({ getClient: () => fakeClient }),
}));

// Mock the salaries data reader so the real service + handler run against
// fixture rows instead of a live Supabase query.
vi.mock('../data/salaries.js', () => ({
  fetchSalaries: async () => salaryRows,
}));

// Fake McpServer: records registerTool handlers; connect() is an inert resolve.
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  class FakeMcpServer {
    registerTool(
      name: string,
      _config: unknown,
      handler: RegisteredHandler,
    ): void {
      registeredHandlers.set(name, handler);
    }
    async connect(): Promise<void> {
      connectCalls += 1;
    }
  }
  return { McpServer: FakeMcpServer };
});

// Fake stdio transport: a plain object so the real transport never seizes the
// process's real stdout stream.
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  class FakeStdioServerTransport {}
  return { StdioServerTransport: FakeStdioServerTransport };
});

// Import AFTER all mocks are registered so index.ts binds to the fakes.
const { main } = await import('../index.js');

// ---------------------------------------------------------------------------
// Spies: capture every write to stdout / stderr for the whole test lifetime.
// ---------------------------------------------------------------------------

let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  salaryRows = [];
  registeredHandlers = new Map();
  connectCalls = 0;

  // Swallow the writes (return true) so nothing actually reaches the real
  // streams while the test runs; we only care that stdout is never written.
  stdoutSpy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation(() => true);
  stderrSpy = vi
    .spyOn(process.stderr, 'write')
    .mockImplementation(() => true);
  // The server logs diagnostics via console.error. Spy on it directly so the
  // readiness assertion is robust regardless of how Node's Console binds to
  // the underlying stream, while still proving logs do NOT reach stdout.
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Concatenate everything written to a spied stream into one string. */
function writes(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls
    .map((call) =>
      call
        .map((chunk) =>
          typeof chunk === 'string'
            ? chunk
            : Buffer.isBuffer(chunk)
              ? chunk.toString('utf8')
              : String(chunk),
        )
        .join(' '),
    )
    .join('\n');
}

// ---------------------------------------------------------------------------
// Example-based tests
// ---------------------------------------------------------------------------

describe('Property 8: stdout purity (Requirements 14.1, 14.2, 14.3)', () => {
  it('boot writes nothing to stdout and logs readiness to stderr (14.1, 14.2)', async () => {
    salaryRows = [makeSalary({ id: 's1' })];

    await main();

    // The real StdioServerTransport is mocked, so the only possible stdout
    // writer is server code - and it must write zero bytes to stdout.
    expect(stdoutSpy).not.toHaveBeenCalled();

    // Boot connected the (fake) transport exactly once and registered tools.
    expect(connectCalls).toBe(1);
    expect(registeredHandlers.has('list_salaries')).toBe(true);
    expect(registeredHandlers.has('get_salary_summary')).toBe(true);

    // Readiness is logged via console.error (which targets stderr), never
    // stdout. Assert the message appeared on that stderr-bound channel.
    const stderrOutput = writes(consoleErrorSpy) + writes(stderrSpy);
    expect(stderrOutput).toContain('financial-manager MCP server ready');
  });

  it('a tool-call handler writes nothing to stdout and returns a well-formed JSON ToolResult (14.1)', async () => {
    salaryRows = [
      makeSalary({ id: 's1', employer: 'ACME', bruto: 12000, neto: 9500 }),
      makeSalary({ id: 's2', employer: 'Globex', bruto: 8000, neto: 6500 }),
    ];

    await main();

    const handler = registeredHandlers.get('list_salaries');
    expect(handler).toBeDefined();

    // Clear boot-time writes so we isolate the handler's stdout discipline.
    stdoutSpy.mockClear();

    const result = await handler!({ limit: 100 });

    // The handler itself must not touch stdout.
    expect(stdoutSpy).not.toHaveBeenCalled();

    // Well-formed ToolResult: text content holding valid JSON.
    expect(result.content).toHaveLength(1);
    expect(result.content[0]?.type).toBe('text');
    expect(() => JSON.parse(result.content[0]!.text)).not.toThrow();
  });

  it('an errored tool call (inverted date range) stays off stdout and reports via the result/stderr (14.3)', async () => {
    salaryRows = [makeSalary({ id: 's1' })];
    await main();

    const handler = registeredHandlers.get('list_salaries');
    stdoutSpy.mockClear();

    // dateFrom > dateTo is a handled, tool-level error (isError result).
    const result = await handler!({ dateFrom: '2024-12-31', dateTo: '2024-01-01' });

    expect(stdoutSpy).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe('text');
  });
});

// ---------------------------------------------------------------------------
// Property dimension (fast-check)
// ---------------------------------------------------------------------------

/** ISO YYYY-MM-DD date within a bounded, realistic range. */
const isoDateArb = fc
  .date({
    min: new Date('2015-01-01'),
    max: new Date('2035-12-31'),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString().slice(0, 10));

/** Arbitrary salary fixture rows the mocked reader returns. */
const salaryRowArb = fc.record({
  id: fc.uuid(),
  employer: fc.constantFrom('ACME', 'Globex', 'Initech', 'Umbrella'),
  month: isoDateArb.map((d) => `${d.slice(0, 7)}-01`),
  bruto: fc.integer({ min: 0, max: 100_000 }),
  neto: fc.integer({ min: 0, max: 100_000 }),
});

/** Arbitrary VALID tool-call args (dateFrom <= dateTo when both present). */
const validArgsArb = fc
  .record(
    {
      bounds: fc
        .tuple(isoDateArb, isoDateArb)
        .map(([a, b]) => (a <= b ? [a, b] : [b, a]) as [string, string]),
      employer: fc.option(fc.constantFrom('ACME', 'Globex'), { nil: undefined }),
      limit: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
      withFrom: fc.boolean(),
      withTo: fc.boolean(),
    },
    { requiredKeys: ['bounds', 'employer', 'limit', 'withFrom', 'withTo'] },
  )
  .map(({ bounds, employer, limit, withFrom, withTo }) => {
    const args: Record<string, unknown> = {};
    if (withFrom) args.dateFrom = bounds[0];
    if (withTo) args.dateTo = bounds[1];
    if (employer !== undefined) args.employer = employer;
    if (limit !== undefined) args.limit = limit;
    return args;
  });

describe('Property 8: stdout purity holds across arbitrary tool calls (Requirement 14.1)', () => {
  it('invoking list_salaries over arbitrary valid args + rows never writes to stdout and always returns valid JSON', async () => {
    await main();
    const handler = registeredHandlers.get('list_salaries');
    expect(handler).toBeDefined();

    await fc.assert(
      fc.asyncProperty(
        fc.array(salaryRowArb, { maxLength: 12 }),
        validArgsArb,
        async (rows, args) => {
          salaryRows = rows.map((r) => makeSalary(r));

          stdoutSpy.mockClear();
          const result = await handler!(args);

          // Invariant 1: nothing on stdout, for ANY generated input.
          expect(stdoutSpy).not.toHaveBeenCalled();

          // Invariant 2: well-formed ToolResult with valid-JSON text content.
          expect(result.content).toHaveLength(1);
          expect(result.content[0]?.type).toBe('text');
          const parsed = JSON.parse(result.content[0]!.text);
          expect(Array.isArray(parsed)).toBe(true);
        },
      ),
      { numRuns: 80 },
    );
  });

  it('invoking get_salary_summary over arbitrary args + rows never writes to stdout and returns valid JSON', async () => {
    await main();
    const handler = registeredHandlers.get('get_salary_summary');
    expect(handler).toBeDefined();

    await fc.assert(
      fc.asyncProperty(
        fc.array(salaryRowArb, { maxLength: 12 }),
        validArgsArb,
        async (rows, args) => {
          salaryRows = rows.map((r) => makeSalary(r));

          stdoutSpy.mockClear();
          const result = await handler!(args);

          expect(stdoutSpy).not.toHaveBeenCalled();
          expect(result.content).toHaveLength(1);
          expect(result.content[0]?.type).toBe('text');
          const parsed = JSON.parse(result.content[0]!.text);
          // Summary shape: { totals, byMonth: [...] }.
          expect(parsed).toHaveProperty('totals');
          expect(Array.isArray(parsed.byMonth)).toBe(true);
        },
      ),
      { numRuns: 80 },
    );
  });

  it('inverted date ranges remain off stdout and surface as isError results (14.1, 14.3)', async () => {
    await main();
    const handler = registeredHandlers.get('list_salaries');

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(isoDateArb, isoDateArb).filter(([a, b]) => a !== b),
        async ([d1, d2]) => {
          // Force an inverted range: dateFrom strictly after dateTo.
          const [earlier, later] = d1 < d2 ? [d1, d2] : [d2, d1];
          salaryRows = [makeSalary({ id: 's1' })];

          stdoutSpy.mockClear();
          const result = await handler!({ dateFrom: later, dateTo: earlier });

          // Still no stdout, and the error is reported in the result (stderr/
          // result channel), never corrupting the protocol stream.
          expect(stdoutSpy).not.toHaveBeenCalled();
          expect(result.isError).toBe(true);
        },
      ),
      { numRuns: 60 },
    );
  });
});
