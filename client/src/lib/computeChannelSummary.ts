import type { InvestmentDeposit } from '../contexts/InvestmentDepositsContext'
import type { InvestmentValueUpdate } from '../contexts/InvestmentValuesContext'

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
): ChannelSummary {
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
