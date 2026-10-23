import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  aggregateSalariesByMonth,
  computeSalaryTotals,
  type Salary,
} from '@financial-manager/shared';

// Unit tests for the salary SERVICE layer (task 8.4).
//
// Validates:
//   - Requirement 12.3 / 15.5 (service shaping): `getSalarySummary` returns
//     `{ totals, byMonth }` composed from the shared pure functions over
//     whatever rows the data-access layer returns.
//   - Requirement 15.5 (zero rows): with no matching rows the summary is a
//     successful ZEROED structure (totals all 0, byMonth []), never an error.
//
// Strategy: the service imports `fetchSalaries` from '../data/salaries.js', so
// we mock that exact module specifier. No real Supabase client is ever used -
// the "client" is an opaque sentinel the mocked reader ignores. All salary
// rows are fake placeholders with synthetic ids/user_id - no real data.

// A controllable stand-in for what the data layer returns. Each test sets this
// before calling the service.
let mockRows: Salary[] = [];

vi.mock('../data/salaries.js', () => ({
  fetchSalaries: vi.fn(async () => mockRows),
}));

// Import after the mock is registered so the service binds to the mocked
// reader. The import specifier here omits `.js` (vitest/bundler resolution);
// the mock above matches the `.js` specifier the service module itself uses.
const { getSalarySummary } = await import('../services/salary');
const { fetchSalaries } = await import('../data/salaries.js');

// A sentinel standing in for a SupabaseClient - never touched by the mock.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakeClient = { __fake: true } as any;

/** Build a fake salary row with placeholder id/user_id/created_at. */
function salary(
  month: string,
  employer: string,
  bruto: number,
  neto: number,
): Salary {
  return {
    id: `fake-${month}-${employer}`,
    user_id: 'fake-user',
    month,
    employer,
    bruto,
    neto,
    created_at: `${month}T00:00:00.000Z`,
  };
}

afterEach(() => {
  vi.clearAllMocks();
  mockRows = [];
});

describe('getSalarySummary service shaping (12.3, 15.5)', () => {
  it('returns { totals, byMonth } matching the shared computations for the fetched rows', async () => {
    mockRows = [
      salary('2024-01', 'ACME', 10000, 7500),
      salary('2024-01', 'Globex', 5000, 4000), // same month, second employer
      salary('2024-02', 'ACME', 12000, 9000),
    ];

    const result = await getSalarySummary(fakeClient, {});

    // Service is COMPOSITION only: its output must equal the shared pure
    // functions applied to the same rows.
    expect(result).toEqual({
      totals: computeSalaryTotals(mockRows),
      byMonth: aggregateSalariesByMonth(mockRows),
    });

    // Spot-check the concrete numbers so a regression in composition is caught
    // even if the shared fns were also broken.
    expect(result.totals.totalBruto).toBe(27000);
    expect(result.totals.totalNeto).toBe(20500);
    expect(result.totals.totalDeductions).toBe(6500);
    expect(result.totals.monthCount).toBe(2); // Jan + Feb
    expect(result.totals.avgBruto).toBe(13500);
    expect(result.totals.avgNeto).toBe(10250);

    // Jan is summed across both employers; months sorted ascending.
    expect(result.byMonth).toEqual([
      { month: '2024-01', bruto: 15000, neto: 11500 },
      { month: '2024-02', bruto: 12000, neto: 9000 },
    ]);
  });

  it('passes the given filters straight through to the data reader', async () => {
    mockRows = [salary('2024-03', 'ACME', 1000, 800)];
    const filters = { dateFrom: '2024-01-01', dateTo: '2024-03-31', employer: 'ACME' };

    await getSalarySummary(fakeClient, filters);

    expect(fetchSalaries).toHaveBeenCalledTimes(1);
    expect(fetchSalaries).toHaveBeenCalledWith(fakeClient, filters);
  });

  it('zero matching rows yields a successful ZEROED summary, never an error (15.5)', async () => {
    mockRows = [];

    const result = await getSalarySummary(fakeClient, {});

    expect(result.byMonth).toEqual([]);
    expect(result.totals).toEqual({
      totalBruto: 0,
      totalNeto: 0,
      totalDeductions: 0,
      monthCount: 0,
      avgBruto: 0,
      avgNeto: 0,
      avgDeductions: 0,
    });
  });
});
