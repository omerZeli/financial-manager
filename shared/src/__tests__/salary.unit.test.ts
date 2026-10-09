import { describe, expect, it } from 'vitest'
import { aggregateSalariesByMonth, computeSalaryTotals } from '../salary'
import type { Salary } from '../index'

// Light unit coverage for the verbatim salary extraction (Requirements 3.7,
// 8.1-8.4). The exhaustive aggregation suite lives in task 5.4.

function salary(overrides: Partial<Salary> & { month: string; bruto: number; neto: number }): Salary {
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

describe('aggregateSalariesByMonth', () => {
  it('sums multiple employers in the same month into one entry (8.1)', () => {
    const result = aggregateSalariesByMonth([
      salary({ month: '2024-01-01', employer: 'מעסיק א', bruto: 10000, neto: 7000 }),
      salary({ month: '2024-01-01', employer: 'מעסיק ב', bruto: 5000, neto: 4000 }),
    ])
    expect(result).toEqual([{ month: '2024-01-01', bruto: 15000, neto: 11000 }])
  })

  it('sorts months ascending with no duplicate month entries (8.2)', () => {
    const result = aggregateSalariesByMonth([
      salary({ month: '2024-03-01', bruto: 1, neto: 1 }),
      salary({ month: '2024-01-01', bruto: 2, neto: 2 }),
      salary({ month: '2024-02-01', bruto: 3, neto: 3 }),
      salary({ month: '2024-01-01', bruto: 4, neto: 4 }),
    ])
    expect(result.map(r => r.month)).toEqual(['2024-01-01', '2024-02-01', '2024-03-01'])
    expect(result[0]).toEqual({ month: '2024-01-01', bruto: 6, neto: 6 })
  })

  it('returns an empty array for no salaries', () => {
    expect(aggregateSalariesByMonth([])).toEqual([])
  })
})

describe('computeSalaryTotals', () => {
  it('computes totals, deductions, month count, and averages (8.3)', () => {
    const totals = computeSalaryTotals([
      salary({ month: '2024-01-01', employer: 'א', bruto: 10000, neto: 7000 }),
      salary({ month: '2024-01-01', employer: 'ב', bruto: 2000, neto: 1500 }),
      salary({ month: '2024-02-01', employer: 'א', bruto: 12000, neto: 8500 }),
    ])
    expect(totals.totalBruto).toBe(24000)
    expect(totals.totalNeto).toBe(17000)
    expect(totals.totalDeductions).toBe(7000)
    expect(totals.monthCount).toBe(2)
    expect(totals.avgBruto).toBe(12000)
    expect(totals.avgNeto).toBe(8500)
    expect(totals.avgDeductions).toBe(3500)
  })

  it('guards the zero-month case without dividing (8.4)', () => {
    const totals = computeSalaryTotals([])
    expect(totals).toEqual({
      totalBruto: 0,
      totalNeto: 0,
      totalDeductions: 0,
      monthCount: 0,
      avgBruto: 0,
      avgNeto: 0,
      avgDeductions: 0,
    })
  })
})
