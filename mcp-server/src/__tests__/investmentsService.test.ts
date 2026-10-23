import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  computeInvestmentSummaries,
  computeReturnOverTime,
  CASH_PATH_LABEL,
  type InvestmentChannel,
  type InvestmentDeposit,
  type InvestmentValueUpdate,
} from '@financial-manager/shared';

// Unit tests for the investment SERVICE layer (task 10.3).
//
// Validates:
//   - Service composition + filter pass-through: `getInvestmentSummaries` and
//     `getReturnOverTime` COMPOSE the (mocked) channel/deposit/value-update
//     readers with the shared event-sourcing engine. The service output must
//     equal the shared computations applied to the same mocked rows, and the
//     channelId/isPension filters must be honored.
//   - Requirement 12.10 (return-over-time range): `getReturnOverTime` returns
//     ALL computed points whose date is within the requested dateFrom/dateTo
//     range - no 18-month display slice, no points dropped inside the range.
//   - Requirement 15.5 (zero rows): with no channels the summaries array and
//     the return-over-time series are both successful empty arrays, never
//     errors.
//
// Strategy: the service imports its readers from '../data/*.js', so we mock
// those exact module specifiers. No real Supabase client is ever used - the
// "client" is an opaque sentinel the mocked readers ignore. Every row is a fake
// placeholder with synthetic ids/user_id - no real data, no network.

let mockChannels: InvestmentChannel[] = [];
let mockDeposits: InvestmentDeposit[] = [];
let mockValueUpdates: InvestmentValueUpdate[] = [];

vi.mock('../data/channels.js', () => ({
  fetchChannels: vi.fn(async () => mockChannels),
}));
vi.mock('../data/deposits.js', () => ({
  fetchDeposits: vi.fn(async () => mockDeposits),
}));
vi.mock('../data/valueUpdates.js', () => ({
  fetchValueUpdates: vi.fn(async () => mockValueUpdates),
}));

const { getInvestmentSummaries, getReturnOverTime } = await import('../services/investments');
const { fetchChannels } = await import('../data/channels.js');
const { fetchDeposits } = await import('../data/deposits.js');
const { fetchValueUpdates } = await import('../data/valueUpdates.js');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakeClient = { __fake: true } as any;

/** Build a fake investment channel row. */
function channel(
  id: string,
  path: string = 'מניות',
  isPension = false,
): InvestmentChannel {
  return {
    id,
    user_id: 'fake-user',
    name: `channel-${id}`,
    company: `company-${id}`,
    investment_path: path,
    is_pension: isPension,
    created_at: '2024-01-01T00:00:00.000Z',
  };
}

/** Build a fake deposit (or withdrawal) row. */
function deposit(
  id: string,
  channelId: string,
  amount: number,
  date: string,
  isWithdrawal = false,
): InvestmentDeposit {
  return {
    id,
    user_id: 'fake-user',
    channel_id: channelId,
    amount,
    date,
    depositor: 'אני',
    salary_id: null,
    is_withdrawal: isWithdrawal,
    created_at: `${date}T00:00:00.000Z`,
  };
}

/** Build a fake value-update row. */
function valueUpdate(
  id: string,
  channelId: string,
  value: number,
  date: string,
): InvestmentValueUpdate {
  return {
    id,
    user_id: 'fake-user',
    channel_id: channelId,
    value,
    date,
    created_at: `${date}T00:00:00.000Z`,
  };
}

afterEach(() => {
  vi.clearAllMocks();
  mockChannels = [];
  mockDeposits = [];
  mockValueUpdates = [];
});

describe('getInvestmentSummaries service composition (10.3)', () => {
  it('composes the three readers through the shared event-sourcing engine', async () => {
    mockChannels = [channel('c1'), channel('c2', CASH_PATH_LABEL)];
    mockDeposits = [
      deposit('d1', 'c1', 1000, '2024-01-01'),
      deposit('d2', 'c2', 500, '2024-01-01'),
    ];
    mockValueUpdates = [
      valueUpdate('v1', 'c1', 1200, '2024-02-01'),
      valueUpdate('v2', 'c2', 800, '2024-02-01'),
    ];

    const result = await getInvestmentSummaries(fakeClient, {});

    // Composition parity: equal to the shared engine over the same rows.
    expect(result).toEqual(
      computeInvestmentSummaries({
        channels: mockChannels,
        deposits: mockDeposits,
        valueUpdates: mockValueUpdates,
      }),
    );

    const c1 = result.find(s => s.id === 'c1');
    expect(c1?.currentValue).toBe(1200);
    expect(c1?.totalDeposits).toBe(1000);
    expect(c1?.returnAbsolute).toBe(200);
    expect(c1?.isCash).toBe(false);

    // Cash channel: value IS the balance, deposits ignored, return 0.
    const c2 = result.find(s => s.id === 'c2');
    expect(c2?.isCash).toBe(true);
    expect(c2?.currentValue).toBe(800);
    expect(c2?.totalDeposits).toBe(800);
    expect(c2?.returnAbsolute).toBe(0);
  });

  it('fans out to all three readers passing the channelId/isPension filters', async () => {
    mockChannels = [channel('c1', 'מניות', true)];

    await getInvestmentSummaries(fakeClient, { channelId: 'c1', isPension: true });

    expect(fetchChannels).toHaveBeenCalledTimes(1);
    expect(fetchChannels).toHaveBeenCalledWith(fakeClient, { isPension: true });
    expect(fetchDeposits).toHaveBeenCalledTimes(1);
    expect(fetchDeposits).toHaveBeenCalledWith(fakeClient, { channelId: 'c1' });
    expect(fetchValueUpdates).toHaveBeenCalledTimes(1);
    expect(fetchValueUpdates).toHaveBeenCalledWith(fakeClient, { channelId: 'c1' });
  });

  it('restricts the summarized channels to the requested channelId', async () => {
    mockChannels = [channel('c1'), channel('c2')];
    mockDeposits = [deposit('d1', 'c1', 1000, '2024-01-01')];

    const result = await getInvestmentSummaries(fakeClient, { channelId: 'c1' });

    expect(result.map(s => s.id)).toEqual(['c1']);
  });

  it('zero channels yields a successful empty summaries array, never an error (15.5)', async () => {
    mockChannels = [];
    mockDeposits = [];
    mockValueUpdates = [];

    const result = await getInvestmentSummaries(fakeClient, {});

    expect(result).toEqual([]);
  });
});

describe('getReturnOverTime service composition + range (10.3, 12.10)', () => {
  it('composes the three readers through the shared return-over-time engine', async () => {
    mockChannels = [channel('c1')];
    mockDeposits = [deposit('d1', 'c1', 1000, '2024-01-10')];
    mockValueUpdates = [
      valueUpdate('v1', 'c1', 1100, '2024-02-15'),
      valueUpdate('v2', 'c1', 1200, '2024-03-15'),
    ];

    const result = await getReturnOverTime(fakeClient, {});

    // With no date filters the service returns exactly the shared series.
    expect(result).toEqual(
      computeReturnOverTime({
        channels: mockChannels,
        deposits: mockDeposits,
        valueUpdates: mockValueUpdates,
      }),
    );
  });

  it('returns ALL computed points within the requested dateFrom/dateTo range (12.10)', async () => {
    mockChannels = [channel('c1')];
    // One deposit early, then monthly value updates so the derived month-end
    // series produces several points with positive invested capital.
    mockDeposits = [deposit('d1', 'c1', 1000, '2024-01-05')];
    mockValueUpdates = [
      valueUpdate('v1', 'c1', 1010, '2024-01-20'),
      valueUpdate('v2', 'c1', 1050, '2024-02-20'),
      valueUpdate('v3', 'c1', 1100, '2024-03-20'),
      valueUpdate('v4', 'c1', 1150, '2024-04-20'),
    ];

    // The full (unfiltered) series the shared engine computes.
    const full = computeReturnOverTime({
      channels: mockChannels,
      deposits: mockDeposits,
      valueUpdates: mockValueUpdates,
    });

    const dateFrom = '2024-02-01';
    const dateTo = '2024-03-31';

    const result = await getReturnOverTime(fakeClient, { dateFrom, dateTo });

    // Expectation = exactly the full points whose date is in [from, to], in
    // order. No point inside the range may be dropped, and none outside may
    // leak in.
    const expected = full.filter(p => p.date >= dateFrom && p.date <= dateTo);
    expect(result).toEqual(expected);

    // Sanity: there IS at least one in-range point, and every returned date is
    // within the requested bounds.
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(p.date >= dateFrom && p.date <= dateTo).toBe(true);
    }
    // And at least one full-series point lies outside the range (so the filter
    // is actually exercised, not vacuously passing).
    expect(full.length).toBeGreaterThan(result.length);
  });

  it('applies dateFrom alone (inclusive lower bound)', async () => {
    mockChannels = [channel('c1')];
    mockDeposits = [deposit('d1', 'c1', 1000, '2024-01-05')];
    mockValueUpdates = [
      valueUpdate('v1', 'c1', 1010, '2024-01-20'),
      valueUpdate('v2', 'c1', 1050, '2024-02-20'),
      valueUpdate('v3', 'c1', 1100, '2024-03-20'),
    ];

    const full = computeReturnOverTime({
      channels: mockChannels,
      deposits: mockDeposits,
      valueUpdates: mockValueUpdates,
    });

    const dateFrom = '2024-02-01';
    const result = await getReturnOverTime(fakeClient, { dateFrom });

    expect(result).toEqual(full.filter(p => p.date >= dateFrom));
  });

  it('passes the channelId/isPension filters to the readers', async () => {
    mockChannels = [channel('c1', 'מניות', true)];

    await getReturnOverTime(fakeClient, { channelId: 'c1', isPension: true });

    expect(fetchChannels).toHaveBeenCalledWith(fakeClient, { isPension: true });
    expect(fetchDeposits).toHaveBeenCalledWith(fakeClient, { channelId: 'c1' });
    expect(fetchValueUpdates).toHaveBeenCalledWith(fakeClient, { channelId: 'c1' });
  });

  it('zero channels/events yields a successful empty series, never an error (15.5)', async () => {
    mockChannels = [];
    mockDeposits = [];
    mockValueUpdates = [];

    const result = await getReturnOverTime(fakeClient, {});

    expect(result).toEqual([]);
  });
});
