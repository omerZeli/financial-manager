import type { Expense, FixedExpense, Payback, Salary } from './types'
import { formatLocalDate, todayStr, getEffectiveDate } from './dateUtils'

/**
 * Expand a fixed expense into one virtual {@link Expense} per month from its
 * `start_date` to `min(end_date, today)` (the inflation limit).
 *
 * Ported verbatim from the client `inflateFixed` helper (FixedExpensesContext)
 * to preserve exact semantics (behavioral-parity guarantee):
 * - one row per calendar month in `[start_date, limit]`
 * - the day is clamped to the last day of each generated row's own month
 *   (e.g. a start day of 31 becomes 28/29/30 in shorter months)
 * - each row gets a synthetic id of the form `{fixedExpenseId}_{YYYY-MM-DD}`
 * - the limit is `end_date` when it is non-null and earlier than today,
 *   otherwise today
 *
 * @param fe    the fixed expense definition
 * @param today optional override for "today" (YYYY-MM-DD); defaults to todayStr()
 */
export function inflateFixedExpense(fe: FixedExpense, today?: string): Expense[] {
  const results: Expense[] = []
  const start = new Date(fe.start_date + 'T00:00:00')
  const today_ = today ?? todayStr()
  const limitStr = fe.end_date && fe.end_date < today_ ? fe.end_date : today_
  const limit = new Date(limitStr + 'T00:00:00')

  const originalDay = start.getDate()
  let year = start.getFullYear()
  let month = start.getMonth() // 0-indexed

  while (true) {
    // Clamp day to the last day of the current month
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const day = Math.min(originalDay, daysInMonth)

    const cursor = new Date(year, month, day)
    if (cursor > limit) break

    const yyyy = cursor.getFullYear()
    const mm = String(cursor.getMonth() + 1).padStart(2, '0')
    const dd = String(cursor.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd}`

    results.push({
      id: `${fe.id}_${dateStr}`,
      user_id: fe.user_id,
      name: fe.name,
      category: fe.category,
      amount: fe.amount,
      date: dateStr,
      salary_id: null,
      created_at: fe.created_at,
    })

    // advance to next month
    month++
    if (month > 11) {
      month = 0
      year++
    }
  }

  return results
}

/**
 * A merged "all-expenses" row: a real expense, an inflated fixed-expense row,
 * or a `by_me` payback represented as a virtual expense. The leading `_` fields
 * are UI/analysis annotations carried alongside the row.
 */
export interface AllExpenseRow extends Expense {
  /** Original (pre-payback-reduction) amount, when the row was reduced. */
  _originalAmount?: number
  /** Sum of `to_me` paybacks subtracted from this row. */
  _returnedAmount?: number
  /** Person name, set for `by_me` virtual payback rows. */
  _paybackPerson?: string
  /** True for inflated fixed-expense rows (used by charts). */
  _fixed?: boolean
  /** True when the row is deducted from a salary (regular link or fixed employer). */
  _salaryDeducted?: boolean
  /** The salary id used for effective-date attribution (regular expenses). */
  _effectiveSalaryId?: string | null
  /** True for inflated rows whose source fixed expense is salary-deducted. */
  _salaryDeductedFixed?: boolean
}

/**
 * Merge real expenses, inflated fixed-expense rows, and `by_me` paybacks into a
 * single list, reducing amounts by `to_me` paybacks in all three directions and
 * annotating effective-date / fixed / salary-deduction metadata.
 *
 * Ported verbatim from the duplicated inline chains in `ExpensesTablePage` and
 * `ExpensesChartsPage` (the two were behaviorally identical; the charts variant
 * additionally produced `_fixed` / `_salaryDeducted*` / `_effectiveSalaryId`,
 * which are included here so both pages can consume one function).
 *
 * Reduction directions:
 * 1. `to_me` → regular expense: subtract the summed payback from that expense.
 * 2. `to_me` → fixed expense: subtract each payback from the last inflated row
 *    dated on/before the payback date (cumulative).
 * 3. `to_me` → `by_me` payback: subtract the summed payback from the virtual
 *    `by_me` row.
 *
 * Zero-amount real and inflated rows are dropped; `by_me` rows whose adjusted
 * amount is 0 are dropped. The merged result is sorted by date descending.
 */
export function computeAllExpenses(input: {
  expenses: Expense[]
  inflatedExpenses: Expense[]
  paybacks: Payback[]
  fixedExpenses: FixedExpense[]
  salaries: Salary[]
}): AllExpenseRow[] {
  const { expenses, inflatedExpenses, paybacks, fixedExpenses } = input

  // 1. Index to_me paybacks by the thing they reduce.
  const toMeByExpense: Record<string, number> = {}
  const toMeByFixed: Record<string, { total: number; items: { amount: number; date: string }[] }> = {}
  const toMeByPayback: Record<string, number> = {}
  for (const pb of paybacks) {
    if (pb.direction !== 'to_me') continue
    if (pb.expense_id) {
      toMeByExpense[pb.expense_id] = (toMeByExpense[pb.expense_id] || 0) + pb.amount
    }
    if (pb.fixed_expense_id) {
      if (!toMeByFixed[pb.fixed_expense_id]) toMeByFixed[pb.fixed_expense_id] = { total: 0, items: [] }
      toMeByFixed[pb.fixed_expense_id].total += pb.amount
      toMeByFixed[pb.fixed_expense_id].items.push({ amount: pb.amount, date: pb.date })
    }
    if (pb.payback_id) {
      toMeByPayback[pb.payback_id] = (toMeByPayback[pb.payback_id] || 0) + pb.amount
    }
  }

  // Set of fixed expense IDs that are salary-deducted (for the _salaryDeductedFixed flag).
  const salaryDeductedFixedIds = new Set(
    fixedExpenses.filter(fe => fe.salary_employer).map(fe => fe.id)
  )

  // 2. Regular expenses reduced by their to_me paybacks.
  const adjusted: AllExpenseRow[] = expenses.map(exp => {
    const returned = toMeByExpense[exp.id] || 0
    return {
      ...exp,
      amount: exp.amount - returned,
      _originalAmount: exp.amount,
      _returnedAmount: returned,
      _paybackPerson: undefined,
      _fixed: false,
      _salaryDeducted: !!exp.salary_id,
      _effectiveSalaryId: exp.salary_id,
      _salaryDeductedFixed: false,
    }
  })

  // 3. Inflated rows; reduce the LAST inflated entry on/before each fixed-linked payback date.
  const inflated: AllExpenseRow[] = inflatedExpenses.map(ie => {
    const fixedId = ie.id.substring(0, ie.id.lastIndexOf('_'))
    const isSalaryDeducted = salaryDeductedFixedIds.has(fixedId)
    return {
      ...ie,
      _originalAmount: undefined,
      _returnedAmount: undefined,
      _paybackPerson: undefined,
      _fixed: true,
      _salaryDeducted: isSalaryDeducted,
      _effectiveSalaryId: null,
      _salaryDeductedFixed: isSalaryDeducted,
    }
  })

  for (const [fixedId, data] of Object.entries(toMeByFixed)) {
    for (const pb of data.items) {
      const candidates = inflated
        .filter(ie => ie.id.startsWith(fixedId + '_') && ie.date <= pb.date)
        .sort((a, b) => b.date.localeCompare(a.date))
      if (candidates.length > 0) {
        const target = candidates[0]
        if (!target._originalAmount) {
          target._originalAmount = target.amount
          target._returnedAmount = 0
        }
        target._returnedAmount = (target._returnedAmount || 0) + pb.amount
        target.amount -= pb.amount
      }
    }
  }

  // 4. by_me paybacks as virtual rows, reduced by to_me paybacks linked to them.
  const byMe: AllExpenseRow[] = paybacks
    .filter(pb => pb.direction === 'by_me')
    .map(pb => {
      const returned = toMeByPayback[pb.id] || 0
      return {
        id: `payback_${pb.id}`,
        user_id: pb.user_id,
        name: pb.name || '',
        category: pb.category || '',
        amount: pb.amount - returned,
        date: pb.date,
        salary_id: null,
        created_at: pb.created_at,
        _originalAmount: undefined,
        _returnedAmount: undefined,
        _paybackPerson: pb.person,
        _fixed: false,
        _salaryDeducted: false,
        _effectiveSalaryId: null,
        _salaryDeductedFixed: false,
      }
    })
    .filter(e => e.amount !== 0)

  // 5. Merge (dropping zero-amount real + inflated rows) and sort by date DESC.
  const merged = [
    ...adjusted.filter(e => e.amount !== 0),
    ...inflated.filter(e => e.amount !== 0),
    ...byMe,
  ]
  return merged.sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * Resolve the effective date used for range filtering and monthly bucketing of
 * an all-expenses row, mirroring the charts page's `effectiveDate` logic:
 * - a regular expense linked to a salary is attributed to that salary's month
 * - an inflated fixed expense deducted from salary is attributed to the
 *   previous month
 * - otherwise the row's own date is used
 */
function effectiveDateOf(row: AllExpenseRow, salaryMonthMap: Map<string, string>): string {
  if (row._effectiveSalaryId) {
    return getEffectiveDate(row.date, row._effectiveSalaryId, salaryMonthMap)
  }
  if (row._salaryDeductedFixed) {
    const dt = new Date(row.date + 'T00:00:00')
    dt.setMonth(dt.getMonth() - 1)
    return formatLocalDate(dt)
  }
  return row.date
}

export interface ExpenseSummary {
  /** Sum of all (payback-adjusted) amounts in range. */
  total: number
  /** Per-category totals, sorted descending by total. */
  byCategory: Array<{ category: string; total: number }>
  /** Per-month (YYYY-MM) totals, sorted ascending by month. */
  byMonth: Array<{ month: string; total: number }>
  /** Total of inflated fixed-expense rows. */
  fixedTotal: number
  /** Total of everything else (regular + by_me). */
  nonFixedTotal: number
}

/**
 * Summarize an all-expenses list (as produced by {@link computeAllExpenses}).
 * Effective-date attribution is applied before range filtering and monthly
 * bucketing — salary-linked rows roll into their salary month and salary-
 * deducted inflated rows roll into the previous month.
 *
 * @param allExpenses rows from computeAllExpenses
 * @param salaries    salary rows, used to build the salary → month map
 * @param dateFrom    optional inclusive lower bound (YYYY-MM-DD) on effective date
 * @param dateTo      optional inclusive upper bound (YYYY-MM-DD) on effective date
 * @param categories  optional category allow-list
 */
export function computeExpenseSummary(input: {
  allExpenses: AllExpenseRow[]
  salaries: Salary[]
  dateFrom?: string
  dateTo?: string
  categories?: string[]
}): ExpenseSummary {
  const { allExpenses, salaries, dateFrom, dateTo, categories } = input

  const salaryMonthMap = new Map<string, string>()
  for (const s of salaries) salaryMonthMap.set(s.id, s.month)

  const categorySet = categories && categories.length > 0 ? new Set(categories) : null

  let total = 0
  let fixedTotal = 0
  const byCategoryMap: Record<string, number> = {}
  const byMonthMap: Record<string, number> = {}

  for (const row of allExpenses) {
    if (categorySet && !categorySet.has(row.category)) continue
    const eff = effectiveDateOf(row, salaryMonthMap)
    if (dateFrom && eff < dateFrom) continue
    if (dateTo && eff > dateTo) continue

    total += row.amount
    if (row._fixed) fixedTotal += row.amount
    byCategoryMap[row.category] = (byCategoryMap[row.category] || 0) + row.amount
    const monthKey = eff.slice(0, 7)
    byMonthMap[monthKey] = (byMonthMap[monthKey] || 0) + row.amount
  }

  const byCategory = Object.entries(byCategoryMap)
    .map(([category, catTotal]) => ({ category, total: catTotal }))
    .sort((a, b) => b.total - a.total)

  const byMonth = Object.entries(byMonthMap)
    .map(([month, monthTotal]) => ({ month, total: monthTotal }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return {
    total,
    byCategory,
    byMonth,
    fixedTotal,
    nonFixedTotal: total - fixedTotal,
  }
}
