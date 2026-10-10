import { afterEach, describe, expect, it, vi } from 'vitest';

// Schema + shaping unit tests for the 11 non-salary TOOL modules added in
// tasks 11.1 and 11.2 (task 11.3).
//
// Tools covered:
//   expense-domain  : list_expenses, list_fixed_expenses, list_paybacks,
//                     list_all_expenses, get_expense_summary
//   investment/misc : list_investment_channels, list_investment_deposits,
//                     list_investment_value_updates, get_investment_summaries,
//                     get_investment_return_over_time, list_dropdown_options
//
// Validates (per tool, where applicable):
//   - 12.3 / 15.3: each tool's `inputSchema` ACCEPTS valid args and REJECTS
//     invalid ones, with the first zod issue PATH naming the offending field.
//   - 12.12: handlers that expose a from/to date range reject an inverted
//     range (dateFrom > dateTo) with an isError ToolResult and never touch the
//     data/service layer. Tools with no date RANGE have nothing to reject.
//   - 15.5: with the data/service layer returning an empty structure, every
//     handler returns a SUCCESS (non-isError) ToolResult whose text parses as
//     JSON into the expected empty structure.
//
// Also (registry-wide):
//   - 1.3: EVERY registered tool sets `annotations.readOnlyHint === true`.
//   - 13.2: the registry count equals the full 13-entry v1 catalog.
//
// Strategy: tools call either a data reader ('../data/*.js') or a service
// ('../services/*.js'). We mock those exact module specifiers so no real
// Supabase client or network is used; the tool context client/server are
// opaque sentinels. Range-rejection cases short-circuit before any mock is
// touched, so we also assert the mocks were never called.

import type {
  Expense,
  FixedExpense,
  Payback,
  InvestmentChannel,
  InvestmentDeposit,
  InvestmentValueUpdate,
  DropdownOption,
} from '@financial-manager/shared';

// ---------------------------------------------------------------------------
// Mocks: controllable stand-ins for the data readers and services. Each test
// sets the relevant `mock*` before invoking a handler. Defaults are empty so
// the zero-row (15.5) cases work with no setup.
// ---------------------------------------------------------------------------

let mockExpenses: Expense[] = [];
let mockFixedExpenses: FixedExpense[] = [];
let mockPaybacks: Payback[] = [];
let mockChannels: InvestmentChannel[] = [];
let mockDeposits: InvestmentDeposit[] = [];
let mockValueUpdates: InvestmentValueUpdate[] = [];
let mockDropdownOptions: DropdownOption[] = [];

// Service return values (list_all_expenses / summaries / return-over-time).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockAllExpenses: any[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockExpenseSummary: any = {
  total: 0,
  byCategory: [],
  byMonth: [],
  fixedTotal: 0,
  nonFixedTotal: 0,
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockInvestmentSummaries: any[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockReturnOverTime: any[] = [];

// Data readers (list tools call these directly).
vi.mock('../data/expenses.js', () => ({
  fetchExpenses: vi.fn(async () => mockExpenses),
}));
vi.mock('../data/fixedExpenses.js', () => ({
  fetchFixedExpenses: vi.fn(async () => mockFixedExpenses),
}));
vi.mock('../data/paybacks.js', () => ({
  fetchPaybacks: vi.fn(async () => mockPaybacks),
}));
vi.mock('../data/channels.js', () => ({
  fetchChannels: vi.fn(async () => mockChannels),
}));
vi.mock('../data/deposits.js', () => ({
  fetchDeposits: vi.fn(async () => mockDeposits),
}));
vi.mock('../data/valueUpdates.js', () => ({
  fetchValueUpdates: vi.fn(async () => mockValueUpdates),
}));
vi.mock('../data/dropdownOptions.js', () => ({
  fetchDropdownOptions: vi.fn(async () => mockDropdownOptions),
}));

// Services (composed tools call these directly).
vi.mock('../services/expenses.js', () => ({
  getAllExpenses: vi.fn(async () => mockAllExpenses),
  getExpenseSummary: vi.fn(async () => mockExpenseSummary),
}));
vi.mock('../services/investments.js', () => ({
  getInvestmentSummaries: vi.fn(async () => mockInvestmentSummaries),
  getReturnOverTime: vi.fn(async () => mockReturnOverTime),
}));

// Import the tools AFTER the mocks are registered so each binds to the mocked
// modules (which import with the `.js` specifier the mocks above match).
const { listExpensesTool } = await import('../tools/listExpenses');
const { listFixedExpensesTool } = await import('../tools/listFixedExpenses');
const { listPaybacksTool } = await import('../tools/listPaybacks');
const { listAllExpensesTool } = await import('../tools/listAllExpenses');
const { getExpenseSummaryTool } = await import('../tools/getExpenseSummary');
const { listInvestmentChannelsTool } = await import('../tools/listInvestmentChannels');
const { listInvestmentDepositsTool } = await import('../tools/listInvestmentDeposits');
const { listInvestmentValueUpdatesTool } = await import('../tools/listInvestmentValueUpdates');
const { getInvestmentSummariesTool } = await import('../tools/getInvestmentSummaries');
const { getInvestmentReturnOverTimeTool } = await import('../tools/getInvestmentReturnOverTime');
const { listDropdownOptionsTool } = await import('../tools/listDropdownOptions');

// Mocked module handles, so range-rejection tests can assert "never called".
const { fetchExpenses } = await import('../data/expenses.js');
const { fetchPaybacks } = await import('../data/paybacks.js');
const { fetchDeposits } = await import('../data/deposits.js');
const { fetchValueUpdates } = await import('../data/valueUpdates.js');
const { getAllExpenses, getExpenseSummary } = await import('../services/expenses.js');
const { getReturnOverTime } = await import('../services/investments.js');

const { toolRegistry } = await import('../tools/registry');

// A tool context whose client/server are sentinels. For range-rejection cases
// the handler short-circuits before the client is ever used.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx = { client: { __fake: true }, server: { __fake: true } } as any;

afterEach(() => {
  vi.clearAllMocks();
  mockExpenses = [];
  mockFixedExpenses = [];
  mockPaybacks = [];
  mockChannels = [];
  mockDeposits = [];
  mockValueUpdates = [];
  mockDropdownOptions = [];
  mockAllExpenses = [];
  mockExpenseSummary = {
    total: 0,
    byCategory: [],
    byMonth: [],
    fixedTotal: 0,
    nonFixedTotal: 0,
  };
  mockInvestmentSummaries = [];
  mockReturnOverTime = [];
});

// ---------------------------------------------------------------------------
// 1. Valid-args parse (12.3, 15.3)
// ---------------------------------------------------------------------------

describe('valid args parse against each tool inputSchema (12.3, 15.3)', () => {
  it('list_expenses accepts a fully-populated payload', () => {
    expect(
      listExpensesTool.inputSchema.safeParse({
        dateFrom: '2024-01-01',
        dateTo: '2024-03-01',
        category: 'food',
        limit: 50,
      }).success,
    ).toBe(true);
  });

  it('list_fixed_expenses accepts category + activeOn + limit', () => {
    expect(
      listFixedExpensesTool.inputSchema.safeParse({
        category: 'rent',
        activeOn: '2024-02-15',
        limit: 10,
      }).success,
    ).toBe(true);
  });

  it('list_paybacks accepts direction enum + person + range + limit', () => {
    expect(
      listPaybacksTool.inputSchema.safeParse({
        direction: 'by_me',
        person: 'Dana',
        dateFrom: '2024-01-01',
        dateTo: '2024-02-01',
        limit: 25,
      }).success,
    ).toBe(true);
    expect(listPaybacksTool.inputSchema.safeParse({ direction: 'to_me' }).success).toBe(true);
  });

  it('list_all_expenses accepts range + category + limit', () => {
    expect(
      listAllExpensesTool.inputSchema.safeParse({
        dateFrom: '2024-01-01',
        dateTo: '2024-03-01',
        category: 'food',
        limit: 100,
      }).success,
    ).toBe(true);
  });

  it('get_expense_summary accepts range + category (no limit)', () => {
    expect(
      getExpenseSummaryTool.inputSchema.safeParse({
        dateFrom: '2024-01-01',
        dateTo: '2024-03-01',
        category: 'food',
      }).success,
    ).toBe(true);
  });

  it('list_investment_channels accepts company + isPension + limit', () => {
    expect(
      listInvestmentChannelsTool.inputSchema.safeParse({
        company: 'ACME',
        isPension: true,
        limit: 5,
      }).success,
    ).toBe(true);
  });

  it('list_investment_deposits accepts channel + depositor + flag + range + limit', () => {
    expect(
      listInvestmentDepositsTool.inputSchema.safeParse({
        channelId: 'c1',
        depositor: 'me',
        isWithdrawal: false,
        dateFrom: '2024-01-01',
        dateTo: '2024-02-01',
        limit: 50,
      }).success,
    ).toBe(true);
  });

  it('list_investment_value_updates accepts channel + range + limit', () => {
    expect(
      listInvestmentValueUpdatesTool.inputSchema.safeParse({
        channelId: 'c1',
        dateFrom: '2024-01-01',
        dateTo: '2024-02-01',
        limit: 50,
      }).success,
    ).toBe(true);
  });

  it('get_investment_summaries accepts channel + isPension (no limit)', () => {
    expect(
      getInvestmentSummariesTool.inputSchema.safeParse({
        channelId: 'c1',
        isPension: true,
      }).success,
    ).toBe(true);
  });

  it('get_investment_return_over_time accepts channel + isPension + range', () => {
    expect(
      getInvestmentReturnOverTimeTool.inputSchema.safeParse({
        channelId: 'c1',
        isPension: false,
        dateFrom: '2024-01-01',
        dateTo: '2024-02-01',
      }).success,
    ).toBe(true);
  });

  it('list_dropdown_options accepts category (and empty payload)', () => {
    expect(listDropdownOptionsTool.inputSchema.safeParse({ category: 'employer' }).success).toBe(
      true,
    );
    expect(listDropdownOptionsTool.inputSchema.safeParse({}).success).toBe(true);
  });

  it('every list-style tool accepts an empty payload (all fields optional)', () => {
    for (const tool of [
      listExpensesTool,
      listFixedExpensesTool,
      listPaybacksTool,
      listAllExpensesTool,
      getExpenseSummaryTool,
      listInvestmentChannelsTool,
      listInvestmentDepositsTool,
      listInvestmentValueUpdatesTool,
      getInvestmentSummariesTool,
      getInvestmentReturnOverTimeTool,
      listDropdownOptionsTool,
    ]) {
      expect(tool.inputSchema.safeParse({}).success).toBe(true);
    }
  });

  it('every limit-bearing tool accepts the limit boundaries 1 and 1000', () => {
    for (const tool of [
      listExpensesTool,
      listFixedExpensesTool,
      listPaybacksTool,
      listAllExpensesTool,
      listInvestmentChannelsTool,
      listInvestmentDepositsTool,
      listInvestmentValueUpdatesTool,
    ]) {
      expect(tool.inputSchema.safeParse({ limit: 1 }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ limit: 1000 }).success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Invalid-args rejection, error path names the failing field (12.3, 15.3)
// ---------------------------------------------------------------------------

describe('invalid args rejected, first issue path names the failing field (12.3, 15.3)', () => {
  // Every limit-bearing tool must reject these and point the error at "limit".
  const limitTools: Array<{ name: string; tool: typeof listExpensesTool }> = [
    { name: 'list_expenses', tool: listExpensesTool },
    { name: 'list_fixed_expenses', tool: listFixedExpensesTool },
    { name: 'list_paybacks', tool: listPaybacksTool },
    { name: 'list_all_expenses', tool: listAllExpensesTool },
    { name: 'list_investment_channels', tool: listInvestmentChannelsTool },
    { name: 'list_investment_deposits', tool: listInvestmentDepositsTool },
    { name: 'list_investment_value_updates', tool: listInvestmentValueUpdatesTool },
  ];

  const badLimits: Array<{ label: string; value: unknown }> = [
    { label: '0 (below min)', value: 0 },
    { label: '1001 (above max)', value: 1001 },
    { label: '2.5 (not an integer)', value: 2.5 },
    { label: "'x' (not a number)", value: 'x' },
  ];

  for (const { name, tool } of limitTools) {
    for (const { label, value } of badLimits) {
      it(`${name} rejects limit ${label} and names "limit"`, () => {
        const parsed = tool.inputSchema.safeParse({ limit: value });
        expect(parsed.success).toBe(false);
        if (!parsed.success) {
          expect(parsed.error.issues[0]?.path).toContain('limit');
        }
      });
    }
  }

  it('list_paybacks rejects an unknown direction and names "direction"', () => {
    const parsed = listPaybacksTool.inputSchema.safeParse({ direction: 'sideways' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toContain('direction');
    }
  });

  it('list_expenses rejects category: 123 and names "category"', () => {
    const parsed = listExpensesTool.inputSchema.safeParse({ category: 123 });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toContain('category');
    }
  });

  it('list_expenses rejects dateFrom: 123 and names "dateFrom"', () => {
    const parsed = listExpensesTool.inputSchema.safeParse({ dateFrom: 123 });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toContain('dateFrom');
    }
  });

  it('get_expense_summary rejects dateTo: 123 and names "dateTo"', () => {
    const parsed = getExpenseSummaryTool.inputSchema.safeParse({ dateTo: 123 });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toContain('dateTo');
    }
  });

  it('list_fixed_expenses rejects activeOn: 123 and names "activeOn"', () => {
    const parsed = listFixedExpensesTool.inputSchema.safeParse({ activeOn: 123 });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toContain('activeOn');
    }
  });

  it('list_investment_deposits rejects isWithdrawal: "yes" and names "isWithdrawal"', () => {
    const parsed = listInvestmentDepositsTool.inputSchema.safeParse({ isWithdrawal: 'yes' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toContain('isWithdrawal');
    }
  });

  it('list_investment_channels rejects isPension: "no" and names "isPension"', () => {
    const parsed = listInvestmentChannelsTool.inputSchema.safeParse({ isPension: 'no' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toContain('isPension');
    }
  });

  it('get_investment_return_over_time rejects channelId: 123 and names "channelId"', () => {
    const parsed = getInvestmentReturnOverTimeTool.inputSchema.safeParse({ channelId: 123 });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toContain('channelId');
    }
  });

  it('list_dropdown_options rejects category: 123 and names "category"', () => {
    const parsed = listDropdownOptionsTool.inputSchema.safeParse({ category: 123 });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toContain('category');
    }
  });
});

// ---------------------------------------------------------------------------
// 3. from>to date-range rejection where ranges apply (12.12)
// ---------------------------------------------------------------------------

describe('inverted date range short-circuits before data/service access (12.12)', () => {
  const inverted = { dateFrom: '2024-05-01', dateTo: '2024-01-01' };

  it('list_expenses returns isError and never reads data', async () => {
    const res = await listExpensesTool.handler(inverted, ctx);
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain('dateFrom');
    expect(res.content[0]?.text).toContain('dateTo');
    expect(fetchExpenses).not.toHaveBeenCalled();
  });

  it('list_paybacks returns isError and never reads data', async () => {
    const res = await listPaybacksTool.handler(inverted, ctx);
    expect(res.isError).toBe(true);
    expect(fetchPaybacks).not.toHaveBeenCalled();
  });

  it('list_all_expenses returns isError and never calls the service', async () => {
    const res = await listAllExpensesTool.handler(inverted, ctx);
    expect(res.isError).toBe(true);
    expect(getAllExpenses).not.toHaveBeenCalled();
  });

  it('get_expense_summary returns isError and never calls the service', async () => {
    const res = await getExpenseSummaryTool.handler(inverted, ctx);
    expect(res.isError).toBe(true);
    expect(getExpenseSummary).not.toHaveBeenCalled();
  });

  it('list_investment_deposits returns isError and never reads data', async () => {
    const res = await listInvestmentDepositsTool.handler(inverted, ctx);
    expect(res.isError).toBe(true);
    expect(fetchDeposits).not.toHaveBeenCalled();
  });

  it('list_investment_value_updates returns isError and never reads data', async () => {
    const res = await listInvestmentValueUpdatesTool.handler(inverted, ctx);
    expect(res.isError).toBe(true);
    expect(fetchValueUpdates).not.toHaveBeenCalled();
  });

  it('get_investment_return_over_time returns isError and never calls the service', async () => {
    const res = await getInvestmentReturnOverTimeTool.handler(inverted, ctx);
    expect(res.isError).toBe(true);
    expect(getReturnOverTime).not.toHaveBeenCalled();
  });

  it('a valid range (from <= to) does NOT short-circuit the range check', async () => {
    const res = await listExpensesTool.handler(
      { dateFrom: '2024-01-01', dateTo: '2024-05-01' },
      ctx,
    );
    expect(res.isError).toBeFalsy();
    expect(fetchExpenses).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Zero-row success structures (15.5)
// ---------------------------------------------------------------------------

describe('zero-row handler results are successful empty structures (15.5)', () => {
  // The list-style tools (data-reader and service-backed array tools) all
  // serialize to an empty JSON array when the underlying source is empty.
  const emptyArrayTools: Array<{ name: string; tool: typeof listExpensesTool }> = [
    { name: 'list_expenses', tool: listExpensesTool },
    { name: 'list_fixed_expenses', tool: listFixedExpensesTool },
    { name: 'list_paybacks', tool: listPaybacksTool },
    { name: 'list_all_expenses', tool: listAllExpensesTool },
    { name: 'list_investment_channels', tool: listInvestmentChannelsTool },
    { name: 'list_investment_deposits', tool: listInvestmentDepositsTool },
    { name: 'list_investment_value_updates', tool: listInvestmentValueUpdatesTool },
    { name: 'get_investment_summaries', tool: getInvestmentSummariesTool },
    { name: 'get_investment_return_over_time', tool: getInvestmentReturnOverTimeTool },
    { name: 'list_dropdown_options', tool: listDropdownOptionsTool },
  ];

  for (const { name, tool } of emptyArrayTools) {
    it(`${name} returns a success result parsing to an empty array`, async () => {
      const res = await tool.handler({}, ctx);
      expect(res.isError).toBeFalsy();
      expect(res.content[0]?.type).toBe('text');
      expect(JSON.parse(res.content[0]!.text)).toEqual([]);
    });
  }

  it('get_expense_summary returns a success result parsing to a zeroed summary', async () => {
    const res = await getExpenseSummaryTool.handler({}, ctx);
    expect(res.isError).toBeFalsy();
    expect(res.content[0]?.type).toBe('text');
    expect(JSON.parse(res.content[0]!.text)).toEqual({
      total: 0,
      byCategory: [],
      byMonth: [],
      fixedTotal: 0,
      nonFixedTotal: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// 5. Registry-wide invariants: readOnlyHint (1.3) + full catalog count (13.2)
// ---------------------------------------------------------------------------

describe('registry-wide invariants (1.3, 13.2)', () => {
  it('EVERY registered tool sets readOnlyHint === true (1.3)', () => {
    expect(toolRegistry.length).toBeGreaterThan(0);
    for (const d of toolRegistry) {
      expect(d.annotations.readOnlyHint).toBe(true);
    }
  });

  it('the registry count equals the full 13-entry v1 catalog (13.2)', () => {
    expect(toolRegistry).toHaveLength(13);
    // And every name is unique, so registered count == entry count.
    const names = toolRegistry.map((d) => d.name);
    expect(new Set(names).size).toBe(toolRegistry.length);
  });
});
