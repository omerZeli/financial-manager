import { useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useInvestmentChannels } from '../contexts/InvestmentChannelsContext'
import { useInvestmentDeposits } from '../contexts/InvestmentDepositsContext'
import { useInvestmentValues } from '../contexts/InvestmentValuesContext'
import './Section.css'

function formatCurrency(n: number) {
  return n.toLocaleString('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 })
}

function formatPercent(n: number) {
  return n.toLocaleString('he-IL', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

const CHANNEL_COLORS = [
  'var(--accent)',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#65a30d',
]

export function InvestmentsChartsPage() {
  const { channels, loading: chLoading, fetchChannels } = useInvestmentChannels()
  const { deposits, loading: depLoading, fetchDeposits } = useInvestmentDeposits()
  const { valueUpdates, loading: valLoading, fetchValueUpdates } = useInvestmentValues()

  useEffect(() => { fetchChannels() }, [fetchChannels])
  useEffect(() => { fetchDeposits() }, [fetchDeposits])
  useEffect(() => { fetchValueUpdates() }, [fetchValueUpdates])

  const summaries = useMemo(() => {
    return channels.map(ch => {
      const chDeposits = deposits.filter(d => d.channel_id === ch.id)
      const totalDeposits = chDeposits.reduce((s, d) => s + d.amount, 0)
      const chValues = valueUpdates.filter(v => v.channel_id === ch.id).sort((a, b) => b.date.localeCompare(a.date))
      const currentValue = chValues.length > 0 ? chValues[0].value : 0
      const returnAbsolute = currentValue - totalDeposits
      const returnPercent = totalDeposits > 0 ? returnAbsolute / totalDeposits : 0
      return { ...ch, totalDeposits, currentValue, returnAbsolute, returnPercent }
    })
  }, [channels, deposits, valueUpdates])

  const totalDeposited = summaries.reduce((s, c) => s + c.totalDeposits, 0)
  const totalCurrentValue = summaries.reduce((s, c) => s + c.currentValue, 0)
  const totalReturn = totalCurrentValue - totalDeposited
  const totalReturnPercent = totalDeposited > 0 ? totalReturn / totalDeposited : 0

  const maxValue = summaries.reduce((m, c) => Math.max(m, c.currentValue, c.totalDeposits), 0) || 1

  const isLoading = chLoading || depLoading || valLoading

  return (
    <div className="section-page">
      <div className="section-header">
        <h1>השקעות</h1>
        <div className="section-tabs">
          <NavLink to="/investments" end className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
            טבלה
          </NavLink>
          <NavLink to="/investments/charts" className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
            גרפים
          </NavLink>
        </div>
      </div>

      {isLoading ? (
        <div className="section-empty">טוען...</div>
      ) : channels.length === 0 ? (
        <div className="section-empty">אין נתונים להצגה. הוסף אפיקי השקעה בטבלה.</div>
      ) : (
        <div className="charts-grid">
          <div className="summary-row">
            <div className="summary-card">
              <div className="label">סה"כ הפקדות</div>
              <div className="value">{formatCurrency(totalDeposited)}</div>
            </div>
            <div className="summary-card">
              <div className="label">שווי נוכחי</div>
              <div className="value">{formatCurrency(totalCurrentValue)}</div>
            </div>
            <div className="summary-card">
              <div className="label">תשואה כוללת</div>
              <div className={`value ${totalReturn >= 0 ? 'positive-return' : 'negative-return'}`}>
                {formatCurrency(totalReturn)} ({formatPercent(totalReturnPercent)})
              </div>
            </div>
          </div>

          <div className="chart-card">
            <h3>הפקדות מול שווי נוכחי - לפי אפיק</h3>
            <div className="h-bar-chart">
              {summaries.map((ch, i) => (
                <div className="h-bar-row" key={ch.id}>
                  <span className="h-bar-label">{ch.name}</span>
                  <div className="h-bar-track">
                    <div
                      className="h-bar-fill"
                      style={{
                        width: `${(ch.currentValue / maxValue) * 100}%`,
                        background: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
                      }}
                    />
                  </div>
                  <span className="h-bar-value">{formatCurrency(ch.currentValue)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <h3>תשואה לפי אפיק</h3>
            <div className="h-bar-chart">
              {summaries
                .filter(ch => ch.currentValue > 0)
                .sort((a, b) => b.returnPercent - a.returnPercent)
                .map((ch, i) => {
                  const maxPct = Math.max(...summaries.filter(c => c.currentValue > 0).map(c => Math.abs(c.returnPercent)), 0.01)
                  return (
                    <div className="h-bar-row" key={ch.id}>
                      <span className="h-bar-label">{ch.name}</span>
                      <div className="h-bar-track">
                        <div
                          className="h-bar-fill"
                          style={{
                            width: `${(Math.abs(ch.returnPercent) / maxPct) * 100}%`,
                            background: ch.returnPercent >= 0 ? '#059669' : '#dc2626',
                          }}
                        />
                      </div>
                      <span className={`h-bar-value ${ch.returnPercent >= 0 ? 'positive-return' : 'negative-return'}`}>
                        {formatPercent(ch.returnPercent)}
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
