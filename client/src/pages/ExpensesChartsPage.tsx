import { useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
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

export function ExpensesChartsPage() {
  const { expenses, loading, fetchExpenses } = useExpenses()
  const { inflatedExpenses, loading: fixedLoading, fetchFixedExpenses } = useFixedExpenses()

  useEffect(() => { fetchExpenses() }, [fetchExpenses])
  useEffect(() => { fetchFixedExpenses() }, [fetchFixedExpenses])

  const allExpenses = useMemo(
    () => [...expenses, ...inflatedExpenses],
    [expenses, inflatedExpenses]
  )

  const totalAmount = allExpenses.reduce((s, e) => s + e.amount, 0)
  const avgAmount = allExpenses.length ? totalAmount / allExpenses.length : 0

  // Group by category
  const byCategory = allExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {})
  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  const maxCategory = categories.length ? categories[0][1] : 1

  // Monthly totals (last 12 months)
  const byMonth = allExpenses.reduce<Record<string, number>>((acc, e) => {
    const key = e.date.slice(0, 7) // YYYY-MM
    acc[key] = (acc[key] || 0) + e.amount
    return acc
  }, {})
  const months = Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
  const maxMonth = months.reduce((m, [, v]) => Math.max(m, v), 0) || 1

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

      {(loading || fixedLoading) ? (
        <div className="section-empty">טוען...</div>
      ) : allExpenses.length === 0 ? (
        <div className="section-empty">אין נתונים להצגה. הוסף הוצאות בטבלה.</div>
      ) : (
        <div className="charts-grid">
          <div className="summary-row">
            <div className="summary-card">
              <div className="label">סה"כ הוצאות</div>
              <div className="value">{formatCurrency(totalAmount)}</div>
            </div>
            <div className="summary-card">
              <div className="label">ממוצע להוצאה</div>
              <div className="value">{formatCurrency(avgAmount)}</div>
            </div>
            <div className="summary-card">
              <div className="label">מספר הוצאות</div>
              <div className="value">{allExpenses.length}</div>
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
                    />
                  </div>
                  <span className="h-bar-value">{formatCurrency(total)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <h3>הוצאות חודשיות - 12 חודשים אחרונים</h3>
            <div className="bar-chart">
              {months.map(([m, total]) => (
                <div className="bar-group" key={m}>
                  <div className="bar-pair">
                    <div
                      className="bar expense-bar"
                      style={{ height: `${(total / maxMonth) * 100}%` }}
                      title={formatCurrency(total)}
                    />
                  </div>
                  <span className="bar-label">{formatMonth(m + '-01')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
