import { useEffect, useMemo, useState } from 'react'
import { useSalary } from '../contexts/SalaryContext'
import { useExpenses } from '../contexts/ExpensesContext'
import { useFixedExpenses } from '../contexts/FixedExpensesContext'
import { usePaybacks } from '../contexts/PaybacksContext'
import { useInvestmentChannels } from '../contexts/InvestmentChannelsContext'
import { useInvestmentDeposits } from '../contexts/InvestmentDepositsContext'
import { useInvestmentValues } from '../contexts/InvestmentValuesContext'
import { useExpenseTypes } from '../contexts/ExpenseTypesContext'
import { computeChannelSummary, CASH_PATH_LABEL } from '../lib/computeChannelSummary'
import { ChartFilterPopover } from '../components/common/ChartFilterPopover'
import { SankeyChart, type SankeyNode } from '../components/common/SankeyChart'
import DateInput from '../components/common/DatePicker'
import { formatLocalDate, getEffectiveDate } from '../lib/dateUtils'
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
  const { expenseTypes, fetchExpenseTypes } = useExpenseTypes()

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
  useEffect(() => { fetchExpenseTypes() }, [fetchExpenseTypes])

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
  // Salary uses the same date range as expenses/investments so the Sankey chart
  // shows matching periods. The salary `month` field already represents the work
  // month — no shift needed.
  const salaryDateRange = effectiveDateRange

  const avgSalary = useMemo(() => {
    const filtered = salaries.filter(s => s.month >= salaryDateRange.minDate && s.month <= salaryDateRange.maxDate)
    if (filtered.length === 0) return 0
    const field = salaryFilter === 'bruto' ? 'bruto' : 'neto'
    const total = filtered.reduce((sum, s) => sum + s[field], 0)
    return total / filtered.length
  }, [salaries, salaryFilter, salaryDateRange])

  // --- Expenses: average monthly ---
  const avgMonthlyExpenses = useMemo(() => {
    // Build salary month map for salary-linked items
    const salaryMonthMap = new Map<string, string>()
    for (const s of salaries) {
      salaryMonthMap.set(s.id, s.month)
    }

    // Set of fixed expense IDs that are salary-deducted
    const salaryDeductedFixedIds = new Set(fixedExpenses.filter(fe => fe.salary_employer).map(fe => fe.id))

    const toMeByExpense: Record<string, number> = {}
    for (const pb of paybacks) {
      if (pb.direction === 'to_me' && pb.expense_id) {
        toMeByExpense[pb.expense_id] = (toMeByExpense[pb.expense_id] || 0) + pb.amount
      }
    }

    const byMeExpenses = paybacks
      .filter(pb => pb.direction === 'by_me')
      .map(pb => ({ amount: pb.amount, date: pb.date, salary_id: null as string | null, _salaryDeductedFixed: false }))

    let items: { amount: number; date: string; salary_id: string | null; _salaryDeductedFixed: boolean }[] = []

    if (expenseFilter === 'regular' || expenseFilter === 'all') {
      const adjusted = expenses.map(exp => ({
        amount: exp.amount - (toMeByExpense[exp.id] || 0),
        date: exp.date,
        salary_id: exp.salary_id,
        _salaryDeductedFixed: false,
      }))
      items = [...items, ...adjusted, ...byMeExpenses]
    }

    if (expenseFilter === 'fixed' || expenseFilter === 'all') {
      items = [...items, ...inflatedExpenses.map(ie => {
        const fixedId = ie.id.substring(0, ie.id.lastIndexOf('_'))
        return { amount: ie.amount, date: ie.date, salary_id: null as string | null, _salaryDeductedFixed: salaryDeductedFixedIds.has(fixedId) }
      })]
    }

    // Apply time filter (using salary month for salary-linked items)
    if (timeRange !== 'all') {
      items = items.filter(i => {
        let effectiveDate: string
        if (i.salary_id) {
          effectiveDate = getEffectiveDate(i.date, i.salary_id, salaryMonthMap)
        } else if (i._salaryDeductedFixed) {
          const dt = new Date(i.date + 'T00:00:00')
          dt.setMonth(dt.getMonth() - 1)
          effectiveDate = formatLocalDate(dt)
        } else {
          effectiveDate = i.date
        }
        return effectiveDate >= effectiveDateRange.minDate && effectiveDate <= effectiveDateRange.maxDate
      })
    }

    if (items.length === 0) return 0

    const months = new Set(items.map(i => {
      let effectiveDate: string
      if (i.salary_id) {
        effectiveDate = getEffectiveDate(i.date, i.salary_id, salaryMonthMap)
      } else if (i._salaryDeductedFixed) {
        const dt = new Date(i.date + 'T00:00:00')
        dt.setMonth(dt.getMonth() - 1)
        effectiveDate = formatLocalDate(dt)
      } else {
        effectiveDate = i.date
      }
      return effectiveDate.slice(0, 7)
    }))
    const total = items.reduce((sum, i) => sum + i.amount, 0)
    return months.size > 0 ? total / months.size : 0
  }, [expenses, inflatedExpenses, fixedExpenses, paybacks, salaries, expenseFilter, timeRange, effectiveDateRange])

  // --- Sankey chart data ---
  // Semantic colors for each node type
  const COLOR_SALARY = '#2563eb'         // Blue — salary/income
  const COLOR_EMPLOYER_DEPOSIT = '#0ea5e9' // Sky blue — employer contributions
  const COLOR_WITHDRAWALS = '#14b8a6'    // Teal — money coming back from investments

  const COLOR_DEDUCT_INVEST = '#7c3aed'  // Purple — investment deductions from salary
  const COLOR_DEDUCT_OTHER = '#6b7280'   // Gray — tax, social security, etc.
  const COLOR_MY_DEPOSITS = '#059669'    // Green — personal investment deposits

  // Warm/diverse palette for expense types
  const EXPENSE_COLORS = [
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#ec4899', // Pink
    '#f97316', // Orange
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#e11d48', // Rose
    '#0891b2', // Dark cyan
    '#a855f7', // Purple
  ]

  const sankeyData = useMemo(() => {
    // --- LEFT SIDE: Bruto salary per employer ---
    const filteredSalaries = salaries.filter(
      s => s.month >= salaryDateRange.minDate && s.month <= salaryDateRange.maxDate
    )
    const brutoByEmployer: Record<string, number> = {}
    const netoByEmployer: Record<string, number> = {}
    for (const s of filteredSalaries) {
      brutoByEmployer[s.employer] = (brutoByEmployer[s.employer] || 0) + s.bruto
      netoByEmployer[s.employer] = (netoByEmployer[s.employer] || 0) + s.neto
    }

    const salaryMonthById = new Map<string, string>()
    for (const s of salaries) {
      salaryMonthById.set(s.id, s.month)
    }

    const leftNodes: SankeyNode[] = []

    // Sort employers by total bruto descending
    const sortedEmployers = Object.entries(brutoByEmployer)
      .sort((a, b) => b[1] - a[1])
    for (const [employer, total] of sortedEmployers) {
      leftNodes.push({
        id: `salary_${employer}`,
        label: `משכורת - ${employer}`,
        value: total,
        color: COLOR_SALARY,
      })
    }

    // Employer investment deposits (depositor !== 'אני', not withdrawals)
    const filteredEmployerDeposits = deposits.filter(d => {
      if (d.is_withdrawal) return false
      if (d.depositor === 'אני') return false
      if (timeRange === 'all') return true
      let effectiveDate: string
      if (d.salary_id && salaryMonthById.has(d.salary_id)) {
        effectiveDate = salaryMonthById.get(d.salary_id)!
      } else {
        const dt = new Date(d.date + 'T00:00:00')
        dt.setMonth(dt.getMonth() - 1)
        effectiveDate = formatLocalDate(dt)
      }
      return effectiveDate >= effectiveDateRange.minDate && effectiveDate <= effectiveDateRange.maxDate
    })
    const depositsByDepositor: Record<string, number> = {}
    for (const d of filteredEmployerDeposits) {
      depositsByDepositor[d.depositor] = (depositsByDepositor[d.depositor] || 0) + d.amount
    }

    // Sort depositors by total descending
    const sortedDepositors = Object.entries(depositsByDepositor)
      .sort((a, b) => b[1] - a[1])
    for (const [depositor, total] of sortedDepositors) {
      leftNodes.push({
        id: `depositor_${depositor}`,
        label: `הפקדות - ${depositor}`,
        value: total,
        color: COLOR_EMPLOYER_DEPOSIT,
      })
    }

    // Withdrawals from investments
    const filteredWithdrawals = deposits.filter(d => {
      if (!d.is_withdrawal) return false
      if (timeRange === 'all') return true
      const effectiveDate = getEffectiveDate(d.date, d.salary_id, salaryMonthById)
      return effectiveDate >= effectiveDateRange.minDate && effectiveDate <= effectiveDateRange.maxDate
    })
    let withdrawalsTotal = 0
    for (const d of filteredWithdrawals) {
      withdrawalsTotal += d.amount
    }
    if (withdrawalsTotal > 0) {
      leftNodes.push({
        id: 'withdrawals',
        label: 'משיכות מהשקעות',
        value: withdrawalsTotal,
        color: COLOR_WITHDRAWALS,
      })
    }

    // --- RIGHT SIDE: Deductions + My Deposits + Expenses ---

    // 1. Investment deductions: my deposits linked to a salary (depositor === 'אני' + salary_id set)
    const myLinkedDeposits = deposits.filter(d => {
      if (d.is_withdrawal) return false
      if (d.depositor !== 'אני') return false
      if (!d.salary_id) return false
      if (timeRange === 'all') return true
      const effectiveDate = getEffectiveDate(d.date, d.salary_id, salaryMonthById)
      return effectiveDate >= effectiveDateRange.minDate && effectiveDate <= effectiveDateRange.maxDate
    })
    let investDeductionTotal = 0
    for (const d of myLinkedDeposits) {
      investDeductionTotal += d.amount
    }

    // 2. Other deductions = (bruto - neto) - investment deductions - expense deductions
    //    Expense deductions are already shown in the expenses section, so exclude them here.
    const totalBruto = Object.values(brutoByEmployer).reduce((s, v) => s + v, 0)
    const totalNeto = Object.values(netoByEmployer).reduce((s, v) => s + v, 0)
    const totalDeductions = totalBruto - totalNeto

    // Compute expense deductions: salary-linked regular expenses + salary-deducted fixed expenses
    const salaryDeductedFixedIds = new Set(fixedExpenses.filter(fe => fe.salary_employer).map(fe => fe.id))
    let expenseDeductionTotal = 0
    // Regular expenses linked to a salary in the date range
    for (const exp of expenses) {
      if (!exp.salary_id) continue
      if (timeRange !== 'all') {
        const effectiveDate = getEffectiveDate(exp.date, exp.salary_id, salaryMonthById)
        if (effectiveDate < effectiveDateRange.minDate || effectiveDate > effectiveDateRange.maxDate) continue
      }
      expenseDeductionTotal += exp.amount
    }
    // Inflated fixed expenses that are salary-deducted, in the date range
    for (const ie of inflatedExpenses) {
      const fixedId = ie.id.substring(0, ie.id.lastIndexOf('_'))
      if (!salaryDeductedFixedIds.has(fixedId)) continue
      if (timeRange !== 'all') {
        const dt = new Date(ie.date + 'T00:00:00')
        dt.setMonth(dt.getMonth() - 1)
        const effectiveDate = formatLocalDate(dt)
        if (effectiveDate < effectiveDateRange.minDate || effectiveDate > effectiveDateRange.maxDate) continue
      }
      expenseDeductionTotal += ie.amount
    }

    const otherDeductions = Math.max(totalDeductions - investDeductionTotal - expenseDeductionTotal, 0)

    // 3. My deposits not linked to salary (depositor === 'אני', no salary_id, not withdrawals)
    const myDeposits = deposits.filter(d => {
      if (d.depositor !== 'אני') return false
      if (d.is_withdrawal) return false
      if (d.salary_id) return false
      if (timeRange === 'all') return true
      const effectiveDate = getEffectiveDate(d.date, d.salary_id, salaryMonthById)
      return effectiveDate >= effectiveDateRange.minDate && effectiveDate <= effectiveDateRange.maxDate
    })
    let myDepositsTotal = 0
    for (const d of myDeposits) {
      myDepositsTotal += d.amount
    }

    // 4. Expenses by expense type (filtered by date range)
    const toMeByExpense: Record<string, number> = {}
    for (const pb of paybacks) {
      if (pb.direction === 'to_me' && pb.expense_id) {
        toMeByExpense[pb.expense_id] = (toMeByExpense[pb.expense_id] || 0) + pb.amount
      }
    }

    interface ExpItem { category: string; amount: number; date: string; salary_id: string | null; _salaryDeductedFixed: boolean }
    const allExpItems: ExpItem[] = []

    for (const exp of expenses) {
      const returned = toMeByExpense[exp.id] || 0
      const adj = exp.amount - returned
      if (adj > 0) {
        allExpItems.push({ category: exp.category, amount: adj, date: exp.date, salary_id: exp.salary_id, _salaryDeductedFixed: false })
      }
    }

    for (const ie of inflatedExpenses) {
      const fixedId = ie.id.substring(0, ie.id.lastIndexOf('_'))
      allExpItems.push({ category: ie.category, amount: ie.amount, date: ie.date, salary_id: null, _salaryDeductedFixed: salaryDeductedFixedIds.has(fixedId) })
    }

    for (const pb of paybacks) {
      if (pb.direction === 'by_me' && pb.category) {
        allExpItems.push({ category: pb.category, amount: pb.amount, date: pb.date, salary_id: null, _salaryDeductedFixed: false })
      }
    }

    const filteredExpItems = timeRange === 'all'
      ? allExpItems
      : allExpItems.filter(i => {
          let effectiveDate: string
          if (i.salary_id) {
            effectiveDate = getEffectiveDate(i.date, i.salary_id, salaryMonthById)
          } else if (i._salaryDeductedFixed) {
            const dt = new Date(i.date + 'T00:00:00')
            dt.setMonth(dt.getMonth() - 1)
            effectiveDate = formatLocalDate(dt)
          } else {
            effectiveDate = i.date
          }
          return effectiveDate >= effectiveDateRange.minDate && effectiveDate <= effectiveDateRange.maxDate
        })

    const categoryToType = new Map<string, string>()
    for (const et of expenseTypes) {
      for (const cat of et.categories) {
        categoryToType.set(cat, et.type_name)
      }
    }

    const expenseByType: Record<string, number> = {}
    for (const item of filteredExpItems) {
      const typeName = categoryToType.get(item.category) || 'אחרות'
      expenseByType[typeName] = (expenseByType[typeName] || 0) + item.amount
    }

    const rightNodes: SankeyNode[] = []

    // Deduction nodes
    if (investDeductionTotal > 0) {
      rightNodes.push({
        id: 'deduct_invest',
        label: 'ניכויים להשקעות',
        value: investDeductionTotal,
        color: COLOR_DEDUCT_INVEST,
      })
    }
    if (otherDeductions > 0) {
      rightNodes.push({
        id: 'deduct_other',
        label: 'ניכויים אחרים',
        value: otherDeductions,
        color: COLOR_DEDUCT_OTHER,
      })
    }

    // My deposits node
    if (myDepositsTotal > 0) {
      rightNodes.push({
        id: 'my_deposits',
        label: 'הפקדות להשקעות',
        value: myDepositsTotal,
        color: COLOR_MY_DEPOSITS,
      })
    }

    // Expense type outflows, sorted by total descending, 'אחרות' always last
    const sortedExpTypes = Object.entries(expenseByType)
      .sort((a, b) => {
        if (a[0] === 'אחרות') return 1
        if (b[0] === 'אחרות') return -1
        return b[1] - a[1]
      })
    let expColorIdx = 0
    for (const [typeName, total] of sortedExpTypes) {
      rightNodes.push({
        id: `expense_${typeName}`,
        label: `הוצאות ${typeName}`,
        value: total,
        color: EXPENSE_COLORS[expColorIdx % EXPENSE_COLORS.length],
      })
      expColorIdx++
    }

    return { leftNodes, rightNodes }
  }, [
    salaries, salaryDateRange, deposits, expenses, inflatedExpenses, fixedExpenses,
    paybacks, expenseTypes, timeRange, effectiveDateRange,
  ])

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

      {!anyLoading && (
        <SankeyChart
          incomeNodes={sankeyData.leftNodes}
          outflowNodes={sankeyData.rightNodes}
          incomeLabel="הכנסות"
          outflowLabel="ניכויים, השקעות והוצאות"
          formatValue={formatCurrency}
        />
      )}
    </div>
  )
}
