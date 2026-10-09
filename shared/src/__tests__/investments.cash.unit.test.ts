import { describe, expect, it } from 'vitest';
import {
  computeChannelSummary,
  CASH_PATH_LABEL,
  type InvestmentDeposit,
  type InvestmentValueUpdate,
} from '../index';

// Unit tests for cash-channel edge cases of the event-sourcing engine.
// Task 3.4 — Validates Requirements 4.3, 4.4, 4.5.
//
// These are behavior-preserving assertions against the actual implementation of
// `computeChannelSummary` (shared/src/investments.ts) with `isCash = true`. The
// implementation must NOT be modified; the tests pin its current behavior.
//
// Note: CASH_PATH_LABEL is imported to document the cash-channel concept even
// though `computeChannelSummary` takes an explicit `isCash` flag rather than
// inspecting the channel path.

const CHANNEL_ID = 'chan-cash-1';

/** Build a fully-typed InvestmentValueUpdate fixture row. */
function valueUpdate(
  overrides: Partial<InvestmentValueUpdate> & Pick<InvestmentValueUpdate, 'id' | 'date' | 'value'>,
): InvestmentValueUpdate {
  return {
    user_id: 'user-1',
    channel_id: CHANNEL_ID,
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Build a fully-typed InvestmentDeposit fixture row. */
function deposit(
  overrides: Partial<InvestmentDeposit> & Pick<InvestmentDeposit, 'id' | 'date' | 'amount'>,
): InvestmentDeposit {
  return {
    user_id: 'user-1',
    channel_id: CHANNEL_ID,
    depositor: 'אני',
    salary_id: null,
    is_withdrawal: false,
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('computeChannelSummary — cash channel edge cases', () => {
  it('returns a fully zeroed summary with null lastUpdated when a cash channel has no value updates (Req 4.4)', () => {
    // Reference CASH_PATH_LABEL so the fixture documents intent; the engine uses
    // the explicit isCash flag.
    expect(CASH_PATH_LABEL).toBe('מזומן / עו"ש');

    const summary = computeChannelSummary(CHANNEL_ID, [], [], true);

    expect(summary).toEqual({
      totalDeposits: 0,
      currentValue: 0,
      returnAbsolute: 0,
      returnPercent: 0,
      lastUpdated: null,
    });
    expect(summary.lastUpdated).toBeNull();
  });

  it('still returns a zeroed summary even when deposit/withdrawal rows exist but no value updates (Req 4.3, 4.4)', () => {
    const deposits: InvestmentDeposit[] = [
      deposit({ id: 'dep-1', date: '2024-02-10', amount: 5000 }),
      deposit({ id: 'wd-1', date: '2024-03-01', amount: 1000, is_withdrawal: true, depositor: 'אני' }),
    ];

    const summary = computeChannelSummary(CHANNEL_ID, deposits, [], true);

    // Deposits/withdrawals are ignored for cash channels, and with no value
    // updates the result is fully zeroed with null lastUpdated.
    expect(summary).toEqual({
      totalDeposits: 0,
      currentValue: 0,
      returnAbsolute: 0,
      returnPercent: 0,
      lastUpdated: null,
    });
  });

  it('ignores deposit/withdrawal rows for cash channels — result depends only on the latest value update (Req 4.3)', () => {
    const valueUpdates: InvestmentValueUpdate[] = [
      valueUpdate({ id: 'val-1', date: '2024-01-31', value: 10000 }),
      valueUpdate({ id: 'val-2', date: '2024-02-29', value: 12500 }),
    ];
    // Large deposits and withdrawals that would dominate a non-cash balance.
    const deposits: InvestmentDeposit[] = [
      deposit({ id: 'dep-1', date: '2024-01-15', amount: 99999 }),
      deposit({ id: 'wd-1', date: '2024-02-15', amount: 55555, is_withdrawal: true, depositor: 'אני' }),
    ];

    const withDeposits = computeChannelSummary(CHANNEL_ID, deposits, valueUpdates, true);
    const withoutDeposits = computeChannelSummary(CHANNEL_ID, [], valueUpdates, true);

    // currentValue and totalDeposits come solely from the latest value update,
    // regardless of the deposit/withdrawal rows.
    expect(withDeposits.currentValue).toBe(12500);
    expect(withDeposits.totalDeposits).toBe(12500);
    expect(withDeposits.returnAbsolute).toBe(0);
    expect(withDeposits.returnPercent).toBe(0);

    // The presence of deposit/withdrawal rows makes no difference whatsoever.
    expect(withDeposits).toEqual(withoutDeposits);
  });

  it('sets lastUpdated to the greatest value-update date and currentValue to that update value (Req 4.5)', () => {
    // Provide value updates out of chronological order to prove the engine picks
    // the latest by date rather than by input order.
    const valueUpdates: InvestmentValueUpdate[] = [
      valueUpdate({ id: 'val-mid', date: '2024-06-30', value: 20000 }),
      valueUpdate({ id: 'val-latest', date: '2024-09-30', value: 23000 }),
      valueUpdate({ id: 'val-first', date: '2024-03-31', value: 18000 }),
    ];

    const summary = computeChannelSummary(CHANNEL_ID, [], valueUpdates, true);

    expect(summary.lastUpdated).toBe('2024-09-30');
    expect(summary.currentValue).toBe(23000);
    expect(summary.totalDeposits).toBe(23000);
    expect(summary.returnAbsolute).toBe(0);
    expect(summary.returnPercent).toBe(0);
  });

  it('scopes value updates to the requested channel id for cash channels (Req 4.5)', () => {
    const valueUpdates: InvestmentValueUpdate[] = [
      valueUpdate({ id: 'val-this', date: '2024-05-31', value: 15000 }),
      // A later value update belonging to a DIFFERENT channel must be ignored.
      valueUpdate({ id: 'val-other', date: '2024-12-31', value: 99000, channel_id: 'chan-other' }),
    ];

    const summary = computeChannelSummary(CHANNEL_ID, [], valueUpdates, true);

    expect(summary.lastUpdated).toBe('2024-05-31');
    expect(summary.currentValue).toBe(15000);
    expect(summary.totalDeposits).toBe(15000);
  });
});
