import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useSalary } from '../contexts/SalaryContext'
import { useInvestmentDeposits } from '../contexts/InvestmentDepositsContext'
import { useExpenses } from '../contexts/ExpensesContext'
import { useFixedExpenses } from '../contexts/FixedExpensesContext'
import DateInput from '../components/common/DatePicker'
import { FilterMultiSelect } from '../components/common/FilterMultiSelect'
import { ChartFilterPopover } from '../components/common/ChartFilterPopover'
import { formatLocalDate } from '../lib/dateUtils'
import './Section.css'

function formatCurrency(n: number) {
  return n.toLocaleString('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 })
}

function formatMonth(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' })
}

type TimeRange = 'last1' | 'last6' | 'last12' | 'custom'
type AggMode = 'avg' | 'sum'

function getMinMonth(range: TimeRange, customFrom: string): string {
  if (range === 'custom') return customFrom
  const now = new Date()
  const months = range === 'last1' ? 1 : range === 'last6' ? 6 : 12
  now.setMonth(now.getMonth() - months)
  now.setDate(1)
  return formatLocalDate(now)
}

export function SalaryChartsPage() {
  const { salaries, loading, fetchSalaries } = useSalary()
  const { deposits, loading: depLoading, fetchDeposits } = useInvestmentDeposits()
  const { expenses, loading: expLoading, fetchExpenses } = useExpenses()
  const { fixedExpenses, loading: fixLoading, fetchFixedExpenses } = useFixedExpenses()

  const [timeRange, setTimeRange] = useState<TimeRange>('last12')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selectedEmployers, setSelectedEmployers] = useState<string[]>([])
  const [employersInited, setEmployersInited] = useState(false)
  const [aggMode, setAggMode] = useState<AggMode>('avg')

  useEffect(() => { fetchSalaries(); fetchDeposits(); fetchExpenses(); fetchFixedExpenses() }, [fetchSalaries, fetchDeposits, fetchExpenses, fetchFixedExpenses])

  // Unique employers from salary data
  const employers = useMemo(() => {
    const set = new Set(salaries.map(s => s.employer))
    return Array.from(set).sort()
  }, [salaries])

  // Init selected employers to all when data loads
  useEffect(() => {
    if (!employersInited && employers.length > 0) {
      setSelectedEmployers(employers)
      setEmployersInited(true)
    }
  }, [employers, employersInited])

  const employerOptions = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const s of salaries) totals[s.employer] = (totals[s.employer] || 0) + s.neto
    return employers
      .sort((a, b) => (totals[b] || 0) - (totals[a] || 0))
      .map(emp => ({ value: emp, label: emp }))
  }, [employers, salaries])

  // Filtered salaries based on time range + employer
  const filtered = useMemo(() => {
    let list = [...salaries]
    // employer filter
    if (selectedEmployers.length < employers.length) {
      list = list.filter(s => selectedEmployers.includes(s.employer))
    }
    // time range filter
    const minMonth = getMinMonth(timeRange, customFrom)
    const maxMonth = timeRange === 'custom' && customTo ? customTo : '9999-12-31'
    list = list.filter(s => s.month >= minMonth && s.month <= maxMonth)
    return list.sort((a, b) => a.month.localeCompare(b.month))
  }, [salaries, selectedEmployers, employers.length, timeRange, customFrom, customTo])

  const count = filtered.length
  const aggLabel = aggMode === 'avg' ? 'ממוצע' : 'סה"כ'
  const agg = (total: number) => count ? (aggMode === 'avg' ? total / count : total) : 0

  const totalBruto = filtered.reduce((s, r) => s + r.bruto, 0)
  const totalNeto = filtered.reduce((s, r) => s + r.neto, 0)
  const aggBruto = agg(totalBruto)
  const aggNeto = agg(totalNeto)
  const aggDiff = aggBruto - aggNeto

  // Breakdown of reductions
  const breakdown = useMemo(() => {
    if (!filtered.length) return { investmentDeductions: 0, employerDeposits: 0, expenseDeductions: 0, other: 0 }

    const salaryIds = new Set(filtered.map(s => s.id))
    const filteredEmployers = new Set(filtered.map(s => s.employer))

    // Investment deductions: deposits linked to a filtered salary where depositor is "אני"
    const linkedDeposits = deposits.filter(d => d.salary_id && salaryIds.has(d.salary_id))
    let investmentTotal = 0
    for (const dep of linkedDeposits) {
      investmentTotal += dep.amount
    }

    // Employer deposits: all non-withdrawal deposits where the depositor is one of the
    // filtered employers, within the time range. These are NOT salary deductions — they
    // are employer contributions tracked by depositor name and date.
    const minMonth = getMinMonth(timeRange, customFrom)
    const maxMonth = timeRange === 'custom' && customTo ? customTo : '9999-12-31'
    let employerTotal = 0
    for (const dep of deposits) {
      if (dep.is_withdrawal) continue
      if (dep.depositor === 'אני') continue
      if (!filteredEmployers.has(dep.depositor)) continue
      if (dep.date >= minMonth && dep.date <= maxMonth) {
        employerTotal += dep.amount
      }
    }

    const linkedExpenses = expenses.filter(e => e.salary_id && salaryIds.has(e.salary_id))
    let expenseTotal = linkedExpenses.reduce((sum, e) => sum + e.amount, 0)

    const employerSalaries = new Map<string, number>()
    for (const s of filtered) {
      employerSalaries.set(s.employer, (employerSalaries.get(s.employer) || 0) + 1)
    }
    for (const fe of fixedExpenses) {
      if (fe.salary_employer) {
        const empCount = employerSalaries.get(fe.salary_employer) || 0
        if (empCount > 0) {
          const salariesForEmployer = filtered.filter(s => s.employer === fe.salary_employer)
          for (const s of salariesForEmployer) {
            const salMonth = s.month
            if (salMonth >= fe.start_date.slice(0, 7) && (!fe.end_date || salMonth <= fe.end_date.slice(0, 7))) {
              expenseTotal += fe.amount
            }
          }
        }
      }
    }

    return {
      investmentDeductions: agg(investmentTotal),
      employerDeposits: agg(employerTotal),
      expenseDeductions: agg(expenseTotal),
      other: Math.max(0, aggDiff - agg(investmentTotal) - agg(expenseTotal)),
    }
  }, [filtered, deposits, expenses, fixedExpenses, aggDiff, aggMode, timeRange, customFrom, customTo])

  // For the monthly bar chart, limit to last 18 months if range is larger
  const chartFiltered = useMemo(() => {
    if (filtered.length <= 18) return filtered
    return filtered.slice(-18)
  }, [filtered])

  const maxVal = chartFiltered.reduce((m, r) => Math.max(m, r.bruto, r.neto), 0) || 1

  const hasActiveFilters = useMemo(() => {
    if (aggMode !== 'avg') return true
    if (selectedEmployers.length > 0 && selectedEmployers.length < employers.length) return true
    if (timeRange !== 'last12') return true
    if (customFrom || customTo) return true
    return false
  }, [aggMode, selectedEmployers, employers.length, timeRange, customFrom, customTo])

  const clearFilters = () => {
    setAggMode('avg')
    setSelectedEmployers(employers)
    setTimeRange('last12')
    setCustomFrom('')
    setCustomTo('')
  }

  return (
    <div className="section-page">
      <div className="section-header">
        <h1>משכורת</h1>
        <div className="section-header-actions">
          {!loading && !depLoading && !expLoading && !fixLoading && salaries.length > 0 && (
            <ChartFilterPopover hasActive={hasActiveFilters} onClear={clearFilters}>
              <div className="filter-popover-field">
                <div className="filter-popover-label">תצוגה</div>
                <div className="filter-tabs">
                  <button type="button" className={`filter-tab${aggMode === 'avg' ? ' active' : ''}`} onClick={() => setAggMode('avg')}>ממוצע חודשי</button>
                  <button type="button" className={`filter-tab${aggMode === 'sum' ? ' active' : ''}`} onClick={() => setAggMode('sum')}>סכום</button>
                </div>
              </div>
              <div className="filter-popover-field">
                <div className="filter-popover-label">מעסיק</div>
                <FilterMultiSelect
                  options={employerOptions}
                  value={selectedEmployers}
                  placeholder="הכל"
                  onChange={setSelectedEmployers}
                />
              </div>
              <div className="filter-popover-field">
                <div className="filter-popover-label">טווח זמן</div>
                <div className="filter-tabs">
                  <button type="button" className={`filter-tab${timeRange === 'last1' ? ' active' : ''}`} onClick={() => setTimeRange('last1')}>חודש אחרון</button>
                  <button type="button" className={`filter-tab${timeRange === 'last6' ? ' active' : ''}`} onClick={() => setTimeRange('last6')}>6 חודשים</button>
                  <button type="button" className={`filter-tab${timeRange === 'last12' ? ' active' : ''}`} onClick={() => setTimeRange('last12')}>שנה</button>
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
            </ChartFilterPopover>
          )}
          <div className="section-tabs">
            <NavLink to="/salary" end className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
              טבלה
            </NavLink>
            <NavLink to="/salary/charts" className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
              גרפים
            </NavLink>
          </div>
        </div>
      </div>

      {loading || depLoading || expLoading || fixLoading ? (
        <div className="section-empty">טוען...</div>
      ) : salaries.length === 0 ? (
        <div className="section-empty">אין נתונים להצגה. הוסף משכורות בטבלה.</div>
      ) : (
        <div className="charts-grid">

          {filtered.length === 0 ? (
            <div className="section-empty">אין נתונים בטווח שנבחר.</div>
          ) : (
            <>
              <div className="summary-row">
                <div className="summary-card">
                  <div className="label">{aggLabel} ברוטו</div>
                  <div className="value">{formatCurrency(aggBruto)}</div>
                </div>
                <div className="summary-card">
                  <div className="label">{aggLabel} נטו</div>
                  <div className="value">{formatCurrency(aggNeto)}</div>
                  {aggBruto > 0 && <div className="sub-value">{((aggNeto / aggBruto) * 100).toFixed(1)}% מהברוטו</div>}
                </div>
                <div className="summary-card">
                  <div className="label">{aggLabel} ניכויים</div>
                  <div className="value">{formatCurrency(aggDiff)}</div>
                  {aggBruto > 0 && <div className="sub-value">{((aggDiff / aggBruto) * 100).toFixed(1)}% מהברוטו</div>}
                </div>
              </div>

              <div className="summary-row">
                <div className="summary-card">
                  <div className="label">הפקדות מעסיק להשקעות</div>
                  <div className="value">{formatCurrency(breakdown.employerDeposits)}</div>
                  {aggBruto > 0 && <div className="sub-value">{((breakdown.employerDeposits / aggBruto) * 100).toFixed(1)}% מהברוטו</div>}
                </div>
                <div className="summary-card">
                  <div className="label">ניכויים להשקעות</div>
                  <div className="value">{formatCurrency(breakdown.investmentDeductions)}</div>
                  {aggBruto > 0 && <div className="sub-value">{((breakdown.investmentDeductions / aggBruto) * 100).toFixed(1)}% מהברוטו</div>}
                </div>
                <div className="summary-card">
                  <div className="label">ניכויים להוצאות</div>
                  <div className="value">{formatCurrency(breakdown.expenseDeductions)}</div>
                  {aggBruto > 0 && <div className="sub-value">{((breakdown.expenseDeductions / aggBruto) * 100).toFixed(1)}% מהברוטו</div>}
                </div>
                <div className="summary-card">
                  <div className="label">ניכויים אחרים</div>
                  <div className="value">{formatCurrency(breakdown.other)}</div>
                  {aggBruto > 0 && <div className="sub-value">{((breakdown.other / aggBruto) * 100).toFixed(1)}% מהברוטו</div>}
                </div>
              </div>

              <div className="chart-card">
                <h3>ברוטו מול נטו</h3>
                <div className="bar-chart">
                  {chartFiltered.map(s => (
                    <div className="bar-group" key={s.id}>
                      <div className="bar-pair">
                        <div className="bar neto" style={{ height: `${(s.neto / maxVal) * 100}%` }}>
                          <span className="bar-value">{s.neto.toLocaleString('he-IL')}</span>
                        </div>
                        <div className="bar bruto" style={{ height: `${(s.bruto / maxVal) * 100}%` }}>
                          <span className="bar-value">{s.bruto.toLocaleString('he-IL')}</span>
                        </div>
                      </div>
                      <span className="bar-label">{formatMonth(s.month)}</span>
                    </div>
                  ))}
                </div>
                <div className="chart-legend">
                  <span><span className="legend-dot bruto" /> ברוטו</span>
                  <span><span className="legend-dot neto" /> נטו</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
