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
