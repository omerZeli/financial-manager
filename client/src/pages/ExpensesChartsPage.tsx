import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useExpenses } from '../contexts/ExpensesContext'
import { useFixedExpenses } from '../contexts/FixedExpensesContext'
import { usePaybacks } from '../contexts/PaybacksContext'
import { useExpenseTypes } from '../contexts/ExpenseTypesContext'
import { useSalary } from '../contexts/SalaryContext'
import { ReadOnlySelect } from '../components/common/ReadOnlySelect'
import DateInput from '../components/common/DateInput'
import './Section.css'

function formatCurrency(n: number) {
  return n.toLocaleString('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 })
}

function formatMonth(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' })
}

const CATEGORY_COLORS = [
  'var(--accent)',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#65a30d',
]

type TimeRange = 'last1' | 'last6' | 'last12' | 'custom'
type AggMode = 'avg' | 'sum'

function getMinDate(range: TimeRange, customFrom: string): string {
  if (range === 'custom') return customFrom
  const now = new Date()
  const months = range === 'last1' ? 1 : range === 'last6' ? 6 : 12
  now.setMonth(now.getMonth() - months)
  return now.toISOString().slice(0, 10)
}

export function ExpensesChartsPage() {
  const { expenses, loading, fetchExpenses } = useExpenses()
  const { fixedExpenses, inflatedExpenses, loading: fixedLoading, fetchFixedExpenses } = useFixedExpenses()
  const { paybacks, loading: paybacksLoading, fetchPaybacks } = usePaybacks()
  const { expenseTypes, fetchExpenseTypes } = useExpenseTypes()
  const { salaries, fetchSalaries } = useSalary()

  const [timeRange, setTimeRange] = useState<TimeRange>('last12')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [expenseType, setExpenseType] = useState('')
  const [aggMode, setAggMode] = useState<AggMode>('sum')

  useEffect(() => { fetchExpenses() }, [fetchExpenses])
  useEffect(() => { fetchFixedExpenses() }, [fetchFixedExpenses])
  useEffect(() => { fetchPaybacks() }, [fetchPaybacks])
  useEffect(() => { fetchExpenseTypes() }, [fetchExpenseTypes])
  useEffect(() => { fetchSalaries() }, [fetchSalaries])

  // Build to_me payback totals per expense_id
  const toMeByExpense = useMemo(() => {
    const map: Record<string, number> = {}
    for (const pb of paybacks) {
      if (pb.direction === 'to_me' && pb.expense_id) {
        map[pb.expense_id] = (map[pb.expense_id] || 0) + pb.amount
      }
    }
    return map
  }, [paybacks])

  // by_me paybacks as virtual expense entries
  const byMeExpenses = useMemo(() => {
    return paybacks
      .filter(pb => pb.direction === 'by_me')
      .map(pb => ({
        id: `payback_${pb.id}`,
        user_id: pb.user_id,
        name: pb.name || '',
        category: pb.category || '',
        amount: pb.amount,
        date: pb.date,
        created_at: pb.created_at,
        _salaryDeducted: false,
        _fixed: false,
      }))
  }, [paybacks])

  // Set of fixed expense IDs that are salary-deducted
  const salaryDeductedFixedIds = useMemo(() => {
    return new Set(fixedExpenses.filter(fe => fe.salary_employer).map(fe => fe.id))
  }, [fixedExpenses])

  const allExpensesRaw = useMemo(() => {
    const adjusted = expenses.map(exp => {
      const returned = toMeByExpense[exp.id] || 0
      return { ...exp, amount: exp.amount - returned, _salaryDeducted: !!exp.salary_id, _fixed: false }
    })
    const inflated = inflatedExpenses.map(ie => {
      const fixedId = ie.id.substring(0, ie.id.lastIndexOf('_'))
      return { ...ie, _salaryDeducted: salaryDeductedFixedIds.has(fixedId), _fixed: true }
    })
    return [...adjusted, ...inflated, ...byMeExpenses]
  }, [expenses, inflatedExpenses, byMeExpenses, toMeByExpense, salaryDeductedFixedIds])

  // Expense type options for filter
  const typeOptions = useMemo(() => [
    { value: '', label: 'הכל' },
    ...expenseTypes.map(et => ({ value: et.id, label: et.type_name })),
  ], [expenseTypes])

  // Categories for selected expense type
  const selectedTypeCategories = useMemo(() => {
    if (!expenseType) return null
    const et = expenseTypes.find(t => t.id === expenseType)
    return et ? new Set(et.categories) : null
  }, [expenseType, expenseTypes])

  // Filtered expenses
  const filtered = useMemo(() => {
    let list = allExpensesRaw
    // expense type filter
    if (selectedTypeCategories) {
      list = list.filter(e => selectedTypeCategories.has(e.category))
    }
    // time range filter
    const minDate = getMinDate(timeRange, customFrom)
    const maxDate = timeRange === 'custom' && customTo ? customTo : '9999-12-31'
    list = list.filter(e => e.date >= minDate && e.date <= maxDate)
    return list
  }, [allExpensesRaw, selectedTypeCategories, timeRange, customFrom, customTo])

  const aggLabel = aggMode === 'avg' ? 'ממוצע' : 'סה"כ'

  // Monthly totals for aggregation
  const byMonth = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of filtered) {
      const key = e.date.slice(0, 7)
      map[key] = (map[key] || 0) + e.amount
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  const monthCount = byMonth.length
  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0)
  const aggTotal = monthCount ? (aggMode === 'avg' ? totalAmount / monthCount : totalAmount) : 0

  // Split fixed vs non-fixed
  const fixedTotal = filtered.filter(e => e._fixed).reduce((s, e) => s + e.amount, 0)
  const nonFixedTotal = totalAmount - fixedTotal
  const aggFixed = monthCount ? (aggMode === 'avg' ? fixedTotal / monthCount : fixedTotal) : 0
  const aggNonFixed = monthCount ? (aggMode === 'avg' ? nonFixedTotal / monthCount : nonFixedTotal) : 0

  // Non-salary-deducted expenses total (for % of neto calc)
  const nonDeductedTotal = filtered.filter(e => !e._salaryDeducted).reduce((s, e) => s + e.amount, 0)

  // Total neto in the same time range
  const totalNetoInRange = useMemo(() => {
    const minDate = getMinDate(timeRange, customFrom)
    const maxDate = timeRange === 'custom' && customTo ? customTo : '9999-12-31'
    return salaries
      .filter(s => s.month >= minDate && s.month <= maxDate)
      .reduce((s, r) => s + r.neto, 0)
  }, [salaries, timeRange, customFrom, customTo])

  const pctOfNeto = totalNetoInRange > 0 ? (nonDeductedTotal / totalNetoInRange) * 100 : 0

  // Group by category
  const byCategory = filtered.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {})
  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  const maxCategory = categories.length ? categories[0][1] : 1

  const maxMonth = byMonth.reduce((m, [, v]) => Math.max(m, v), 0) || 1

  return (
    <div className="section-page">
      <div className="section-header">
        <h1>הוצאות</h1>
        <div className="section-tabs">
          <NavLink to="/expenses" end className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
            טבלה
          </NavLink>
          <NavLink to="/expenses/charts" className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
            גרפים
          </NavLink>
        </div>
      </div>

      {(loading || fixedLoading || paybacksLoading) ? (
        <div className="section-empty">טוען...</div>
      ) : allExpensesRaw.length === 0 ? (
        <div className="section-empty">אין נתונים להצגה. הוסף הוצאות בטבלה.</div>
      ) : (
        <div className="charts-grid">
          {/* Filters */}
          <div className="charts-filters">
            <div className="filter-group">
              <label className="filter-label">תצוגה</label>
              <div className="filter-tabs">
                <button type="button" className={`filter-tab${aggMode === 'avg' ? ' active' : ''}`} onClick={() => setAggMode('avg')}>ממוצע חודשי</button>
                <button type="button" className={`filter-tab${aggMode === 'sum' ? ' active' : ''}`} onClick={() => setAggMode('sum')}>סכום</button>
              </div>
            </div>
            <div className="filter-group">
              <label className="filter-label">סוג הוצאה</label>
              <ReadOnlySelect
                options={typeOptions}
                value={expenseType}
                placeholder="הכל"
                onChange={setExpenseType}
              />
            </div>
            <div className="filter-group">
              <label className="filter-label">טווח זמן</label>
              <div className="filter-tabs">
                <button type="button" className={`filter-tab${timeRange === 'last1' ? ' active' : ''}`} onClick={() => setTimeRange('last1')}>חודש אחרון</button>
                <button type="button" className={`filter-tab${timeRange === 'last6' ? ' active' : ''}`} onClick={() => setTimeRange('last6')}>6 חודשים</button>
                <button type="button" className={`filter-tab${timeRange === 'last12' ? ' active' : ''}`} onClick={() => setTimeRange('last12')}>שנה</button>
                <button type="button" className={`filter-tab${timeRange === 'custom' ? ' active' : ''}`} onClick={() => setTimeRange('custom')}>מותאם</button>
              </div>
            </div>
            {timeRange === 'custom' && (
              <div className="custom-range-field">
                <label className="filter-label">מתאריך</label>
                <DateInput value={customFrom} onChange={setCustomFrom} placeholder="מתאריך" />
              </div>
            )}
            {timeRange === 'custom' && (
              <div className="custom-range-field">
                <label className="filter-label">עד תאריך</label>
                <DateInput value={customTo} onChange={setCustomTo} placeholder="עד תאריך" />
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="section-empty">אין נתונים בטווח שנבחר.</div>
          ) : (
            <>
              <div className="summary-row">
                <div className="summary-card">
                  <div className="label">{aggLabel} הוצאות</div>
                  <div className="value">{formatCurrency(aggTotal)}</div>
                </div>
                <div className="summary-card">
                  <div className="label">{aggLabel} הוצאות רגילות</div>
                  <div className="value">{formatCurrency(aggNonFixed)}</div>
                </div>
                <div className="summary-card">
                  <div className="label">{aggLabel} הוצאות קבועות</div>
                  <div className="value">{formatCurrency(aggFixed)}</div>
                </div>
                <div className="summary-card">
                  <div className="label">אחוז מהנטו</div>
                  <div className="value">{pctOfNeto.toFixed(1)}%</div>
                </div>
              </div>

              <div className="chart-card">
                <h3>הוצאות חודשיות</h3>
                <div className="bar-chart">
                  {byMonth.map(([m, total]) => (
                    <div className="bar-group" key={m}>
                      <div className="bar-pair">
                        <div
                          className="bar expense-bar"
                          style={{ height: `${(total / maxMonth) * 100}%` }}
                        >
                          <span className="bar-value">{total.toLocaleString('he-IL')}</span>
                        </div>
                      </div>
                      <span className="bar-label">{formatMonth(m + '-01')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="chart-card">
                <h3>הוצאות לפי קטגוריה</h3>
                <div className="h-bar-chart">
                  {categories.map(([cat, total], i) => (
                    <div className="h-bar-row" key={cat}>
                      <span className="h-bar-label">{cat}</span>
                      <div className="h-bar-track">
                        <div
                          className="h-bar-fill"
                          style={{
                            width: `${(total / maxCategory) * 100}%`,
                            background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                          }}
                        >
                          <span className="h-bar-pct">{((total / totalAmount) * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                      <span className="h-bar-value">{formatCurrency(total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
