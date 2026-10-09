import type { InvestmentChannel, InvestmentDeposit, InvestmentValueUpdate } from './types'
import { formatLocalDate, todayStr } from './dateUtils'

/** Hardcoded cash path label — used to identify cash/checking-account channels */
export const CASH_PATH_LABEL = 'מזומן / עו"ש'

/**
 * Event Sourcing / Checkpoint recalculation engine for investment channels.
 *
 * All deposits, withdrawals, and value updates are treated as immutable events.
 * Events are sorted chronologically and replayed to compute the current state:
 *
 * - Deposit  → adds to running balance and invested capital
 * - Withdrawal (is_withdrawal=true) → subtracts from running balance and invested capital
 * - Value Update → hard-overrides the running balance (checkpoint).
 *   The delta between the running balance before the checkpoint and the new value
 *   is accumulated as profit/loss.
 *
 * For **cash channels** (investment_path === CASH_PATH_LABEL), value updates represent
 * the total balance. The value IS the deposits amount, so return is always 0.
 * Actual deposit/withdrawal records are ignored for cash channels.
 *
 * This approach removes any need for chronological input ordering —
 * users can add retroactive events at any past date.
 */

type Event =
  | { type: 'deposit'; date: string; amount: number }
  | { type: 'withdrawal'; date: string; amount: number }
  | { type: 'value_update'; date: string; value: number }

export interface ChannelSummary {
  /** Net invested capital (deposits minus withdrawals) */
  totalDeposits: number
  /** Current running balance after replaying all events */
  currentValue: number
  /** Date of the most recent event */
  lastUpdated: string | null
  /** Accumulated profit/loss from value-update checkpoints */
  returnAbsolute: number
  /** returnAbsolute / totalDeposits */
  returnPercent: number
}

export function computeChannelSummary(
  channelId: string,
  deposits: InvestmentDeposit[],
  valueUpdates: InvestmentValueUpdate[],
  isCash = false,
): ChannelSummary {
  // Cash channels: value update IS the balance, deposits are ignored, return is always 0
  if (isCash) {
    const channelValues = valueUpdates
      .filter(v => v.channel_id === channelId)
      .sort((a, b) => a.date.localeCompare(b.date))
    if (channelValues.length === 0) {
      return { totalDeposits: 0, currentValue: 0, lastUpdated: null, returnAbsolute: 0, returnPercent: 0 }
    }
    const latest = channelValues[channelValues.length - 1]
    return {
      totalDeposits: latest.value,
      currentValue: latest.value,
      lastUpdated: latest.date,
      returnAbsolute: 0,
      returnPercent: 0,
    }
  }

  // Build unified event list
  const events: Event[] = []

  for (const d of deposits) {
    if (d.channel_id !== channelId) continue
    if (d.is_withdrawal) {
      events.push({ type: 'withdrawal', date: d.date, amount: d.amount })
    } else {
      events.push({ type: 'deposit', date: d.date, amount: d.amount })
    }
  }

  for (const v of valueUpdates) {
    if (v.channel_id !== channelId) continue
    events.push({ type: 'value_update', date: v.date, value: v.value })
  }

  if (events.length === 0) {
    return { totalDeposits: 0, currentValue: 0, lastUpdated: null, returnAbsolute: 0, returnPercent: 0 }
  }

  // Sort chronologically. On same date: deposits/withdrawals before value updates
  // so the checkpoint captures the balance *after* that day's cash flows.
  events.sort((a, b) => {
    const cmp = a.date.localeCompare(b.date)
    if (cmp !== 0) return cmp
    const order = { deposit: 0, withdrawal: 0, value_update: 1 }
    return order[a.type] - order[b.type]
  })

  let runningBalance = 0   // tracks the "expected" balance from cash flows
  let investedCapital = 0  // net deposits minus withdrawals
  let totalProfit = 0      // accumulated P&L from checkpoints
  let lastUpdated: string | null = null

  for (const event of events) {
    lastUpdated = event.date
    switch (event.type) {
      case 'deposit':
        runningBalance += event.amount
        investedCapital += event.amount
        break
      case 'withdrawal':
        runningBalance -= event.amount
        investedCapital -= event.amount
        break
      case 'value_update':
        // The delta between the hard value and the running balance is profit/loss
        totalProfit += event.value - runningBalance
        // Reset running balance to the checkpoint value
        runningBalance = event.value
        break
    }
  }

  const currentValue = runningBalance
  const returnAbsolute = currentValue - investedCapital
  const returnPercent = investedCapital > 0 ? returnAbsolute / investedCapital : 0

  return { totalDeposits: investedCapital, currentValue, lastUpdated, returnAbsolute, returnPercent }
}

/**
 * A channel's event-sourcing summary merged with its channel row and the cash flag.
 */
export interface ChannelSummaryWithMeta extends ChannelSummary, InvestmentChannel {
  isCash: boolean
}

/**
 * Compute per-channel summaries for a set of channels, running each channel
 * through `computeChannelSummary`. A channel is treated as cash when its
 * `investment_path` matches `CASH_PATH_LABEL`.
 *
 * Mirrors the `summaries` memo in the client InvestmentsChartsPage.
 */
export function computeInvestmentSummaries(input: {
  channels: InvestmentChannel[]
  deposits: InvestmentDeposit[]
  valueUpdates: InvestmentValueUpdate[]
}): ChannelSummaryWithMeta[] {
  const { channels, deposits, valueUpdates } = input
  return channels.map(ch => {
    const isCash = ch.investment_path === CASH_PATH_LABEL
    const summary = computeChannelSummary(ch.id, deposits, valueUpdates, isCash)
    return { ...ch, ...summary, isCash }
  })
}

/**
 * Portfolio-wide totals derived from channel summaries.
 *
 * Cash channels are excluded from deposits and return (their value equals their
 * deposits so return is 0) but still count toward total current value — mirrors
 * the client charts page.
 */
export interface InvestmentTotals {
  /** Gross non-withdrawal deposits, excluding cash channels */
  totalDeposited: number
  /** Sum of currentValue across all channels (incl. cash) */
  totalCurrentValue: number
  /** Non-cash: currentValue - netInvested */
  totalReturn: number
  /** totalReturn / netInvested (non-cash), 0 when netInvested <= 0 */
  totalReturnPercent: number
}

/**
 * Compute portfolio totals from channel summaries and the raw deposits list.
 *
 * Mirrors the un-filtered branch of the client InvestmentsChartsPage:
 * - `totalDeposited` sums gross (non-withdrawal) deposits for non-cash channels.
 * - `totalCurrentValue` sums currentValue across all channels (including cash).
 * - `totalReturn` / `totalReturnPercent` use non-cash channels only
 *   (currentValue - netInvested over netInvested).
 */
export function computeInvestmentTotals(
  summaries: ChannelSummaryWithMeta[],
  deposits: InvestmentDeposit[],
): InvestmentTotals {
  const cashChannelIds = new Set(summaries.filter(s => s.isCash).map(s => s.id))
  const nonCashSummaries = summaries.filter(s => !s.isCash)

  const totalDeposited = deposits
    .filter(d => !cashChannelIds.has(d.channel_id) && !d.is_withdrawal)
    .reduce((s, d) => s + d.amount, 0)

  const totalCurrentValue = summaries.reduce((s, c) => s + c.currentValue, 0)

  const nonCashValue = nonCashSummaries.reduce((s, c) => s + c.currentValue, 0)
  const netInvested = nonCashSummaries.reduce((s, c) => s + c.totalDeposits, 0)
  const totalReturn = nonCashValue - netInvested
  const totalReturnPercent = netInvested > 0 ? totalReturn / netInvested : 0

  return { totalDeposited, totalCurrentValue, totalReturn, totalReturnPercent }
}

/** A single sampled return-over-time point. */
export interface ReturnPoint {
  date: string
  returnPct: number
}

/**
 * Compute portfolio return percentage over time by sampling at a series of dates.
 *
 * For each sample date, every channel is summarized over the events dated on or
 * before that date, and the aggregate return percentage is pushed when the total
 * invested capital is positive.
 *
 * When `sampleDates` is omitted, a last-day-of-month series is derived from the
 * earliest event month through `min(end month, today)`.
 *
 * NOTE: the client's 18-month display slice is a page-level concern and is NOT
 * applied here — this function returns every computed point in the derived range.
 *
 * Mirrors the `returnOverTime` branch of the client InvestmentsChartsPage.
 */
export function computeReturnOverTime(input: {
  channels: InvestmentChannel[]
  deposits: InvestmentDeposit[]
  valueUpdates: InvestmentValueUpdate[]
  sampleDates?: string[]
}): ReturnPoint[] {
  const { channels, deposits, valueUpdates } = input

  let sampleDates = input.sampleDates
  if (!sampleDates) {
    // Derive a last-day-of-month series from the earliest event month through
    // min(end month, today).
    const allDates = [
      ...deposits.map(d => d.date),
      ...valueUpdates.map(v => v.date),
    ]
    if (allDates.length === 0) return []

    const sortedDates = [...new Set(allDates)].sort()
    const firstDate = sortedDates[0]
    const firstD = new Date(firstDate + 'T00:00:00')
    const today = todayStr()
    const endD = new Date(today + 'T00:00:00')
    const endMonthEnd = new Date(endD.getFullYear(), endD.getMonth() + 1, 0)

    const monthlyDates: string[] = []
    let curYear = firstD.getFullYear()
    let curMonth = firstD.getMonth()
    while (true) {
      const lastDay = new Date(curYear, curMonth + 1, 0)
      if (lastDay > endMonthEnd) break
      if (lastDay >= firstD) {
        monthlyDates.push(formatLocalDate(lastDay))
      }
      curMonth++
      if (curMonth > 11) { curMonth = 0; curYear++ }
    }

    if (monthlyDates.length > 0 && monthlyDates[monthlyDates.length - 1] > today) {
      monthlyDates.pop()
    }

    sampleDates = monthlyDates
  }

  const points: ReturnPoint[] = []

  for (const date of sampleDates) {
    const depositsToDate = deposits.filter(d => d.date <= date)
    const valuesToDate = valueUpdates.filter(v => v.date <= date)

    let totalInvested = 0
    let totalValue = 0

    for (const ch of channels) {
      const summary = computeChannelSummary(ch.id, depositsToDate, valuesToDate, false)
      totalInvested += summary.totalDeposits
      totalValue += summary.currentValue
    }

    if (totalInvested > 0) {
      points.push({ date, returnPct: ((totalValue - totalInvested) / totalInvested) * 100 })
    }
  }

  return points
}
