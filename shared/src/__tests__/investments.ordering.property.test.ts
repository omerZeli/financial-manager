import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  computeChannelSummary,
  type InvestmentDeposit,
  type InvestmentValueUpdate,
} from '../index';

// Property 3: Same-date event ordering
// Validates: Requirements 5.5, 5.6
//
// The engine (computeChannelSummary) builds a unified event list and sorts it
// chronologically. On the SAME date, deposits/withdrawals (order 0) are
// processed BEFORE value updates (order 1), so a value-update checkpoint
// captures the running balance *after* that day's cash flows. Among events of
// the same type on the same date, the sort is stable, so input order is
// preserved — meaning the LAST value update in input order is the final
// checkpoint that determines currentValue.
//
// These are behavior-preserving properties written to match the real engine;
// the implementation is NOT modified.

const CHANNEL = 'chan-1';
const SAME_DATE = '2024-03-15';
const EPS = 1e-9;

let seq = 0;
function makeDeposit(
  amount: number,
  date: string,
  isWithdrawal: boolean,
): InvestmentDeposit {
  seq += 1;
  return {
    id: `dep-${seq}`,
    user_id: 'u1',
    channel_id: CHANNEL,
    amount,
    date,
    depositor: 'אני',
    salary_id: null,
    is_withdrawal: isWithdrawal,
    created_at: `2024-01-01T00:00:00.000Z`,
  };
}

function makeValueUpdate(value: number, date: string): InvestmentValueUpdate {
  seq += 1;
  return {
    id: `val-${seq}`,
    user_id: 'u1',
    channel_id: CHANNEL,
    value,
    date,
    created_at: `2024-01-01T00:00:00.000Z`,
  };
}

// A single same-date cash-flow: a deposit (positive) or a withdrawal (its
// amount is subtracted from the balance).
const cashFlowArb = fc.record({
  amount: fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
  isWithdrawal: fc.boolean(),
});

describe('Property 3: same-date event ordering (Requirements 5.5, 5.6)', () => {
  it('Req 5.6: a same-date value update equal to the net post-cashflow balance yields returnAbsolute === 0', () => {
    fc.assert(
      fc.property(fc.array(cashFlowArb, { minLength: 1, maxLength: 12 }), (flows) => {
        // Net invested capital after all same-date deposits/withdrawals.
        const netBalance = flows.reduce(
          (sum, f) => sum + (f.isWithdrawal ? -f.amount : f.amount),
          0,
        );

        const deposits = flows.map((f) =>
          makeDeposit(f.amount, SAME_DATE, f.isWithdrawal),
        );
        // Value update on the SAME date, set exactly to the net post-cashflow
        // balance. Because cash flows (order 0) run before value updates
        // (order 1) on the same date, the checkpoint sees `netBalance` as the
        // running balance, so the profit delta is zero.
        const valueUpdates = [makeValueUpdate(netBalance, SAME_DATE)];

        const summary = computeChannelSummary(
          CHANNEL,
          deposits,
          valueUpdates,
          false,
        );

        // returnAbsolute = currentValue - investedCapital = netBalance - netBalance = 0
        expect(Math.abs(summary.returnAbsolute)).toBeLessThan(EPS);
        // currentValue is pinned to the checkpoint value.
        expect(Math.abs(summary.currentValue - netBalance)).toBeLessThan(EPS);
      }),
      { numRuns: 300 },
    );
  });

  it('Req 5.5: same-type same-date value updates preserve input order — the LAST one determines currentValue', () => {
    fc.assert(
      fc.property(
        // A strictly-increasing sequence of values so each value update is
        // distinct and we can unambiguously identify the "last in input order".
        fc
          .array(
            fc.double({ min: 1, max: 10_000, noNaN: true, noDefaultInfinity: true }),
            { minLength: 2, maxLength: 10 },
          )
          .map((deltas) => {
            // Turn arbitrary positive deltas into a strictly increasing series.
            const values: number[] = [];
            let acc = 0;
            for (const d of deltas) {
              acc += d;
              values.push(acc);
            }
            return values;
          }),
        (values) => {
          // All value updates share the same date, submitted in input order.
          const valueUpdates = values.map((v) => makeValueUpdate(v, SAME_DATE));

          const summary = computeChannelSummary(
            CHANNEL,
            [],
            valueUpdates,
            false,
          );

          const lastInInputOrder = values[values.length - 1];
          // Stable sort preserves input order for same-date same-type events, so
          // the final checkpoint is the last value update supplied — it hard-
          // overrides the running balance and fixes currentValue.
          expect(Math.abs(summary.currentValue - lastInInputOrder)).toBeLessThan(EPS);
          // No cash flows → invested capital is 0 → the whole final value is profit.
          expect(Math.abs(summary.returnAbsolute - lastInInputOrder)).toBeLessThan(EPS);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('Req 5.6: concrete example — deposit then equal value update returns 0', () => {
    const deposits = [makeDeposit(1000, SAME_DATE, false)];
    const valueUpdates = [makeValueUpdate(1000, SAME_DATE)];
    const summary = computeChannelSummary(CHANNEL, deposits, valueUpdates, false);
    expect(summary.returnAbsolute).toBe(0);
    expect(summary.currentValue).toBe(1000);
    expect(summary.totalDeposits).toBe(1000);
  });
});
