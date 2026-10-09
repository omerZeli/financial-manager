import { describe, expect, it } from 'vitest'
import { formatLocalDate, todayStr, getEffectiveDate } from '../dateUtils'

// Unit tests for the timezone-safe date helpers (Requirement 3.1). These assert
// the implementation's actual behavior and do NOT modify it.

describe('formatLocalDate (Req 3.1: timezone-safe local formatting)', () => {
  it('formats a local Date using its local calendar fields, never shifting the day backwards', () => {
    // Local May 1, 2024 (midnight local time).
    const d = new Date(2024, 4, 1)

    expect(formatLocalDate(d)).toBe('2024-05-01')

    // Guard against the toISOString().slice(0,10) bug: in UTC+ timezones that
    // conversion shifts midnight local May 1 back to April 30. Our helper must
    // match the local calendar day, which can only diverge from the UTC slice
    // when the environment is ahead of UTC.
    const utcSlice = d.toISOString().slice(0, 10)
    const localDay = d.getDate()
    const utcDay = new Date(utcSlice + 'T00:00:00Z').getUTCDate()
    if (localDay !== utcDay) {
      // Timezone is ahead of UTC → the UTC slice is wrong and our helper fixed it.
      expect(formatLocalDate(d)).not.toBe(utcSlice)
    }
  })

  it('zero-pads single-digit months and days', () => {
    const d = new Date(2024, 0, 5) // local Jan 5, 2024
    expect(formatLocalDate(d)).toBe('2024-01-05')
  })

  it('zero-pads a single-digit day in a two-digit month', () => {
    const d = new Date(2024, 11, 3) // local Dec 3, 2024
    expect(formatLocalDate(d)).toBe('2024-12-03')
  })
})

describe('todayStr (Req 3.1)', () => {
  it('returns a YYYY-MM-DD string matching formatLocalDate(new Date())', () => {
    const result = todayStr()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result).toBe(formatLocalDate(new Date()))
  })
})

describe('getEffectiveDate (Req 3.1)', () => {
  const salaryMonthMap = new Map<string, string>([
    ['sal-1', '2024-02-01'],
    ['sal-2', '2024-05-01'],
  ])

  it('returns the mapped salary month when salaryId is non-null and present in the map', () => {
    expect(getEffectiveDate('2024-03-15', 'sal-1', salaryMonthMap)).toBe('2024-02-01')
    expect(getEffectiveDate('2024-06-20', 'sal-2', salaryMonthMap)).toBe('2024-05-01')
  })

  it('returns the item date when salaryId is null', () => {
    expect(getEffectiveDate('2024-03-15', null, salaryMonthMap)).toBe('2024-03-15')
  })

  it('returns the item date when salaryId is not present in the map', () => {
    expect(getEffectiveDate('2024-03-15', 'sal-unknown', salaryMonthMap)).toBe('2024-03-15')
  })

  it('returns the item date when the map is empty', () => {
    expect(getEffectiveDate('2024-03-15', 'sal-1', new Map())).toBe('2024-03-15')
  })
})
