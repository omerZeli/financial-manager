import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useSalary } from '../contexts/SalaryContext'
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

  useEffect(() => { fetchSalaries() }, [fetchSalaries])

  const sorted = [...salaries].sort((a, b) => a.month.localeCompare(b.month))
  const last12 = sorted.slice(-12)

  const avgBruto = salaries.length ? salaries.reduce((s, r) => s + r.bruto, 0) / salaries.length : 0
  const avgNeto = salaries.length ? salaries.reduce((s, r) => s + r.neto, 0) / salaries.length : 0
  const avgDiff = avgBruto - avgNeto

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

      {loading ? (
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
            </div>
            <div className="summary-card">
              <div className="label">ממוצע ניכויים</div>
              <div className="value">{formatCurrency(avgDiff)}</div>
            </div>
          </div>

          <div className="chart-card">
            <h3>ברוטו מול נטו - 12 חודשים אחרונים</h3>
            <div className="bar-chart">
              {last12.map(s => (
                <div className="bar-group" key={s.id}>
                  <div className="bar-pair">
                    <div className="bar bruto" style={{ height: `${(s.bruto / maxVal) * 100}%` }} title={`ברוטו: ${formatCurrency(s.bruto)}`} />
                    <div className="bar neto" style={{ height: `${(s.neto / maxVal) * 100}%` }} title={`נטו: ${formatCurrency(s.neto)}`} />
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
