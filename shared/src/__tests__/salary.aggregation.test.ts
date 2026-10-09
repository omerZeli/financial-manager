import { describe, expect, it } from 'vitest'
import {
  aggregateSalariesByMonth,
  computeSalaryTotals,
  type MonthlySalary,
  type SalaryTotals,
} from '../salary'
import type { Salary } from '../index'

// Exhaustive aggregation coverage for task 5.4 (Requirements 8.1-8.4).
// These assertions complement — and deliberately avoid duplicating — the light
// coverage in salary.unit.test.ts (task 5.1). They exercise multi-month /
// multi-employer combinations, decimal summation, ordering stability across
// input orderings, zero-deduction averages, and monthCount-derived averaging.

function salary(
  overrides: Partial<Salary> & { month: string; bruto: number; neto: number },
): Salary {
  return {
    id: overrides.id ?? `${overrides.month}-${overrides.employer ?? 'emp'}`,
    user_id: overrides.user_id ?? 'user-1',
    month: overrides.month,
    employer: overrides.employer ?? 'מעסיק א',
    bruto: overrides.bruto,
    neto: overrides.neto,
    created_at: overrides.created_at ?? `${overrides.month}T00:00:00Z`,
  }
}

describe('aggregateSalariesByMonth - exhaustive (8.1, 8.2)', () => {
  it('aggregates multiple months each with multiple employers (8.1 + 8.2 + 8.3)', () => {
    const result = aggregateSalariesByMonth([
      salary({ month: '2024-02-01', employer: 'א', bruto: 9000, neto: 6500 }),
      salary({ month: '2024-01-01', employer: 'א', bruto: 10000, neto: 7000 }),
      salary({ month: '2024-02-01', employer: 'ב', bruto: 3000, neto: 2500 }),
      salary({ month: '2024-01-01', employer: 'ב', bruto: 5000, neto: 4000 }),
      salary({ month: '2024-01-01', employer: 'ג', bruto: 1000, neto: 800 }),
    ])
    // Sorted ASC, one entry per distinct month, employers summed within month.
    expect(result).toEqual<MonthlySalary[]>([
      { month: '2024-01-01', bruto: 16000, neto: 11800 },
      { month: '2024-02-01', bruto: 12000, neto: 9000 },
    ])
  })

  it('is a single pass-through for one month / one employer baseline', () => {
    const result = aggregateSalariesByMonth([
      salary({ month: '2024-05-01', employer: 'יחיד', bruto: 8000, neto: 6000 }),
    ])
    expect(result).toEqual<MonthlySalary[]>([
      { month: '2024-05-01', bruto: 8000, neto: 6000 },
    ])
  })

  it('sums decimal bruto/neto across employers without integer rounding', () => {
    const result = aggregateSalariesByMonth([
      salary({ month: '2024-01-01', employer: 'א', bruto: 1000.1, neto: 700.05 }),
      salary({ month: '2024-01-01', employer: 'ב', bruto: 2000.25, neto: 1500.9 }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].bruto).toBeCloseTo(3000.35, 10)
    expect(result[0].neto).toBeCloseTo(2200.95, 10)
    expect(result[0].month).toBe('2024-01-01')
  })

  it('produces identical month ordering for already-sorted, reversed, and shuffled input', () => {
    const base = [
      salary({ month: '2024-01-01', employer: 'א', bruto: 100, neto: 90 }),
      salary({ month: '2024-02-01', employer: 'א', bruto: 200, neto: 180 }),
      salary({ month: '2024-03-01', employer: 'א', bruto: 300, neto: 270 }),
      salary({ month: '2024-04-01', employer: 'א', bruto: 400, neto: 360 }),
    ]
    const reversed = [...base].reverse()
    const shuffled = [base[2], base[0], base[3], base[1]]

    const expectedMonths = ['2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01']
    expect(aggregateSalariesByMonth(base).map(r => r.month)).toEqual(expectedMonths)
    expect(aggregateSalariesByMonth(reversed).map(r => r.month)).toEqual(expectedMonths)
    expect(aggregateSalariesByMonth(shuffled).map(r => r.month)).toEqual(expectedMonths)
    // Values are order-independent too.
    expect(aggregateSalariesByMonth(reversed)).toEqual(aggregateSalariesByMonth(base))
    expect(aggregateSalariesByMonth(shuffled)).toEqual(aggregateSalariesByMonth(base))
  })

  it('collapses many rows across distinct months into exactly one entry per month', () => {
    const result = aggregateSalariesByMonth([
      salary({ month: '2024-01-01', employer: 'א', bruto: 1, neto: 1 }),
      salary({ month: '2024-01-01', employer: 'ב', bruto: 1, neto: 1 }),
      salary({ month: '2024-01-01', employer: 'ג', bruto: 1, neto: 1 }),
      salary({ month: '2024-02-01', employer: 'א', bruto: 1, neto: 1 }),
    ])
    expect(result).toHaveLength(2)
    expect(new Set(result.map(r => r.month)).size).toBe(result.length)
  })
})

describe('computeSalaryTotals - exhaustive (8.3, 8.4)', () => {
  it('derives monthCount from distinct months, not row count (4 rows / 2 months)', () => {
    const totals = computeSalaryTotals([
      salary({ month: '2024-01-01', employer: 'א', bruto: 10000, neto: 8000 }),
      salary({ month: '2024-01-01', employer: 'ב', bruto: 2000, neto: 1800 }),
      salary({ month: '2024-02-01', employer: 'א', bruto: 11000, neto: 8600 }),
      salary({ month: '2024-02-01', employer: 'ב', bruto: 1000, neto: 900 }),
    ])
    expect(totals.monthCount).toBe(2)
    expect(totals.totalBruto).toBe(24000)
    expect(totals.totalNeto).toBe(19300)
    expect(totals.totalDeductions).toBe(4700)
    // Averages divide the totals by the distinct month count (2), not 4 rows.
    expect(totals.avgBruto).toBe(12000)
    expect(totals.avgNeto).toBe(9650)
    expect(totals.avgDeductions).toBe(2350)
  })

  it('reports zero deductions and bruto-equal averages when neto equals bruto', () => {
    const totals = computeSalaryTotals([
      salary({ month: '2024-01-01', employer: 'א', bruto: 5000, neto: 5000 }),
      salary({ month: '2024-02-01', employer: 'א', bruto: 7000, neto: 7000 }),
    ])
    expect(totals.totalBruto).toBe(12000)
    expect(totals.totalNeto).toBe(12000)
    expect(totals.totalDeductions).toBe(0)
    expect(totals.monthCount).toBe(2)
    expect(totals.avgBruto).toBe(6000)
    expect(totals.avgNeto).toBe(6000)
    expect(totals.avgDeductions).toBe(0)
  })

  it('divides by one for a single-month single-employer baseline', () => {
    const totals = computeSalaryTotals([
      salary({ month: '2024-03-01', employer: 'יחיד', bruto: 9000, neto: 6300 }),
    ])
    expect(totals).toEqual<SalaryTotals>({
      totalBruto: 9000,
      totalNeto: 6300,
      totalDeductions: 2700,
      monthCount: 1,
      avgBruto: 9000,
      avgNeto: 6300,
      avgDeductions: 2700,
    })
  })

  it('keeps decimal totals and averages precise across months', () => {
    const totals = computeSalaryTotals([
      salary({ month: '2024-01-01', employer: 'א', bruto: 1000.5, neto: 750.25 }),
      salary({ month: '2024-02-01', employer: 'א', bruto: 2000.5, neto: 1500.75 }),
    ])
    expect(totals.monthCount).toBe(2)
    expect(totals.totalBruto).toBeCloseTo(3001, 10)
    expect(totals.totalNeto).toBeCloseTo(2251, 10)
    expect(totals.totalDeductions).toBeCloseTo(750, 10)
    expect(totals.avgBruto).toBeCloseTo(1500.5, 10)
    expect(totals.avgNeto).toBeCloseTo(1125.5, 10)
    expect(totals.avgDeductions).toBeCloseTo(375, 10)
  })

  it('never yields NaN or Infinity for the empty zero-month case (8.4)', () => {
    const totals = computeSalaryTotals([])
    for (const value of Object.values(totals)) {
      expect(Number.isFinite(value)).toBe(true)
      expect(Number.isNaN(value)).toBe(false)
    }
    expect(totals.monthCount).toBe(0)
    expect(totals.avgBruto).toBe(0)
    expect(totals.avgNeto).toBe(0)
    expect(totals.avgDeductions).toBe(0)
  })
})
