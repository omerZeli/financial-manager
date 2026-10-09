import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  computeChannelSummary,
  CASH_PATH_LABEL,
  type InvestmentDeposit,
  type InvestmentValueUpdate,
} from '../index';

// Property 2: Cash channel zero return
// Validates: Requirements 4.1, 4.2
//
// For ANY cash channel (isCash=true) with at least one value update:
//   - returnAbsolute === 0
//   - returnPercent === 0
//   - currentValue === latestByDate(valueUpdates).value
//   - totalDeposits === currentValue
//   - lastUpdated === latest value update's date
//
// where "latest" is the value update with the greatest date.
//
// IMPLEMENTATION NOTE (tie-breaking):
// The cash branch of `computeChannelSummary` sorts value updates by
// `date.localeCompare(...)` ONLY and takes the last element. It does NOT break
// same-date ties by `created_at`. Because Array.prototype.sort is stable in
// modern JS engines, a same-date tie would resolve to whichever row appeared
// last in input order — an input-ordering artifact, not a `created_at` rule.
// To keep the "latest by date" selection well-defined, this property generates
// value updates with DISTINCT dates for the cash channel, so the greatest date
// uniquely identifies the latest row regardless of tie-break strategy. This is
// a behavior-preserving test; the implementation is NOT modified.

const CASH_CHANNEL_ID = 'cash-channel';
const OTHER_CHANNEL_ID = 'other-channel';

/** A fixed-length ISO date (YYYY-MM-DD) so string compare == chronological compare. */
function isoDate(dayOffset: number): string {
  // Base 2020-01-01; add dayOffset days. Range kept small/bounded by the arb below.
  const base = Date.UTC(2020, 0, 1);
  const d = new Date(base + dayOffset * 24 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** The latest-by-date value update, matching the implementation's selection. */
function latestByDate(vals: InvestmentValueUpdate[]): InvestmentValueUpdate {
  return [...vals].sort((a, b) => a.date.localeCompare(b.date))[vals.length - 1];
}

/**
 * Arbitrary for a set of value updates on the cash channel with DISTINCT dates
 * (see tie-breaking note above), plus some irrelevant rows that must be ignored:
 *   - value updates on a different channel
 *   - deposits/withdrawals on the cash channel (ignored for cash)
 */
const scenarioArb = fc
  .uniqueArray(fc.integer({ min: 0, max: 4000 }), { minLength: 1, maxLength: 12 })
  .chain((dayOffsets) =>
    fc.record({
      // Values paired 1:1 with the distinct day offsets.
      values: fc.tuple(
        ...dayOffsets.map(() => fc.double({ min: -1e6, max: 1e6, noNaN: true })),
      ),
      dayOffsets: fc.constant(dayOffsets),
      // Irrelevant deposits/withdrawals on the cash channel (should be ignored).
      cashDeposits: fc.array(
        fc.record({
          amount: fc.double({ min: 0, max: 1e6, noNaN: true }),
          dayOffset: fc.integer({ min: 0, max: 4000 }),
          isWithdrawal: fc.boolean(),
        }),
        { maxLength: 6 },
      ),
      // Irrelevant value updates on a different channel (should be ignored).
      otherValues: fc.array(
        fc.record({
          value: fc.double({ min: -1e6, max: 1e6, noNaN: true }),
          dayOffset: fc.integer({ min: 0, max: 4000 }),
        }),
        { maxLength: 6 },
      ),
    }),
  );

describe('Property 2: cash channel zero return (Requirements 4.1, 4.2)', () => {
  it('cash channel with >=1 value update: return is 0 and value == latest-by-date', () => {
    fc.assert(
      fc.property(scenarioArb, (s) => {
        const valueUpdates: InvestmentValueUpdate[] = [];

        // Cash-channel value updates with distinct dates.
        s.dayOffsets.forEach((off, i) => {
          valueUpdates.push({
            id: `cash-v-${i}`,
            user_id: 'u1',
            channel_id: CASH_CHANNEL_ID,
            value: s.values[i],
            date: isoDate(off),
            created_at: `2020-01-01T00:00:${String(i).padStart(2, '0')}Z`,
          });
        });

        // Irrelevant value updates on a different channel.
        s.otherValues.forEach((ov, i) => {
          valueUpdates.push({
            id: `other-v-${i}`,
            user_id: 'u1',
            channel_id: OTHER_CHANNEL_ID,
            value: ov.value,
            date: isoDate(ov.dayOffset),
            created_at: `2020-01-01T00:00:00Z`,
          });
        });

        // Irrelevant deposits/withdrawals on the cash channel (ignored for cash).
        const deposits: InvestmentDeposit[] = s.cashDeposits.map((d, i) => ({
          id: `cash-d-${i}`,
          user_id: 'u1',
          channel_id: CASH_CHANNEL_ID,
          amount: d.amount,
          date: isoDate(d.dayOffset),
          depositor: 'אני',
          salary_id: null,
          is_withdrawal: d.isWithdrawal,
          created_at: `2020-01-01T00:00:00Z`,
        }));

        const summary = computeChannelSummary(
          CASH_CHANNEL_ID,
          deposits,
          valueUpdates,
          true,
        );

        const cashValues = valueUpdates.filter(
          (v) => v.channel_id === CASH_CHANNEL_ID,
        );
        const latest = latestByDate(cashValues);

        // Returns are always 0 for cash channels.
        expect(summary.returnAbsolute).toBe(0);
        expect(summary.returnPercent).toBe(0);

        // Value equals the latest-by-date value update's value.
        expect(summary.currentValue).toBe(latest.value);

        // The value IS the deposits amount for cash channels.
        expect(summary.totalDeposits).toBe(summary.currentValue);

        // Last updated equals the latest value update's date.
        expect(summary.lastUpdated).toBe(latest.date);
      }),
      { numRuns: 300 },
    );
  });

  it('CASH_PATH_LABEL is a non-empty string (sanity)', () => {
    expect(typeof CASH_PATH_LABEL).toBe('string');
    expect(CASH_PATH_LABEL.length).toBeGreaterThan(0);
  });
});
