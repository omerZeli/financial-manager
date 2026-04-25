import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useInvestmentChannels } from '../contexts/InvestmentChannelsContext'
import { useInvestmentDeposits } from '../contexts/InvestmentDepositsContext'
import { useInvestmentValues } from '../contexts/InvestmentValuesContext'
import { ReadOnlySelect } from '../components/common/ReadOnlySelect'
import DateInput from '../components/common/DateInput'
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

type TimeRange = 'last6' | 'last12' | 'all' | 'custom'

function getMinDate(range: TimeRange, customFrom: string): string {
  if (range === 'custom') return customFrom
  if (range === 'all') return '0000-01-01'
  const now = new Date()
  const months = range === 'last6' ? 6 : 12
  now.setMonth(now.getMonth() - months)
  return now.toISOString().slice(0, 10)
}

export function InvestmentsChartsPage() {
  const { channels, loading: chLoading, fetchChannels } = useInvestmentChannels()
  const { deposits, loading: depLoading, fetchDeposits } = useInvestmentDeposits()
  const { valueUpdates, loading: valLoading, fetchValueUpdates } = useInvestmentValues()

  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [channelFilter, setChannelFilter] = useState('')

  useEffect(() => { fetchChannels() }, [fetchChannels])
  useEffect(() => { fetchDeposits() }, [fetchDeposits])
  useEffect(() => { fetchValueUpdates() }, [fetchValueUpdates])

  // Channel filter options
  const channelOptions = useMemo(() => [
    { value: '', label: 'הכל' },
    ...channels.map(ch => ({ value: ch.id, label: `${ch.name} - ${ch.company}` })),
  ], [channels])

  // Filter deposits and value updates by time range
  const filteredDeposits = useMemo(() => {
    const minDate = getMinDate(timeRange, customFrom)
    const maxDate = timeRange === 'custom' && customTo ? customTo : '9999-12-31'
    let list = deposits.filter(d => d.date >= minDate && d.date <= maxDate)
    if (channelFilter) list = list.filter(d => d.channel_id === channelFilter)
    return list
  }, [deposits, timeRange, customFrom, customTo, channelFilter])

  const filteredValues = useMemo(() => {
    const minDate = getMinDate(timeRange, customFrom)
    const maxDate = timeRange === 'custom' && customTo ? customTo : '9999-12-31'
    let list = valueUpdates.filter(v => v.date >= minDate && v.date <= maxDate)
    if (channelFilter) list = list.filter(v => v.channel_id === channelFilter)
    return list
  }, [valueUpdates, timeRange, customFrom, customTo, channelFilter])

  const filteredChannels = useMemo(() => {
    if (channelFilter) return channels.filter(ch => ch.id === channelFilter)
    return channels
  }, [channels, channelFilter])

  const summaries = useMemo(() => {
    return filteredChannels.map(ch => {
      const chDeposits = filteredDeposits.filter(d => d.channel_id === ch.id)
      const totalDeposits = chDeposits.reduce((s, d) => s + (d.is_withdrawal ? -d.amount : d.amount), 0)
      // For current value, use the latest value update within the filtered range
      const chValues = filteredValues.filter(v => v.channel_id === ch.id).sort((a, b) => b.date.localeCompare(a.date))
      const currentValue = chValues.length > 0 ? chValues[0].value : 0
      const returnAbsolute = currentValue - totalDeposits
      const returnPercent = totalDeposits > 0 ? returnAbsolute / totalDeposits : 0
      return { ...ch, totalDeposits, currentValue, returnAbsolute, returnPercent }
    })
  }, [filteredChannels, filteredDeposits, filteredValues])

  const totalDeposited = summaries.reduce((s, c) => s + c.totalDeposits, 0)
  const totalCurrentValue = summaries.reduce((s, c) => s + c.currentValue, 0)
  const totalReturn = totalCurrentValue - totalDeposited
  const totalReturnPercent = totalDeposited > 0 ? totalReturn / totalDeposited : 0

  // Earliest deposit date across filtered channels → investment duration
  const investmentDuration = useMemo(() => {
    const allDates = filteredDeposits.filter(d => !d.is_withdrawal).map(d => d.date)
    if (allDates.length === 0) return { label: '-', months: 0 }
    const earliest = allDates.sort()[0]
    const start = new Date(earliest)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const totalMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44)
    const years = Math.floor(totalMonths / 12)
    const months = Math.round(totalMonths % 12)
    const parts: string[] = []
    if (years > 0) parts.push(`${years} שנים`)
    if (months > 0 || years === 0) parts.push(`${months} חודשים`)
    return { label: parts.join(' ו-'), months: totalMonths }
  }, [filteredDeposits])

  // Average yearly return (annualized via monthly CAGR)
  const avgYearlyReturn = investmentDuration.months > 0
    ? Math.pow(1 + totalReturnPercent, 12 / investmentDuration.months) - 1
    : 0

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
          {/* Filters */}
          <div className="charts-filters">
            <div className="filter-group">
              <label className="filter-label">אפיק השקעה</label>
              <ReadOnlySelect
                options={channelOptions}
                value={channelFilter}
                placeholder="הכל"
                onChange={setChannelFilter}
              />
            </div>
            <div className="filter-group">
              <label className="filter-label">טווח זמן</label>
              <div className="filter-tabs">
                <button type="button" className={`filter-tab${timeRange === 'last6' ? ' active' : ''}`} onClick={() => setTimeRange('last6')}>6 חודשים</button>
                <button type="button" className={`filter-tab${timeRange === 'last12' ? ' active' : ''}`} onClick={() => setTimeRange('last12')}>שנה</button>
                <button type="button" className={`filter-tab${timeRange === 'all' ? ' active' : ''}`} onClick={() => setTimeRange('all')}>הכל</button>
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

          <div className="summary-row">
            <div className="summary-card">
              <div className="label">שווי נוכחי</div>
              <div className="value">{formatCurrency(totalCurrentValue)}</div>
            </div>
            <div className="summary-card">
              <div className="label">הפקדות (נטו)</div>
              <div className="value">{formatCurrency(totalDeposited)}</div>
            </div>
            <div className="summary-card">
              <div className="label">תשואה כוללת</div>
              <div className={`value ${totalReturn >= 0 ? 'positive-return' : 'negative-return'}`}>
                {formatCurrency(totalReturn)} ({formatPercent(totalReturnPercent)})
              </div>
            </div>
          </div>
          <div className="summary-row">
            <div className="summary-card">
              <div className="label">זמן השקעה</div>
              <div className="value value-sm">{investmentDuration.label}</div>
            </div>
            <div className="summary-card">
              <div className="label">תשואה שנתית ממוצעת</div>
              <div className={`value ${avgYearlyReturn >= 0 ? 'positive-return' : 'negative-return'}`}>
                {formatCurrency(avgYearlyReturn * totalDeposited)} ({formatPercent(avgYearlyReturn)})
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
