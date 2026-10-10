import type { Salary } from './types.js'

/** A single month's aggregated salary (bruto/neto summed across employers). */
export interface MonthlySalary {
  month: string
  bruto: number
  neto: number
}

/** Portfolio-level salary totals, deductions, month count, and averages. */
export interface SalaryTotals {
  totalBruto: number
  totalNeto: number
  totalDeductions: number
  monthCount: number
  avgBruto: number
  avgNeto: number
  avgDeductions: number
}

/**
 * Aggregate salaries by month, summing bruto/neto across multiple employers
 * that share the same YYYY-MM month into a single entry.
 *
 * Ported verbatim from the client `SalaryChartsPage` `byMonth` useMemo to
 * preserve exact semantics (behavioral-parity guarantee):
 * - iterate the given salaries into a Map keyed by `month`
 * - sum `bruto` and `neto` for matching months
 * - return the map values sorted ascending by month (`localeCompare`), with
 *   no duplicate month entries
 *
 * Filtering (by employer / time range) stays at the caller level — this
 * function aggregates whatever salaries array it is given.
 *
 * @param salaries the (already-filtered) salaries to aggregate
 */
export function aggregateSalariesByMonth(salaries: Salary[]): MonthlySalary[] {
  const map = new Map<string, MonthlySalary>()
  for (const s of salaries) {
    const existing = map.get(s.month)
    if (existing) {
      existing.bruto += s.bruto
      existing.neto += s.neto
    } else {
      map.set(s.month, { month: s.month, bruto: s.bruto, neto: s.neto })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * Compute raw salary totals and plain averages from a salaries array.
 *
 * Mirrors how the client `SalaryChartsPage` derives its figures:
 * - `totalBruto` / `totalNeto` are summed across the given salaries
 * - `monthCount` is the number of distinct months (the length of the
 *   aggregated-by-month result)
 * - averages are `total / monthCount`, guarded against zero months so no
 *   division by zero ever occurs
 *
 * The averaging mode (average vs. sum) and any ILS formatting stay at the UI
 * layer — this pure function returns raw numbers only.
 *
 * @param salaries the (already-filtered) salaries to total
 */
export function computeSalaryTotals(salaries: Salary[]): SalaryTotals {
  const byMonth = aggregateSalariesByMonth(salaries)
  const monthCount = byMonth.length

  const totalBruto = salaries.reduce((sum, s) => sum + s.bruto, 0)
  const totalNeto = salaries.reduce((sum, s) => sum + s.neto, 0)
  const totalDeductions = totalBruto - totalNeto

  // Zero-month guard: never divide by zero — return zeroed averages instead.
  const avgBruto = monthCount ? totalBruto / monthCount : 0
  const avgNeto = monthCount ? totalNeto / monthCount : 0
  const avgDeductions = monthCount ? totalDeductions / monthCount : 0

  return {
    totalBruto,
    totalNeto,
    totalDeductions,
    monthCount,
    avgBruto,
    avgNeto,
    avgDeductions,
  }
}
