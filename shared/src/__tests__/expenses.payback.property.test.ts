import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  computeAllExpenses,
  inflateFixedExpense,
  type Expense,
  type FixedExpense,
  type Payback,
  type Salary,
} from '../index';

// Property 5: Payback conservation
// Validates: Requirements 7.1, 7.2, 7.4
//
// These properties exercise `computeAllExpenses` and assert how `to_me`
// paybacks reduce the amounts of the things they are linked to:
//   7.1  to_me -> regular expense  : the expense's displayed amount is reduced
//                                    by the SUM of linked to_me amounts.
//   7.2  to_me -> fixed expense    : each linked to_me reduces the LAST inflated
//                                    row dated on/before the payback date,
//                                    cumulatively across multiple paybacks.
//   7.4  to_me -> by_me payback    : the virtual by_me row is reduced by the SUM
//                                    of linked to_me amounts.
//
// IMPLEMENTATION NOTES (behavior-preserving — the production code in
// shared/src/expenses.ts, task 4.1, was ported verbatim and is NOT modified):
//
//  * The requirement wording for 7.1 and 7.4 speaks of "clamping to a minimum
//    of 0". The ported implementation does NOT clamp: a regular expense becomes
//    `exp.amount - returned` and a by_me row becomes `pb.amount - returned`,
//    either of which can go negative. These properties therefore assert the
//    ACTUAL ported behavior (plain subtraction, no clamp). This discrepancy
//    between the requirement text and the verbatim-ported code is called out in
//    the task report rather than "fixed" here, since 4.1 is a parity port.
//
//  * Rows whose adjusted amount is EXACTLY 0 are dropped: real + inflated rows
//    via `.filter(e => e.amount !== 0)`, and by_me rows via the same filter.
//    The generators below steer the summed payback away from producing an exact
//    zero so the target row is guaranteed to survive and be assertable. The
//    excluded-at-zero behavior for by_me rows is asserted separately.
//
//  * A fixed expense id must not contain '_' because the implementation recovers
//    the fixed id from an inflated row via `id.lastIndexOf('_')` and matches via
//    `startsWith(fixedId + '_')`. All generated fixed ids here are '_'-free.

const EPS = 1e-9;
const USER = 'u1';

/** Fixed-length ISO date (YYYY-MM-DD) so string compare == chronological compare. */
function isoDate(dayOffset: number): string {
  const base = Date.UTC(2020, 0, 1);
  const d = new Date(base + dayOffset * 24 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function makeExpense(id: string, amount: number, date: string): Expense {
  return {
    id,
    user_id: USER,
    name: `exp-${id}`,
    category: 'cat',
    amount,
    date,
    salary_id: null,
    created_at: '2020-01-01T00:00:00Z',
  };
}

function makeToMeForExpense(id: string, expenseId: string, amount: number, date: string): Payback {
  return {
    id,
    user_id: USER,
    direction: 'to_me',
    name: null,
    category: null,
    amount,
    date,
    person: 'p',
    expense_id: expenseId,
    fixed_expense_id: null,
    payback_id: null,
    created_at: '2020-01-01T00:00:00Z',
  };
}

function makeToMeForFixed(id: string, fixedId: string, amount: number, date: string): Payback {
  return {
    id,
    user_id: USER,
    direction: 'to_me',
    name: null,
    category: null,
    amount,
    date,
    person: 'p',
    expense_id: null,
    fixed_expense_id: fixedId,
    payback_id: null,
    created_at: '2020-01-01T00:00:00Z',
  };
}

function makeByMe(id: string, amount: number, date: string): Payback {
  return {
    id,
    user_id: USER,
    direction: 'by_me',
    name: `transfer-${id}`,
    category: 'cat',
    amount,
    date,
    person: 'p',
    expense_id: null,
    fixed_expense_id: null,
    payback_id: null,
    created_at: '2020-01-01T00:00:00Z',
  };
}

function makeToMeForPayback(id: string, paybackId: string, amount: number, date: string): Payback {
  return {
    id,
    user_id: USER,
    direction: 'to_me',
    name: null,
    category: null,
    amount,
    date,
    person: 'p',
    expense_id: null,
    fixed_expense_id: null,
    payback_id: paybackId,
    created_at: '2020-01-01T00:00:00Z',
  };
}

describe('Property 5: payback conservation (Requirements 7.1, 7.2, 7.4)', () => {
  // ---- 7.1: to_me linked to a regular expense ----
  it('Req 7.1: a regular expense is reduced by the SUM of its linked to_me paybacks (verbatim: no clamp)', () => {
    fc.assert(
      fc.property(
        fc.record({
          expenseAmount: fc.double({ min: 1, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          // 1..5 to_me paybacks linked to the single tracked expense.
          paybacks: fc.array(
            fc.record({
              amount: fc.double({ min: 0.01, max: 500_000, noNaN: true, noDefaultInfinity: true }),
              dayOffset: fc.integer({ min: 0, max: 2000 }),
            }),
            { minLength: 1, maxLength: 5 },
          ),
          expenseDayOffset: fc.integer({ min: 0, max: 2000 }),
        }),
        (s) => {
          const expId = 'exp-A';
          const expense = makeExpense(expId, s.expenseAmount, isoDate(s.expenseDayOffset));

          const sumReturned = s.paybacks.reduce((acc, p) => acc + p.amount, 0);
          // Guard: skip inputs where the net amount lands on exactly 0 (dropped row).
          fc.pre(Math.abs(s.expenseAmount - sumReturned) > EPS);

          const paybacks: Payback[] = s.paybacks.map((p, i) =>
            makeToMeForExpense(`pb-${i}`, expId, p.amount, isoDate(p.dayOffset)),
          );

          const rows = computeAllExpenses({
            expenses: [expense],
            inflatedExpenses: [],
            paybacks,
            fixedExpenses: [],
            salaries: [],
          });

          const target = rows.find((r) => r.id === expId);
          expect(target).toBeDefined();
          // Actual ported behavior: plain subtraction of the summed to_me amounts.
          expect(Math.abs(target!.amount - (s.expenseAmount - sumReturned))).toBeLessThan(1e-6);
          expect(Math.abs((target!._returnedAmount ?? 0) - sumReturned)).toBeLessThan(1e-6);
          expect(target!._originalAmount).toBe(s.expenseAmount);
        },
      ),
      { numRuns: 300 },
    );
  });

  // ---- 7.2: to_me linked to a fixed expense ----
  it('Req 7.2: each to_me reduces the LAST inflated row on/before its date, cumulatively', () => {
    fc.assert(
      fc.property(
        fc.record({
          // Fixed expense spanning a run of months, large enough per-row that
          // subtractions never drive a row to exactly 0.
          startDayOffset: fc.integer({ min: 0, max: 400 }),
          monthSpan: fc.integer({ min: 2, max: 10 }),
          rowAmount: fc.double({ min: 100_000, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          // Each payback is small relative to rowAmount so no row goes to 0.
          paybacks: fc.array(
            fc.record({
              amount: fc.double({ min: 1, max: 1000, noNaN: true, noDefaultInfinity: true }),
              dayOffset: fc.integer({ min: 0, max: 400 }),
            }),
            { minLength: 1, maxLength: 6 },
          ),
        }),
        (s) => {
          const fixedId = 'fixedA';
          const start = new Date(Date.UTC(2020, 0, 1) + s.startDayOffset * 86400000);
          const startStr = isoDate(s.startDayOffset);
          const endDate = new Date(start);
          endDate.setUTCMonth(endDate.getUTCMonth() + s.monthSpan);
          const endStr = `${endDate.getUTCFullYear()}-${String(endDate.getUTCMonth() + 1).padStart(2, '0')}-${String(endDate.getUTCDate()).padStart(2, '0')}`;

          const fe: FixedExpense = {
            id: fixedId,
            user_id: USER,
            name: 'rent',
            category: 'cat',
            amount: s.rowAmount,
            start_date: startStr,
            end_date: endStr,
            salary_employer: null,
            created_at: '2020-01-01T00:00:00Z',
          };

          // Use a fixed "today" far in the future so end_date is the limit.
          const inflated = inflateFixedExpense(fe, '2099-01-01');
          // Need at least one inflated row to have a meaningful target.
          fc.pre(inflated.length > 0);

          const paybacks: Payback[] = s.paybacks.map((p, i) =>
            makeToMeForFixed(`pb-${i}`, fixedId, p.amount, isoDate(p.dayOffset)),
          );

          // Expected reduction per inflated-row id, replicating the impl: for each
          // payback, find inflated rows with date <= payback date, take the one
          // with the greatest date (last on/before), accumulate.
          const expectedReturned: Record<string, number> = {};
          for (const p of paybacks) {
            const candidates = inflated
              .filter((ie) => ie.date <= p.date)
              .sort((a, b) => b.date.localeCompare(a.date));
            if (candidates.length > 0) {
              const targetId = candidates[0].id;
              expectedReturned[targetId] = (expectedReturned[targetId] || 0) + p.amount;
            }
          }

          // Only assert when at least one payback actually hit a row, and the
          // reduction never zeroes a row (guaranteed by amount ranges, but assert).
          const anyHit = Object.keys(expectedReturned).length > 0;
          fc.pre(anyHit);

          const rows = computeAllExpenses({
            expenses: [],
            inflatedExpenses: inflated,
            paybacks,
            fixedExpenses: [fe],
            salaries: [],
          });

          for (const [id, returned] of Object.entries(expectedReturned)) {
            const row = rows.find((r) => r.id === id);
            // rowAmount (>=100k) minus total returned (<= 6*1000) stays well > 0.
            expect(row).toBeDefined();
            expect(Math.abs(row!.amount - (s.rowAmount - returned))).toBeLessThan(1e-6);
            expect(Math.abs((row!._returnedAmount ?? 0) - returned)).toBeLessThan(1e-6);
            expect(row!._originalAmount).toBe(s.rowAmount);
          }

          // Inflated rows that were NOT targeted keep their full amount.
          for (const ie of inflated) {
            if (!(ie.id in expectedReturned)) {
              const row = rows.find((r) => r.id === ie.id);
              expect(row).toBeDefined();
              expect(Math.abs(row!.amount - s.rowAmount)).toBeLessThan(1e-6);
            }
          }
        },
      ),
      { numRuns: 300 },
    );
  });

  // ---- 7.4: to_me linked to a by_me payback ----
  it('Req 7.4: a by_me virtual row is reduced by the SUM of linked to_me paybacks (verbatim: no clamp)', () => {
    fc.assert(
      fc.property(
        fc.record({
          byMeAmount: fc.double({ min: 1, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          toMe: fc.array(
            fc.record({
              amount: fc.double({ min: 0.01, max: 500_000, noNaN: true, noDefaultInfinity: true }),
              dayOffset: fc.integer({ min: 0, max: 2000 }),
            }),
            { minLength: 1, maxLength: 5 },
          ),
          byMeDayOffset: fc.integer({ min: 0, max: 2000 }),
        }),
        (s) => {
          const byMeId = 'bm-1';
          const byMe = makeByMe(byMeId, s.byMeAmount, isoDate(s.byMeDayOffset));

          const sumReturned = s.toMe.reduce((acc, p) => acc + p.amount, 0);
          // Guard: skip inputs where the by_me row nets to exactly 0 (excluded).
          fc.pre(Math.abs(s.byMeAmount - sumReturned) > EPS);

          const toMe: Payback[] = s.toMe.map((p, i) =>
            makeToMeForPayback(`pb-${i}`, byMeId, p.amount, isoDate(p.dayOffset)),
          );

          const rows = computeAllExpenses({
            expenses: [],
            inflatedExpenses: [],
            paybacks: [byMe, ...toMe],
            fixedExpenses: [],
            salaries: [],
          });

          const virtualId = `payback_${byMeId}`;
          const target = rows.find((r) => r.id === virtualId);
          expect(target).toBeDefined();
          // Actual ported behavior: plain subtraction, can go negative, no clamp.
          expect(Math.abs(target!.amount - (s.byMeAmount - sumReturned))).toBeLessThan(1e-6);
          expect(target!._paybackPerson).toBe('p');
        },
      ),
      { numRuns: 300 },
    );
  });

  it('Req 7.4 (edge): a by_me row whose adjusted amount is exactly 0 is EXCLUDED from the result', () => {
    const byMeId = 'bm-zero';
    const byMe = makeByMe(byMeId, 500, isoDate(10));
    // Two to_me paybacks that sum exactly to the by_me amount -> net 0 -> dropped.
    const toMe = [
      makeToMeForPayback('pb-0', byMeId, 200, isoDate(11)),
      makeToMeForPayback('pb-1', byMeId, 300, isoDate(12)),
    ];

    const rows = computeAllExpenses({
      expenses: [],
      inflatedExpenses: [],
      paybacks: [byMe, ...toMe],
      fixedExpenses: [],
      salaries: [],
    });

    expect(rows.find((r) => r.id === `payback_${byMeId}`)).toBeUndefined();
  });
});
