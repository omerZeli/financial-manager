import { describe, expect, it } from 'vitest'
import { computeChannelSummary } from '../investments'
import type { InvestmentDeposit, InvestmentValueUpdate } from '../index'

// Unit tests for the event-sourcing engine math (`computeChannelSummary`,
// isCash=false). These assert the engine's actual, behavior-preserving math
// per the design's correctness criteria (Requirements 5.2, 5.3, 5.4, 5.7,
// 5.8, 5.9). They do NOT modify the implementation.

const CHANNEL = 'chan-1'

// Build a concrete deposit/withdrawal fixture row with all required fields.
function deposit(
  overrides: Partial<InvestmentDeposit> & { amount: number; date: string },
): InvestmentDeposit {
  return {
    id: overrides.id ?? `dep-${overrides.date}-${overrides.amount}`,
    user_id: 'user-1',
    channel_id: overrides.channel_id ?? CHANNEL,
    amount: overrides.amount,
    date: overrides.date,
    depositor: overrides.depositor ?? 'אני',
    salary_id: overrides.salary_id ?? null,
    is_withdrawal: overrides.is_withdrawal ?? false,
    created_at: overrides.created_at ?? `${overrides.date}T00:00:00Z`,
  }
}

// Build a concrete value-update fixture row with all required fields.
function valueUpdate(
  overrides: Partial<InvestmentValueUpdate> & { value: number; date: string },
): InvestmentValueUpdate {
  return {
    id: overrides.id ?? `val-${overrides.date}-${overrides.value}`,
    user_id: 'user-1',
    channel_id: overrides.channel_id ?? CHANNEL,
    value: overrides.value,
    date: overrides.date,
    created_at: overrides.created_at ?? `${overrides.date}T00:00:00Z`,
  }
}

describe('computeChannelSummary (event-sourcing math, isCash=false)', () => {
  it('Req 5.2: a deposit adds its amount to both running balance and invested capital', () => {
    const X = 500
    const summary = computeChannelSummary(
      CHANNEL,
      [deposit({ amount: X, date: '2024-01-10' })],
      [],
      false,
    )

    expect(summary.currentValue).toBe(X)
    expect(summary.totalDeposits).toBe(X)
    expect(summary.returnAbsolute).toBe(0)
    expect(summary.returnPercent).toBe(0)
  })

  it('Req 5.3: a withdrawal subtracts from both running balance and invested capital', () => {
    const X = 1000
    const Y = 300
    const summary = computeChannelSummary(
      CHANNEL,
      [
        deposit({ amount: X, date: '2024-01-10' }),
        deposit({ amount: Y, date: '2024-02-10', is_withdrawal: true }),
      ],
      [],
      false,
    )

    expect(summary.currentValue).toBe(X - Y)
    expect(summary.totalDeposits).toBe(X - Y)
    // Pure cash flow with no checkpoint → no profit/loss.
    expect(summary.returnAbsolute).toBe(0)
  })

  it('Req 5.4: a value update accumulates the delta as profit then overrides the balance', () => {
    const summary = computeChannelSummary(
      CHANNEL,
      [deposit({ amount: 100, date: '2024-01-10' })],
      [valueUpdate({ value: 120, date: '2024-03-01' })],
      false,
    )

    expect(summary.returnAbsolute).toBe(20)
    expect(summary.currentValue).toBe(120)
    expect(summary.totalDeposits).toBe(100)
    expect(summary.returnPercent).toBeCloseTo(0.2, 10)
  })

  it('Req 5.7: returnPercent guard — invested capital of 0 (only a value update) yields returnPercent 0', () => {
    const summary = computeChannelSummary(
      CHANNEL,
      [],
      [valueUpdate({ value: 500, date: '2024-05-01' })],
      false,
    )

    // Invested capital stays 0 → guard forces returnPercent to exactly 0
    // even though a checkpoint produced positive absolute profit.
    expect(summary.totalDeposits).toBe(0)
    expect(summary.returnPercent).toBe(0)
  })

  it('Req 5.7: returnPercent guard — net withdrawals making invested capital negative yields returnPercent 0', () => {
    const summary = computeChannelSummary(
      CHANNEL,
      [
        deposit({ amount: 100, date: '2024-01-10' }),
        deposit({ amount: 250, date: '2024-02-10', is_withdrawal: true }),
      ],
      [],
      false,
    )

    expect(summary.totalDeposits).toBe(-150)
    expect(summary.returnPercent).toBe(0)
  })

  it('Req 5.8: lastUpdated equals the most recent processed event date across all event types', () => {
    const summary = computeChannelSummary(
      CHANNEL,
      [
        deposit({ amount: 100, date: '2024-01-10' }),
        deposit({ amount: 50, date: '2024-06-15', is_withdrawal: true }),
      ],
      [
        valueUpdate({ value: 120, date: '2024-03-01' }),
        valueUpdate({ value: 90, date: '2024-04-20' }),
      ],
      false,
    )

    // Most recent event across deposits/withdrawals/value updates is 2024-06-15.
    expect(summary.lastUpdated).toBe('2024-06-15')
  })

  it('Req 5.9: a channel with no events returns a zeroed summary with lastUpdated === null', () => {
    const summary = computeChannelSummary(CHANNEL, [], [], false)

    expect(summary).toEqual({
      totalDeposits: 0,
      currentValue: 0,
      lastUpdated: null,
      returnAbsolute: 0,
      returnPercent: 0,
    })
  })

  it('Req 5.9: events belonging only to other channels count as no events for this channel', () => {
    const summary = computeChannelSummary(
      CHANNEL,
      [deposit({ amount: 999, date: '2024-01-10', channel_id: 'other-chan' })],
      [valueUpdate({ value: 999, date: '2024-02-10', channel_id: 'other-chan' })],
      false,
    )

    expect(summary.lastUpdated).toBeNull()
    expect(summary.currentValue).toBe(0)
    expect(summary.totalDeposits).toBe(0)
  })
})
