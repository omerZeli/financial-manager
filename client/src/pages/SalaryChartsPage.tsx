import { useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useSalary } from '../contexts/SalaryContext'
import { useInvestmentDeposits } from '../contexts/InvestmentDepositsContext'
import { useExpenses } from '../contexts/ExpensesContext'
import { useFixedExpenses } from '../contexts/FixedExpensesContext'
import './Section.css'

function formatCurrency(n: number) {
  return n.toLocaleString('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 })
}

function formatMonth(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' })
}

export function SalaryChartsPage() {
  const { salaries, loading, fetchSalaries } = useSalary()
  const { deposits, loading: depLoading, fetchDeposits } = useInvestmentDeposits()
  const { expenses, loading: expLoading, fetchExpenses } = useExpenses()
  const { fixedExpenses, loading: fixLoading, fetchFixedExpenses } = useFixedExpenses()

  useEffect(() => { fetchSalaries(); fetchDeposits(); fetchExpenses(); fetchFixedExpenses() }, [fetchSalaries, fetchDeposits, fetchExpenses, fetchFixedExpenses])

  const sorted = [...salaries].sort((a, b) => a.month.localeCompare(b.month))
  const last12 = sorted.slice(-12)

  const avgBruto = salaries.length ? salaries.reduce((s, r) => s + r.bruto, 0) / salaries.length : 0
  const avgNeto = salaries.length ? salaries.reduce((s, r) => s + r.neto, 0) / salaries.length : 0
  const avgDiff = avgBruto - avgNeto

  // Breakdown of reductions
  const breakdown = useMemo(() => {
    if (!salaries.length) return { investmentDeductions: 0, employerDeposits: 0, expenseDeductions: 0, other: 0 }

    const salaryIds = new Set(salaries.map(s => s.id))
    const salaryMap = new Map(salaries.map(s => [s.id, s]))

    // Investment deposits linked to a salary
    const linkedDeposits = deposits.filter(d => d.salary_id && salaryIds.has(d.salary_id))
    // Split: depositor matches employer → employer deposit, otherwise → employee deduction
    let employerTotal = 0
    let investmentTotal = 0
    for (const dep of linkedDeposits) {
      const sal = salaryMap.get(dep.salary_id!)
      if (sal && dep.depositor === sal.employer) {
        employerTotal += dep.amount
      } else {
        investmentTotal += dep.amount
      }
    }

    // Regular expenses linked to a salary
    const linkedExpenses = expenses.filter(e => e.salary_id && salaryIds.has(e.salary_id))
    let expenseTotal = linkedExpenses.reduce((sum, e) => sum + e.amount, 0)

    // Fixed expenses linked by employer — compute monthly amounts per salary
    const employerSalaries = new Map<string, number>() // employer → count of salaries
    for (const s of salaries) {
      employerSalaries.set(s.employer, (employerSalaries.get(s.employer) || 0) + 1)
    }
    for (const fe of fixedExpenses) {
      if (fe.salary_employer) {
        const count = employerSalaries.get(fe.salary_employer) || 0
        if (count > 0) {
          // Count how many months this fixed expense overlaps with salaries of that employer
          const salariesForEmployer = salaries.filter(s => s.employer === fe.salary_employer)
          for (const s of salariesForEmployer) {
            const salMonth = s.month // YYYY-MM-DD
            if (salMonth >= fe.start_date.slice(0, 7) && (!fe.end_date || salMonth <= fe.end_date.slice(0, 7))) {
              expenseTotal += fe.amount
            }
          }
        }
      }
    }

    const avgInvestment = investmentTotal / salaries.length
    const avgEmployer = employerTotal / salaries.length
    const avgExpense = expenseTotal / salaries.length
    const avgOther = Math.max(0, avgDiff - avgInvestment - avgEmployer - avgExpense)

    return { investmentDeductions: avgInvestment, employerDeposits: avgEmployer, expenseDeductions: avgExpense, other: avgOther }
  }, [salaries, deposits, expenses, fixedExpenses, avgDiff])

  const maxVal = last12.reduce((m, r) => Math.max(m, r.bruto, r.neto), 0) || 1

  return (
    <div className="section-page">
      <div className="section-header">
        <h1>משכורת</h1>
        <div className="section-tabs">
          <NavLink to="/salary" end className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
            טבלה
          </NavLink>
          <NavLink to="/salary/charts" className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
            גרפים
          </NavLink>
        </div>
      </div>

      {loading || depLoading || expLoading || fixLoading ? (
        <div className="section-empty">טוען...</div>
      ) : salaries.length === 0 ? (
        <div className="section-empty">אין נתונים להצגה. הוסף משכורות בטבלה.</div>
      ) : (
        <div className="charts-grid">
          <div className="summary-row">
            <div className="summary-card">
              <div className="label">ממוצע ברוטו</div>
              <div className="value">{formatCurrency(avgBruto)}</div>
            </div>
            <div className="summary-card">
              <div className="label">ממוצע נטו</div>
              <div className="value">{formatCurrency(avgNeto)}</div>
              {avgBruto > 0 && <div className="sub-value">{((avgNeto / avgBruto) * 100).toFixed(1)}% מהברוטו</div>}
            </div>
            <div className="summary-card">
              <div className="label">ממוצע ניכויים</div>
              <div className="value">{formatCurrency(avgDiff)}</div>
              {avgBruto > 0 && <div className="sub-value">{((avgDiff / avgBruto) * 100).toFixed(1)}% מהברוטו</div>}
            </div>
          </div>

          <div className="summary-row">
            <div className="summary-card">
              <div className="label">ניכויים להשקעות</div>
              <div className="value">{formatCurrency(breakdown.investmentDeductions)}</div>
              {avgBruto > 0 && <div className="sub-value">{((breakdown.investmentDeductions / avgBruto) * 100).toFixed(1)}% מהברוטו</div>}
            </div>
            <div className="summary-card">
              <div className="label">הפקדות מעסיק להשקעות</div>
              <div className="value">{formatCurrency(breakdown.employerDeposits)}</div>
              {avgBruto > 0 && <div className="sub-value">{((breakdown.employerDeposits / avgBruto) * 100).toFixed(1)}% מהברוטו</div>}
            </div>
            <div className="summary-card">
              <div className="label">ניכויים להוצאות</div>
              <div className="value">{formatCurrency(breakdown.expenseDeductions)}</div>
              {avgBruto > 0 && <div className="sub-value">{((breakdown.expenseDeductions / avgBruto) * 100).toFixed(1)}% מהברוטו</div>}
            </div>
            <div className="summary-card">
              <div className="label">ניכויים אחרים</div>
              <div className="value">{formatCurrency(breakdown.other)}</div>
              {avgBruto > 0 && <div className="sub-value">{(((avgDiff / avgBruto) * 100) - parseFloat(((breakdown.investmentDeductions / avgBruto) * 100).toFixed(1)) - parseFloat(((breakdown.employerDeposits / avgBruto) * 100).toFixed(1)) - parseFloat(((breakdown.expenseDeductions / avgBruto) * 100).toFixed(1))).toFixed(1)}% מהברוטו</div>}
            </div>
          </div>

          <div className="chart-card">
            <h3>ברוטו מול נטו - 12 חודשים אחרונים</h3>
            <div className="bar-chart">
              {last12.map(s => (
                <div className="bar-group" key={s.id}>
                  <div className="bar-pair">
                    <div className="bar bruto" style={{ height: `${(s.bruto / maxVal) * 100}%` }}>
                      <span className="bar-value">{s.bruto.toLocaleString('he-IL')}</span>
                    </div>
                    <div className="bar neto" style={{ height: `${(s.neto / maxVal) * 100}%` }}>
                      <span className="bar-value">{s.neto.toLocaleString('he-IL')}</span>
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
        </div>
      )}
    </div>
  )
}
