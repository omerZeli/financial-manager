/**
 * Format a local Date object as a YYYY-MM-DD string.
 *
 * IMPORTANT: Do NOT use `date.toISOString().slice(0, 10)` for this purpose.
 * `toISOString()` converts to UTC, which shifts the date backwards in timezones
 * ahead of UTC (e.g. Israel UTC+3: midnight May 1 local → April 30 21:00 UTC).
 */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** Get today's date as a YYYY-MM-DD string in local timezone. */
export function todayStr(): string {
  return formatLocalDate(new Date())
}

/**
 * Compute the effective date for an item that may be linked to a salary.
 * Items deducted from salary are executed the month after the salary month,
 * so they should be attributed to the salary's month (shifted back by 1 month).
 *
 * @param itemDate - The item's own date (YYYY-MM-DD)
 * @param salaryId - The salary_id FK (nullable)
 * @param salaryMonthMap - Map of salary ID → salary month (YYYY-MM-DD)
 * @returns The effective date string to use for filtering
 */
export function getEffectiveDate(
  itemDate: string,
  salaryId: string | null,
  salaryMonthMap: Map<string, string>
): string {
  if (salaryId && salaryMonthMap.has(salaryId)) {
    return salaryMonthMap.get(salaryId)!
  }
  return itemDate
}
