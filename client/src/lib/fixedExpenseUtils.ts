/**
 * Computes the latest inflated occurrence of a fixed expense up to today
 * (or end_date if earlier). Returns ISO date string, or empty string if
 * start_date is in the future.
 */
export function getLatestFixedOccurrence(
  startDate: string,
  frequencyValue: number,
  frequencyPeriod: string,
  endDate: string | null
): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cap = endDate ? new Date(endDate) : today
  const limit = cap < today ? cap : today

  const start = new Date(startDate)
  if (start > limit) return ''

  let current = new Date(start)
  let latest = new Date(start)

  while (current <= limit) {
    latest = new Date(current)
    const next = new Date(current)
    if (frequencyPeriod === 'days') {
      next.setDate(next.getDate() + frequencyValue)
    } else if (frequencyPeriod === 'weeks') {
      next.setDate(next.getDate() + frequencyValue * 7)
    } else if (frequencyPeriod === 'months') {
      next.setMonth(next.getMonth() + frequencyValue)
    } else if (frequencyPeriod === 'years') {
      next.setFullYear(next.getFullYear() + frequencyValue)
    }
    current = next
  }

  const y = latest.getFullYear()
  const m = String(latest.getMonth() + 1).padStart(2, '0')
  const d = String(latest.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
