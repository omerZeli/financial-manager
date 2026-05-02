import { useEffect, useMemo, useState } from 'react'
import { useSalary } from '../contexts/SalaryContext'
import { useExpenses } from '../contexts/ExpensesContext'
import { useFixedExpenses } from '../contexts/FixedExpensesContext'
import { usePaybacks } from '../contexts/PaybacksContext'
import { useInvestmentChannels } from '../contexts/InvestmentChannelsContext'
import { useInvestmentDeposits } from '../contexts/InvestmentDepositsContext'
import { useInvestmentValues } from '../contexts/InvestmentValuesContext'
import { computeChannelSummary, CASH_PATH_LABEL } from '../lib/computeChannelSummary'
import './HomePage.css'

function formatCurrency(n: number) {
  return n.toLocaleString('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 })
}

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

  // --- Investments: total current value ---
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
  const avgSalary = useMemo(() => {
    if (salaries.length === 0) return 0
    const field = salaryFilter === 'bruto' ? 'bruto' : 'neto'
    const total = salaries.reduce((sum, s) => sum + s[field], 0)
    return total / salaries.length
  }, [salaries, salaryFilter])

  // --- Expenses: average monthly ---
  const avgMonthlyExpenses = useMemo(() => {
    // Build to_me payback totals per expense
    const toMeByExpense: Record<string, number> = {}
    for (const pb of paybacks) {
      if (pb.direction === 'to_me' && pb.expense_id) {
        toMeByExpense[pb.expense_id] = (toMeByExpense[pb.expense_id] || 0) + pb.amount
      }
    }

    // by_me paybacks as virtual expenses
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

    if (items.length === 0) return 0

    // Group by month and compute average
    const months = new Set(items.map(i => i.date.slice(0, 7)))
    const total = items.reduce((sum, i) => sum + i.amount, 0)
    return months.size > 0 ? total / months.size : 0
  }, [expenses, inflatedExpenses, paybacks, expenseFilter])

  const investmentLoading = chLoading || depLoading || valLoading
  const salaryLoading = salLoading
  const expenseLoading = expLoading || fixLoading || pbLoading

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>דשבורד</h1>
      </div>

      <div className="home-cards">
        {/* Investments card */}
        <div className="home-card">
          <div className="home-card-info">
            <span className="home-card-label">שווי השקעות</span>
            {investmentLoading
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
              className={`home-card-filter-btn${investmentFilter === 'pension' ? ' active' : ''}`}
              onClick={() => setInvestmentFilter('pension')}
            >פנסיוני</button>
            <button
              className={`home-card-filter-btn${investmentFilter === 'noPension' ? ' active' : ''}`}
              onClick={() => setInvestmentFilter('noPension')}
            >לא פנסיוני</button>
          </div>
        </div>

        {/* Salary card */}
        <div className="home-card">
          <div className="home-card-info">
            <span className="home-card-label">משכורת ממוצעת</span>
            {salaryLoading
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
            {expenseLoading
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
