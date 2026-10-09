import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { inflateFixedExpense, type FixedExpense } from '../index';

// Property 4: Inflation bounds
// Validates: Requirements 6.1, 6.4, 6.5
//
// For ANY fixed expense and any "today", inflateFixedExpense expands it into
// virtual monthly rows. The following must hold:
//   - Every row's date is in the inclusive range [start_date, limit], where the
//     inflation limit is end_date when end_date is non-null and strictly earlier
//     than today, otherwise today.                                   (6.5)
//   - Exactly one row per calendar month in that range: no duplicate (year,
//     month) pair, and the set of (year, month) pairs is a contiguous ascending
//     run starting at the start month. The final month is the last month whose
//     own clamped day still falls on/before the limit (a month is skipped only
//     at the tail, when day-clamping pushes its date past the limit).  (6.1)
//   - Each row's day is clamped to its own month's length:
//       day === min(startDayOfMonth, daysInThatMonth).               (6.2)
//   - When start_date is strictly later than the inflation limit, zero rows
//     are produced.                                                  (6.4)
//   - Each row's id is `{fixedExpenseId}_{YYYY-MM-DD}` and its date field equals
//     that same YYYY-MM-DD value.                                    (6.3)
//
// These are behavior-preserving properties written to match the real function;
// the implementation is NOT modified.

const FIXED_ID = 'fe-prop';

/** Days in a given 0-indexed (year, month) — mirrors the implementation. */
function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/** Build a valid YYYY-MM-DD from (year, 0-indexed month, day). */
function iso(year: number, month0: number, day: number): string {
  const mm = String(month0 + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/** The inflation limit, computed exactly as the implementation does. */
function limitOf(startDate: string, endDate: string | null, today: string): string {
  return endDate && endDate < today ? endDate : today;
}

/** A number of whole months between two (year, month0) pairs: b - a. */
function monthIndex(year: number, month0: number): number {
  return year * 12 + month0;
}

function makeFixed(startDate: string, endDate: string | null): FixedExpense {
  return {
    id: FIXED_ID,
    user_id: 'u1',
    name: 'שכירות',
    category: 'דיור',
    amount: 1234.56,
    start_date: startDate,
    end_date: endDate,
    salary_employer: null,
    created_at: `${startDate}T00:00:00Z`,
  };
}

/**
 * Arbitrary for a valid (year, month0, day) tuple with a realistic year range.
 * The day is clamped to the month length so every generated date is a real
 * calendar date (no 2024-02-31).
 */
const datePartsArb = fc
  .record({
    year: fc.integer({ min: 2000, max: 2100 }),
    month0: fc.integer({ min: 0, max: 11 }),
    day: fc.integer({ min: 1, max: 31 }),
  })
  .map(({ year, month0, day }) => {
    const clampedDay = Math.min(day, daysInMonth(year, month0));
    return { year, month0, day: clampedDay };
  });

/**
 * Scenario: a start date, an optional end date, and a "today".
 * end_date (when present) is on or after start_date so it is a valid range.
 */
const scenarioArb = fc
  .record({
    start: datePartsArb,
    today: datePartsArb,
    endOffsetMonths: fc.option(fc.integer({ min: 0, max: 240 }), { nil: null }),
    endDay: fc.integer({ min: 1, max: 31 }),
  })
  .map(({ start, today, endOffsetMonths, endDay }) => {
    const startDate = iso(start.year, start.month0, start.day);
    const todayDate = iso(today.year, today.month0, today.day);

    let endDate: string | null = null;
    if (endOffsetMonths !== null) {
      // Place end_date a number of months on/after the start month.
      const totalMonths = start.month0 + endOffsetMonths;
      const endYear = start.year + Math.floor(totalMonths / 12);
      const endMonth0 = totalMonths % 12;
      const endClampedDay = Math.min(endDay, daysInMonth(endYear, endMonth0));
      endDate = iso(endYear, endMonth0, endClampedDay);
    }
    return { startDate, endDate, todayDate };
  });

describe('Property 4: inflation bounds (Requirements 6.1, 6.4, 6.5)', () => {
  it('every row is a valid clamped date within [start, limit], one contiguous row per month', () => {
    fc.assert(
      fc.property(scenarioArb, ({ startDate, endDate, todayDate }) => {
        const fe = makeFixed(startDate, endDate);
        const rows = inflateFixedExpense(fe, todayDate);

        const limit = limitOf(startDate, endDate, todayDate);
        const startDay = Number(startDate.slice(8, 10));

        // --- Req 6.4: start strictly after the limit → zero rows. ---
        if (startDate > limit) {
          expect(rows).toEqual([]);
          return;
        }

        // Otherwise at least one row is produced.
        expect(rows.length).toBeGreaterThan(0);

        const startY = Number(startDate.slice(0, 4));
        const startM0 = Number(startDate.slice(5, 7)) - 1;

        // Independent oracle: walk forward month-by-month from the start month,
        // clamping the day to each month's length, collecting every month whose
        // clamped date is on/before the limit. Because the full date advances
        // strictly month over month, this is a contiguous run that stops at the
        // first month whose clamped date exceeds the limit.
        const expectedDates: string[] = [];
        let y = startY;
        let m0 = startM0;
        // Guard the loop; the real range is bounded by the year span (<= ~1200
        // months across the 2000-2100 arb range).
        for (let guard = 0; guard < 2400; guard++) {
          const d = Math.min(startDay, daysInMonth(y, m0));
          const candidate = iso(y, m0, d);
          if (candidate > limit) break;
          expectedDates.push(candidate);
          m0 += 1;
          if (m0 > 11) {
            m0 = 0;
            y += 1;
          }
        }

        // --- Req 6.1: exactly one row per calendar month, contiguous run. ---
        expect(rows.map((r) => r.date)).toEqual(expectedDates);
        const monthKeys = rows.map((r) => r.date.slice(0, 7));
        expect(new Set(monthKeys).size).toBe(rows.length);

        // Contiguous ascending month sequence starting at the start month.
        rows.forEach((row, i) => {
          const ry = Number(row.date.slice(0, 4));
          const rm0 = Number(row.date.slice(5, 7)) - 1;
          expect(monthIndex(ry, rm0)).toBe(monthIndex(startY, startM0) + i);
        });

        for (const row of rows) {
          // --- Req 6.5: date within [start, limit] inclusive. ---
          expect(row.date >= startDate).toBe(true);
          expect(row.date <= limit).toBe(true);

          // --- Req 6.2: day clamped to this row's own month length. ---
          const y = Number(row.date.slice(0, 4));
          const m0 = Number(row.date.slice(5, 7)) - 1;
          const d = Number(row.date.slice(8, 10));
          expect(d).toBe(Math.min(startDay, daysInMonth(y, m0)));

          // --- Req 6.3: synthetic id + matching date field. ---
          expect(row.id).toBe(`${FIXED_ID}_${row.date}`);
        }
      }),
      { numRuns: 500 },
    );
  });

  it('Req 6.4: start strictly after the limit always yields zero rows', () => {
    fc.assert(
      fc.property(scenarioArb, ({ startDate, endDate, todayDate }) => {
        const limit = limitOf(startDate, endDate, todayDate);
        fc.pre(startDate > limit);
        const rows = inflateFixedExpense(makeFixed(startDate, endDate), todayDate);
        expect(rows).toEqual([]);
      }),
      { numRuns: 300 },
    );
  });
});
