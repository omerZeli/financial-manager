import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  computeAllExpenses,
  computeExpenseSummary,
  inflateFixedExpense,
  type Expense,
  type FixedExpense,
  type Payback,
  type Salary,
} from '@financial-manager/shared';

// Unit tests for the expense SERVICE layer (task 10.3).
//
// Validates:
//   - Service composition + filter pass-through: `getAllExpenses` and
//     `getExpenseSummary` COMPOSE the (mocked) data-access readers with the
//     shared pure functions (inflateFixedExpense + computeAllExpenses +
//     computeExpenseSummary). The service output must equal the shared
//     computations applied to the same mocked rows, and the post-computation
//     dateFrom/dateTo/category/limit filters must be honored.
//   - Requirement 15.5 (zero rows): with no matching rows the all-expenses
//     list is a successful empty array and the summary is a successful ZEROED
//     structure (total 0, empty breakdowns), never an error.
//
// Strategy: the service imports its readers from '../data/*.js', so we mock
// those exact module specifiers. No real Supabase client is ever used - the
// "client" is an opaque sentinel the mocked readers ignore. Every row is a fake
// placeholder with synthetic ids/user_id - no real data, no network.

// Controllable stand-ins for what each data reader returns. Each test sets
// these before calling the service.
let mockExpenses: Expense[] = [];
let mockFixedExpenses: FixedExpense[] = [];
let mockPaybacks: Payback[] = [];
let mockSalaries: Salary[] = [];

vi.mock('../data/expenses.js', () => ({
  fetchExpenses: vi.fn(async () => mockExpenses),
}));
vi.mock('../data/fixedExpenses.js', () => ({
  fetchFixedExpenses: vi.fn(async () => mockFixedExpenses),
}));
vi.mock('../data/paybacks.js', () => ({
  fetchPaybacks: vi.fn(async () => mockPaybacks),
}));
vi.mock('../data/salaries.js', () => ({
  fetchSalaries: vi.fn(async () => mockSalaries),
}));

// Import after the mocks are registered so the service binds to the mocked
// readers. The service modules themselves import with the `.js` specifier the
// mocks above match.
const { getAllExpenses, getExpenseSummary } = await import('../services/expenses');
const { fetchExpenses } = await import('../data/expenses.js');
const { fetchFixedExpenses } = await import('../data/fixedExpenses.js');
const { fetchPaybacks } = await import('../data/paybacks.js');
const { fetchSalaries } = await import('../data/salaries.js');

// A sentinel standing in for a SupabaseClient - never touched by the mocks.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakeClient = { __fake: true } as any;

/** Build a fake regular-expense row with placeholder id/user_id/created_at. */
function expense(
  id: string,
  category: string,
  amount: number,
  date: string,
  salaryId: string | null = null,
): Expense {
  return {
    id,
    user_id: 'fake-user',
    name: `exp-${id}`,
    category,
    amount,
    date,
    salary_id: salaryId,
    created_at: `${date}T00:00:00.000Z`,
  };
}

/** Build a fake fixed-expense row. */
function fixedExpense(
  id: string,
  category: string,
  amount: number,
  startDate: string,
  endDate: string | null = null,
): FixedExpense {
  return {
    id,
    user_id: 'fake-user',
    name: `fixed-${id}`,
    category,
    amount,
    start_date: startDate,
    end_date: endDate,
    salary_employer: null,
    created_at: `${startDate}T00:00:00.000Z`,
  };
}

/** Build a fake `to_me` payback linked to a regular expense. */
function toMePayback(id: string, expenseId: string, amount: number, date: string): Payback {
  return {
    id,
    user_id: 'fake-user',
    direction: 'to_me',
    name: null,
    category: null,
    amount,
    date,
    person: 'fake-person',
    expense_id: expenseId,
    fixed_expense_id: null,
    payback_id: null,
    created_at: `${date}T00:00:00.000Z`,
  };
}

/** Compute the exact all-expenses rows the shared pipeline would produce. */
function sharedAllExpenses() {
  const inflatedExpenses = mockFixedExpenses.flatMap(fe => inflateFixedExpense(fe));
  return computeAllExpenses({
    expenses: mockExpenses,
    inflatedExpenses,
    paybacks: mockPaybacks,
    fixedExpenses: mockFixedExpenses,
    salaries: mockSalaries,
  });
}

afterEach(() => {
  vi.clearAllMocks();
  mockExpenses = [];
  mockFixedExpenses = [];
  mockPaybacks = [];
  mockSalaries = [];
});

describe('getAllExpenses service composition (10.3)', () => {
  it('composes the readers through inflate + computeAllExpenses with no filters', async () => {
    mockExpenses = [
      expense('e1', 'food', 100, '2024-03-10'),
      expense('e2', 'rent', 2000, '2024-02-01'),
    ];
    mockFixedExpenses = [fixedExpense('f1', 'gym', 150, '2024-01-15', '2024-02-15')];
    mockPaybacks = [toMePayback('p1', 'e1', 40, '2024-03-12')];

    const result = await getAllExpenses(fakeClient, {});

    // Service is COMPOSITION only: its output must equal the shared pipeline
    // over the same mocked rows.
    expect(result).toEqual(sharedAllExpenses());

    // Spot-check: the to_me payback reduced e1 from 100 to 60.
    const e1 = result.find(r => r.id === 'e1');
    expect(e1?.amount).toBe(60);
    expect(e1?._returnedAmount).toBe(40);

    // Two inflated gym rows (Jan + Feb) carry the _fixed flag.
    expect(result.filter(r => r._fixed).length).toBe(2);
  });

  it('fans out to all four readers exactly once (unfiltered raw reads)', async () => {
    mockExpenses = [expense('e1', 'food', 100, '2024-03-10')];

    await getAllExpenses(fakeClient, { category: 'food' });

    // The raw reads are intentionally UNFILTERED so the merge/reduction sees
    // the full picture; filtering happens on the computed rows.
    expect(fetchExpenses).toHaveBeenCalledTimes(1);
    expect(fetchExpenses).toHaveBeenCalledWith(fakeClient);
    expect(fetchFixedExpenses).toHaveBeenCalledTimes(1);
    expect(fetchFixedExpenses).toHaveBeenCalledWith(fakeClient);
    expect(fetchPaybacks).toHaveBeenCalledTimes(1);
    expect(fetchPaybacks).toHaveBeenCalledWith(fakeClient);
    expect(fetchSalaries).toHaveBeenCalledTimes(1);
    expect(fetchSalaries).toHaveBeenCalledWith(fakeClient);
  });

  it('applies the category filter to the computed rows', async () => {
    mockExpenses = [
      expense('e1', 'food', 100, '2024-03-10'),
      expense('e2', 'rent', 2000, '2024-02-01'),
    ];

    const result = await getAllExpenses(fakeClient, { category: 'food' });

    expect(result.map(r => r.id)).toEqual(['e1']);
  });

  it('applies the dateFrom/dateTo filters to the computed rows', async () => {
    mockExpenses = [
      expense('e1', 'food', 100, '2024-03-10'),
      expense('e2', 'rent', 2000, '2024-02-01'),
      expense('e3', 'fun', 50, '2024-01-05'),
    ];

    const result = await getAllExpenses(fakeClient, {
      dateFrom: '2024-02-01',
      dateTo: '2024-02-28',
    });

    expect(result.map(r => r.id)).toEqual(['e2']);
  });

  it('caps the sorted result with the limit filter', async () => {
    mockExpenses = [
      expense('e1', 'food', 100, '2024-03-10'),
      expense('e2', 'rent', 2000, '2024-02-01'),
      expense('e3', 'fun', 50, '2024-01-05'),
    ];

    const result = await getAllExpenses(fakeClient, { limit: 2 });

    // computeAllExpenses sorts date DESC; limit keeps the first two.
    expect(result.map(r => r.id)).toEqual(['e1', 'e2']);
  });

  it('zero matching rows yields a successful empty array, never an error (15.5)', async () => {
    mockExpenses = [];
    mockFixedExpenses = [];
    mockPaybacks = [];
    mockSalaries = [];

    const result = await getAllExpenses(fakeClient, {});

    expect(result).toEqual([]);
  });
});

describe('getExpenseSummary service composition (10.3)', () => {
  it('composes the readers through the shared summary over the fetched rows', async () => {
    mockExpenses = [
      expense('e1', 'food', 100, '2024-03-10'),
      expense('e2', 'food', 50, '2024-03-20'),
      expense('e3', 'rent', 2000, '2024-02-01'),
    ];

    const result = await getExpenseSummary(fakeClient, {});

    // Composition parity: equal to the shared summary over the same all-expenses.
    expect(result).toEqual(
      computeExpenseSummary({
        allExpenses: sharedAllExpenses(),
        salaries: mockSalaries,
      }),
    );

    expect(result.total).toBe(2150);
    expect(result.byCategory).toEqual([
      { category: 'rent', total: 2000 },
      { category: 'food', total: 150 },
    ]);
    expect(result.byMonth).toEqual([
      { month: '2024-02', total: 2000 },
      { month: '2024-03', total: 150 },
    ]);
  });

  it('passes the category filter through as a one-element allow-list', async () => {
    mockExpenses = [
      expense('e1', 'food', 100, '2024-03-10'),
      expense('e2', 'rent', 2000, '2024-02-01'),
    ];

    const result = await getExpenseSummary(fakeClient, { category: 'food' });

    expect(result.total).toBe(100);
    expect(result.byCategory).toEqual([{ category: 'food', total: 100 }]);
  });

  it('passes the dateFrom/dateTo range through to the shared summary', async () => {
    mockExpenses = [
      expense('e1', 'food', 100, '2024-03-10'),
      expense('e2', 'rent', 2000, '2024-02-01'),
    ];

    const result = await getExpenseSummary(fakeClient, {
      dateFrom: '2024-03-01',
      dateTo: '2024-03-31',
    });

    expect(result.total).toBe(100);
    expect(result.byMonth).toEqual([{ month: '2024-03', total: 100 }]);
  });

  it('zero matching rows yields a successful ZEROED summary, never an error (15.5)', async () => {
    mockExpenses = [];
    mockFixedExpenses = [];
    mockPaybacks = [];
    mockSalaries = [];

    const result = await getExpenseSummary(fakeClient, {});

    expect(result).toEqual({
      total: 0,
      byCategory: [],
      byMonth: [],
      fixedTotal: 0,
      nonFixedTotal: 0,
    });
  });
});
