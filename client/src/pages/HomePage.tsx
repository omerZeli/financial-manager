import { useEffect, useMemo, useState } from 'react'
import { useSalary } from '../contexts/SalaryContext'
import { useExpenses } from '../contexts/ExpensesContext'
import { useFixedExpenses } from '../contexts/FixedExpensesContext'
import { usePaybacks } from '../contexts/PaybacksContext'
import { useInvestmentChannels } from '../contexts/InvestmentChannelsContext'
import { useInvestmentDeposits } from '../contexts/InvestmentDepositsContext'
import { useInvestmentValues } from '../contexts/InvestmentValuesContext'
import { computeChannelSummary, CASH_PATH_LABEL } from '../lib/computeChannelSummary'
import { ChartFilterPopover } from '../components/common/ChartFilterPopover'
import DateInput from '../components/common/DatePicker'
import { formatLocalDate } from '../lib/dateUtils'
import './HomePage.css'
import './Section.css'

function formatCurrency(n: number) {
  return n.toLocaleString('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 })
}

type TimeRange = 'last1' | 'last12' | 'all' | 'custom'
type InvestmentFilter = 'all' | 'pension' | 'noPension'
type SalaryFilter = 'neto' | 'bruto'
type ExpenseFilter = 'all' | 'regular' | 'fixed'

export function HomePage() {
  const { salaries, loading: salLoading, fetchSalaries } = useSalary()
  const { expenses, loading: expLoading, fetchExpenses } = useExpenses()
  const { fixedExpenses, inflatedExpenses, loading: fixLoading, fetchFixedExpenses } = useFixedExpenses()
  const { paybacks, loading: pbLoading, fetchPaybacks } = usePaybacks()
  const { channels, loading: chLoading, fetchChannels } = useInvestmentChannels()
  const { deposits, loading: depLoading, fetchDeposits } = useInvestmentDeposits()
  const { valueUpdates, loading: valLoading, fetchValueUpdates } = useInvestmentValues()

  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [excludeCurrentMonth, setExcludeCurrentMonth] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [investmentFilter, setInvestmentFilter] = useState<InvestmentFilter>('all')
  const [salaryFilter, setSalaryFilter] = useState<SalaryFilter>('neto')
  const [expenseFilter, setExpenseFilter] = useState<ExpenseFilter>('all')

  useEffect(() => { fetchSalaries() }, [fetchSalaries])
  useEffect(() => { fetchExpenses() }, [fetchExpenses])
  useEffect(() => { fetchFixedExpenses() }, [fetchFixedExpenses])
  useEffect(() => { fetchPaybacks() }, [fetchPaybacks])
  useEffect(() => { fetchChannels() }, [fetchChannels])
  useEffect(() => { fetchDeposits() }, [fetchDeposits])
  useEffect(() => { fetchValueUpdates() }, [fetchValueUpdates])

  // Compute effective date range (same logic as expenses chart page)
  const effectiveDateRange = useMemo(() => {
    if (timeRange === 'all') {
      return { minDate: '0000-01-01', maxDate: '9999-12-31' }
    }
    if (timeRange === 'custom') {
      return { minDate: customFrom || '0000-01-01', maxDate: customTo || '9999-12-31' }
    }
    const now = new Date()
    const months = timeRange === 'last1' ? 1 : 12
    const lastYear = excludeCurrentMonth
      ? (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear())
      : now.getFullYear()
    const lastMonth = excludeCurrentMonth
      ? (now.getMonth() === 0 ? 11 : now.getMonth() - 1)
      : now.getMonth()
    const endOfLast = new Date(lastYear, lastMonth + 1, 0)
    const maxDate = formatLocalDate(endOfLast)
    const from = new Date(lastYear, lastMonth - months + 1, 1)
    const minDate = formatLocalDate(from)
    return { minDate, maxDate }
  }, [timeRange, excludeCurrentMonth, customFrom, customTo])

  // --- Investments: total current value ---
  // Investment value is always a point-in-time snapshot — the time filter
  // does NOT affect it. Only the pension/noPension card filter applies.
  const totalInvestmentValue = useMemo(() => {
    let filtered = channels
    if (investmentFilter === 'pension') filtered = filtered.filter(ch => ch.is_pension)
    else if (investmentFilter === 'noPension') filtered = filtered.filter(ch => !ch.is_pension)

    let total = 0
    for (const ch of filtered) {
      const isCash = ch.investment_path === CASH_PATH_LABEL
      const summary = computeChannelSummary(ch.id, deposits, valueUpdates, isCash)
      total += summary.currentValue
    }
    return total
  }, [channels, deposits, valueUpdates, investmentFilter])

  // --- Salary: average monthly ---
  // Salary month field is the work month; you receive it the following month.
  // So we shift the filter range back by 1 month to match the salary records.
  const salaryDateRange = useMemo(() => {
    if (timeRange === 'all') {
      return { minDate: '0000-01-01', maxDate: '9999-12-31' }
    }
    if (timeRange === 'custom') {
      // Shift custom dates back by 1 month
      const shiftBack = (dateStr: string) => {
        if (!dateStr) return ''
        const d = new Date(dateStr + 'T00:00:00')
        d.setMonth(d.getMonth() - 1)
        return formatLocalDate(d)
      }
      return {
        minDate: customFrom ? shiftBack(customFrom) : '0000-01-01',
        maxDate: customTo ? shiftBack(customTo) : '9999-12-31',
      }
    }
    const now = new Date()
    const months = timeRange === 'last1' ? 1 : 12
    const lastYear = excludeCurrentMonth
      ? (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear())
      : now.getFullYear()
    const lastMonth = excludeCurrentMonth
      ? (now.getMonth() === 0 ? 11 : now.getMonth() - 1)
      : now.getMonth()
    // Shift back by 1 month for salary
    const salLastMonth = lastMonth === 0 ? 11 : lastMonth - 1
    const salLastYear = lastMonth === 0 ? lastYear - 1 : lastYear
    const endOfLast = new Date(salLastYear, salLastMonth + 1, 0)
    const maxDate = formatLocalDate(endOfLast)
    const from = new Date(salLastYear, salLastMonth - months + 1, 1)
    const minDate = formatLocalDate(from)
    return { minDate, maxDate }
  }, [timeRange, excludeCurrentMonth, customFrom, customTo])

  const avgSalary = useMemo(() => {
    const filtered = salaries.filter(s => s.month >= salaryDateRange.minDate && s.month <= salaryDateRange.maxDate)
    if (filtered.length === 0) return 0
    const field = salaryFilter === 'bruto' ? 'bruto' : 'neto'
    const total = filtered.reduce((sum, s) => sum + s[field], 0)
    return total / filtered.length
  }, [salaries, salaryFilter, salaryDateRange])

  // --- Expenses: average monthly ---
  const avgMonthlyExpenses = useMemo(() => {
    const toMeByExpense: Record<string, number> = {}
    for (const pb of paybacks) {
      if (pb.direction === 'to_me' && pb.expense_id) {
        toMeByExpense[pb.expense_id] = (toMeByExpense[pb.expense_id] || 0) + pb.amount
      }
    }

    const byMeExpenses = paybacks
      .filter(pb => pb.direction === 'by_me')
      .map(pb => ({ amount: pb.amount, date: pb.date }))

    let items: { amount: number; date: string }[] = []

    if (expenseFilter === 'regular' || expenseFilter === 'all') {
      const adjusted = expenses.map(exp => ({
        amount: exp.amount - (toMeByExpense[exp.id] || 0),
        date: exp.date,
      }))
      items = [...items, ...adjusted, ...byMeExpenses]
    }

    if (expenseFilter === 'fixed' || expenseFilter === 'all') {
      items = [...items, ...inflatedExpenses.map(ie => ({ amount: ie.amount, date: ie.date }))]
    }

    // Apply time filter
    if (timeRange !== 'all') {
      items = items.filter(i => i.date >= effectiveDateRange.minDate && i.date <= effectiveDateRange.maxDate)
    }

    if (items.length === 0) return 0

    const months = new Set(items.map(i => i.date.slice(0, 7)))
    const total = items.reduce((sum, i) => sum + i.amount, 0)
    return months.size > 0 ? total / months.size : 0
  }, [expenses, inflatedExpenses, paybacks, expenseFilter, timeRange, effectiveDateRange])

  const anyLoading = salLoading || expLoading || fixLoading || pbLoading || chLoading || depLoading || valLoading

  const hasActiveFilters = useMemo(() => {
    if (timeRange !== 'all') return true
    if (excludeCurrentMonth) return true
    if (customFrom || customTo) return true
    return false
  }, [timeRange, excludeCurrentMonth, customFrom, customTo])

  const clearFilters = () => {
    setTimeRange('all')
    setExcludeCurrentMonth(false)
    setCustomFrom('')
    setCustomTo('')
  }

  return (
    <div className="home-page">
      <div className="section-header">
        <h1>דשבורד</h1>
        <div className="section-header-actions">
          {!anyLoading && (
            <ChartFilterPopover hasActive={hasActiveFilters} onClear={clearFilters}>
              <div className="filter-popover-field">
                <div className="filter-popover-label">טווח זמן</div>
                <div className="filter-tabs">
                  <button type="button" className={`filter-tab${timeRange === 'last1' ? ' active' : ''}`} onClick={() => setTimeRange('last1')}>חודש אחרון</button>
                  <button type="button" className={`filter-tab${timeRange === 'last12' ? ' active' : ''}`} onClick={() => setTimeRange('last12')}>שנה</button>
                  <button type="button" className={`filter-tab${timeRange === 'all' ? ' active' : ''}`} onClick={() => setTimeRange('all')}>הכל</button>
                  <button type="button" className={`filter-tab${timeRange === 'custom' ? ' active' : ''}`} onClick={() => setTimeRange('custom')}>מותאם</button>
                </div>
              </div>
              {timeRange === 'custom' && (
                <div className="filter-popover-field">
                  <div className="filter-popover-label">טווח מותאם</div>
                  <div className="custom-range-row">
                    <DateInput value={customFrom} onChange={setCustomFrom} placeholder="מתאריך" />
                    <span className="range-sep">-</span>
                    <DateInput value={customTo} onChange={setCustomTo} placeholder="עד תאריך" />
                  </div>
                </div>
              )}
              {timeRange !== 'custom' && (
                <div className="filter-popover-field">
                  <div className="toggle-row">
                    <span className="toggle-label">לא כולל החודש הנוכחי</span>
                    <button
                      type="button"
                      className={`toggle-switch${excludeCurrentMonth ? ' active' : ''}`}
                      onClick={() => setExcludeCurrentMonth(prev => !prev)}
                    >
                      <span className="toggle-knob" />
                    </button>
                  </div>
                </div>
              )}
            </ChartFilterPopover>
          )}
        </div>
      </div>

      <div className="home-cards">
        {/* Investments card */}
        <div className="home-card">
          <div className="home-card-info">
            <span className="home-card-label">שווי השקעות</span>
            {chLoading || depLoading || valLoading
              ? <span className="home-card-loading">טוען...</span>
              : <span className="home-card-value">{formatCurrency(totalInvestmentValue)}</span>
            }
          </div>
          <div className="home-card-filter">
            <button
              className={`home-card-filter-btn${investmentFilter === 'all' ? ' active' : ''}`}
              onClick={() => setInvestmentFilter('all')}
            >הכל</button>
            <button
              className={`home-card-filter-btn${investmentFilter === 'noPension' ? ' active' : ''}`}
              onClick={() => setInvestmentFilter('noPension')}
            >לא פנסיוני</button>
            <button
              className={`home-card-filter-btn${investmentFilter === 'pension' ? ' active' : ''}`}
              onClick={() => setInvestmentFilter('pension')}
            >פנסיוני</button>
          </div>
        </div>

        {/* Salary card */}
        <div className="home-card">
          <div className="home-card-info">
            <span className="home-card-label">משכורת ממוצעת</span>
            {salLoading
              ? <span className="home-card-loading">טוען...</span>
              : <span className="home-card-value">{formatCurrency(avgSalary)}</span>
            }
          </div>
          <div className="home-card-filter">
            <button
              className={`home-card-filter-btn${salaryFilter === 'neto' ? ' active' : ''}`}
              onClick={() => setSalaryFilter('neto')}
            >נטו</button>
            <button
              className={`home-card-filter-btn${salaryFilter === 'bruto' ? ' active' : ''}`}
              onClick={() => setSalaryFilter('bruto')}
            >ברוטו</button>
          </div>
        </div>

        {/* Expenses card */}
        <div className="home-card">
          <div className="home-card-info">
            <span className="home-card-label">הוצאות חודשיות ממוצעות</span>
            {expLoading || fixLoading || pbLoading
              ? <span className="home-card-loading">טוען...</span>
              : <span className="home-card-value">{formatCurrency(avgMonthlyExpenses)}</span>
            }
          </div>
          <div className="home-card-filter">
            <button
              className={`home-card-filter-btn${expenseFilter === 'all' ? ' active' : ''}`}
              onClick={() => setExpenseFilter('all')}
            >הכל</button>
            <button
              className={`home-card-filter-btn${expenseFilter === 'regular' ? ' active' : ''}`}
              onClick={() => setExpenseFilter('regular')}
            >רגילות</button>
            <button
              className={`home-card-filter-btn${expenseFilter === 'fixed' ? ' active' : ''}`}
              onClick={() => setExpenseFilter('fixed')}
            >קבועות</button>
          </div>
        </div>
      </div>
    </div>
  )
}
