import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Salary } from '@financial-manager/shared';

// Unit tests for the salary TOOL modules + the shared date-range helper
// (task 8.4).
//
// Validates:
//   - Requirement 12.3 / 15.3 (zod schemas): each tool's `inputSchema` accepts
//     valid args and rejects invalid ones, with the zod error PATH naming the
//     offending field.
//   - Requirement 12.12 (from>to rejection): a handler called with an inverted
//     date range returns an isError ToolResult mentioning dateFrom/dateTo and
//     never touches the data layer.
//   - Requirement 15.5 (zero rows): with the data layer returning [], both
//     handlers return a SUCCESS ToolResult (no isError) whose text parses as
//     JSON (an empty array for list, a zeroed summary object for summary).
//
// Strategy: the list tool calls `fetchSalaries` from '../data/salaries.js' and
// the summary tool calls `getSalarySummary` (which also calls `fetchSalaries`).
// We mock the data module so no real Supabase client is used; the tool context
// client is an opaque sentinel. All data is fake placeholder rows.

let mockRows: Salary[] = [];

vi.mock('../data/salaries.js', () => ({
  fetchSalaries: vi.fn(async () => mockRows),
}));

const { listSalariesTool } = await import('../tools/listSalaries');
const { getSalarySummaryTool } = await import('../tools/getSalarySummary');
const { validateDateRange } = await import('../tools/dateRange');
const { fetchSalaries } = await import('../data/salaries.js');

// A tool context whose client is a sentinel. For the from>to rejection cases
// the handler short-circuits before the client is ever used.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx = { client: { __fake: true }, server: { __fake: true } } as any;

afterEach(() => {
  vi.clearAllMocks();
  mockRows = [];
});

describe('zod input schemas: valid args parse (12.3, 15.3)', () => {
  it('list_salaries accepts a fully-populated valid payload', () => {
    const parsed = listSalariesTool.inputSchema.safeParse({
      dateFrom: '2024-01-01',
      dateTo: '2024-03-01',
      employer: 'ACME',
      limit: 50,
    });
    expect(parsed.success).toBe(true);
  });

  it('list_salaries accepts an empty payload (all fields optional)', () => {
    expect(listSalariesTool.inputSchema.safeParse({}).success).toBe(true);
  });

  it('list_salaries accepts the limit boundaries 1 and 1000', () => {
    expect(listSalariesTool.inputSchema.safeParse({ limit: 1 }).success).toBe(true);
    expect(listSalariesTool.inputSchema.safeParse({ limit: 1000 }).success).toBe(true);
  });

  it('get_salary_summary accepts a valid payload (no limit field)', () => {
    const parsed = getSalarySummaryTool.inputSchema.safeParse({
      dateFrom: '2024-01-01',
      dateTo: '2024-03-01',
      employer: 'ACME',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('zod input schemas: invalid args rejected, error path names the field (12.3, 15.3)', () => {
  // Each case asserts safeParse fails AND the first issue path points at the
  // offending field - proving the error "names the failing field" (15.3).
  const invalidLimitCases: Array<{ label: string; value: unknown }> = [
    { label: 'limit: 0 (below min)', value: 0 },
    { label: 'limit: 1001 (above max)', value: 1001 },
    { label: 'limit: 2.5 (not an integer)', value: 2.5 },
    { label: "limit: 'x' (not a number)", value: 'x' },
  ];

  for (const { label, value } of invalidLimitCases) {
    it(`list_salaries rejects ${label} and names "limit"`, () => {
      const parsed = listSalariesTool.inputSchema.safeParse({ limit: value });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.path).toContain('limit');
      }
    });
  }

  it('list_salaries rejects dateFrom: 123 and names "dateFrom"', () => {
    const parsed = listSalariesTool.inputSchema.safeParse({ dateFrom: 123 });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toContain('dateFrom');
    }
  });

  it('get_salary_summary rejects dateTo: 123 and names "dateTo"', () => {
    const parsed = getSalarySummaryTool.inputSchema.safeParse({ dateTo: 123 });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toContain('dateTo');
    }
  });
});

describe('validateDateRange helper (12.12)', () => {
  it('returns null when both bounds are absent', () => {
    expect(validateDateRange(undefined, undefined)).toBeNull();
  });

  it('returns null when only one bound is present', () => {
    expect(validateDateRange('2024-01-01', undefined)).toBeNull();
    expect(validateDateRange(undefined, '2024-01-01')).toBeNull();
  });

  it('returns null for a valid range (from <= to), including equal bounds', () => {
    expect(validateDateRange('2024-01-01', '2024-05-01')).toBeNull();
    expect(validateDateRange('2024-01-01', '2024-01-01')).toBeNull();
  });

  it('returns an isError result naming dateFrom/dateTo for an inverted range', () => {
    const res = validateDateRange('2024-05-01', '2024-01-01');
    expect(res).not.toBeNull();
    expect(res?.isError).toBe(true);
    const text = res?.content[0]?.text ?? '';
    expect(text).toContain('dateFrom');
    expect(text).toContain('dateTo');
  });
});

describe('handler from>to rejection short-circuits before data access (12.12)', () => {
  it('list_salaries returns isError and never calls the data layer', async () => {
    const res = await listSalariesTool.handler(
      { dateFrom: '2024-05-01', dateTo: '2024-01-01' },
      ctx,
    );
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain('dateFrom');
    expect(res.content[0]?.text).toContain('dateTo');
    expect(fetchSalaries).not.toHaveBeenCalled();
  });

  it('get_salary_summary returns isError and never calls the data layer', async () => {
    const res = await getSalarySummaryTool.handler(
      { dateFrom: '2024-05-01', dateTo: '2024-01-01' },
      ctx,
    );
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain('dateFrom');
    expect(res.content[0]?.text).toContain('dateTo');
    expect(fetchSalaries).not.toHaveBeenCalled();
  });

  it('a valid range (from <= to) does NOT short-circuit on the range check', async () => {
    mockRows = [];
    const res = await listSalariesTool.handler(
      { dateFrom: '2024-01-01', dateTo: '2024-05-01' },
      ctx,
    );
    // Reached the data layer -> no range error.
    expect(res.isError).toBeFalsy();
    expect(fetchSalaries).toHaveBeenCalledTimes(1);
  });
});

describe('handler zero-row success structures (15.5)', () => {
  it('list_salaries returns a success result whose text parses to an empty JSON array', async () => {
    mockRows = [];
    const res = await listSalariesTool.handler({}, ctx);

    expect(res.isError).toBeFalsy();
    expect(res.content[0]?.type).toBe('text');
    const parsed = JSON.parse(res.content[0]!.text);
    expect(parsed).toEqual([]);
  });

  it('get_salary_summary returns a success result whose text parses to a zeroed summary', async () => {
    mockRows = [];
    const res = await getSalarySummaryTool.handler({}, ctx);

    expect(res.isError).toBeFalsy();
    expect(res.content[0]?.type).toBe('text');
    const parsed = JSON.parse(res.content[0]!.text);
    expect(parsed).toEqual({
      totals: {
        totalBruto: 0,
        totalNeto: 0,
        totalDeductions: 0,
        monthCount: 0,
        avgBruto: 0,
        avgNeto: 0,
        avgDeductions: 0,
      },
      byMonth: [],
    });
  });

  it('list_salaries defaults the limit to 100 when omitted', async () => {
    mockRows = [];
    await listSalariesTool.handler({}, ctx);
    expect(fetchSalaries).toHaveBeenCalledWith(ctx.client, { limit: 100 });
  });
});
