import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useInvestmentChannels } from '../contexts/InvestmentChannelsContext'
import { useInvestmentDeposits } from '../contexts/InvestmentDepositsContext'
import { useInvestmentValues } from '../contexts/InvestmentValuesContext'
import { FilterMultiSelect } from '../components/common/FilterMultiSelect'
import DateInput from '../components/common/DatePicker'
import { ChartFilterPopover } from '../components/common/ChartFilterPopover'
import { computeChannelSummary, CASH_PATH_LABEL } from '../lib/computeChannelSummary'
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
  now.setMonth(now.getMonth() - months + 1)
  now.setDate(1)
  return now.toISOString().slice(0, 10)
}

export function InvestmentsChartsPage() {
  const { channels, loading: chLoading, fetchChannels } = useInvestmentChannels()
  const { deposits, loading: depLoading, fetchDeposits } = useInvestmentDeposits()
  const { valueUpdates, loading: valLoading, fetchValueUpdates } = useInvestmentValues()

  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [channelsInited, setChannelsInited] = useState(false)
  const [groupBy, setGroupBy] = useState<'channel' | 'path' | 'depositor'>('channel')

  useEffect(() => { fetchChannels() }, [fetchChannels])
  useEffect(() => { fetchDeposits() }, [fetchDeposits])
  useEffect(() => { fetchValueUpdates() }, [fetchValueUpdates])

  // Channel filter options
  const channelOptions = useMemo(() =>
    channels.map(ch => ({ value: ch.id, label: `${ch.name} - ${ch.company}` })),
  [channels])

  // Init selected channels to all when data loads
  useEffect(() => {
    if (!channelsInited && channelOptions.length > 0) {
      setSelectedChannels(channelOptions.map(o => o.value))
      setChannelsInited(true)
    }
  }, [channelOptions, channelsInited])

  // Filter deposits and value updates by time range
  const filteredDeposits = useMemo(() => {
    const minDate = getMinDate(timeRange, customFrom)
    const maxDate = timeRange === 'custom' && customTo ? customTo : '9999-12-31'
    let list = deposits.filter(d => d.date >= minDate && d.date <= maxDate)
    if (selectedChannels.length < channels.length) {
      const set = new Set(selectedChannels)
      list = list.filter(d => set.has(d.channel_id))
    }
    return list
  }, [deposits, timeRange, customFrom, customTo, selectedChannels, channels.length])

  const filteredValues = useMemo(() => {
    const minDate = getMinDate(timeRange, customFrom)
    const maxDate = timeRange === 'custom' && customTo ? customTo : '9999-12-31'
    let list = valueUpdates.filter(v => v.date >= minDate && v.date <= maxDate)
    if (selectedChannels.length < channels.length) {
      const set = new Set(selectedChannels)
      list = list.filter(v => set.has(v.channel_id))
    }
    return list
  }, [valueUpdates, timeRange, customFrom, customTo, selectedChannels, channels.length])

  const filteredChannels = useMemo(() => {
    if (selectedChannels.length < channels.length) {
      const set = new Set(selectedChannels)
      return channels.filter(ch => set.has(ch.id))
    }
    return channels
  }, [channels, selectedChannels])

  const summaries = useMemo(() => {
    return filteredChannels.map(ch => {
      const isCash = ch.investment_path === CASH_PATH_LABEL
      const summary = computeChannelSummary(ch.id, filteredDeposits, filteredValues, isCash)
      return { ...ch, ...summary }
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

  const isLoading = chLoading || depLoading || valLoading

  // Chart data grouped by selected dimension
  const chartEntries = useMemo(() => {
    if (groupBy === 'channel') {
      return summaries
        .filter(ch => ch.currentValue > 0)
        .sort((a, b) => b.currentValue - a.currentValue)
        .map(ch => ({ label: ch.name, value: ch.currentValue }))
    }

    if (groupBy === 'path') {
      const byPath: Record<string, number> = {}
      for (const ch of summaries) {
        if (ch.currentValue <= 0) continue
        const path = ch.investment_path || 'ללא מסלול'
        byPath[path] = (byPath[path] || 0) + ch.currentValue
      }
      return Object.entries(byPath)
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value }))
    }

    // groupBy === 'depositor'
    const byDepositor: Record<string, number> = {}
    for (const ch of summaries) {
      if (ch.currentValue <= 0) continue
      // Calculate each depositor's share of this channel's deposits
      const chDeposits = filteredDeposits.filter(d => d.channel_id === ch.id && !d.is_withdrawal)
      const totalChDeposits = chDeposits.reduce((s, d) => s + d.amount, 0)
      if (totalChDeposits <= 0) continue
      const depositorTotals: Record<string, number> = {}
      for (const d of chDeposits) {
        depositorTotals[d.depositor] = (depositorTotals[d.depositor] || 0) + d.amount
      }
      for (const [depositor, depTotal] of Object.entries(depositorTotals)) {
        const share = (depTotal / totalChDeposits) * ch.currentValue
        byDepositor[depositor] = (byDepositor[depositor] || 0) + share
      }
    }
    return Object.entries(byDepositor)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }))
  }, [groupBy, summaries, filteredDeposits])

  const chartTotal = chartEntries.reduce((s, e) => s + e.value, 0)
  const chartMax = chartEntries.length > 0 ? chartEntries[0].value : 1

  const groupByLabels: Record<string, string> = {
    channel: 'אפיק',
    path: 'מסלול השקעה',
    depositor: 'מפקיד',
  }

  const hasActiveFilters = useMemo(() => {
    if (selectedChannels.length > 0 && selectedChannels.length < channelOptions.length) return true
    if (timeRange !== 'all') return true
    if (customFrom || customTo) return true
    return false
  }, [selectedChannels, channelOptions.length, timeRange, customFrom, customTo])

  const clearFilters = () => {
    setSelectedChannels(channelOptions.map(o => o.value))
    setTimeRange('all')
    setCustomFrom('')
    setCustomTo('')
  }

  // Return over time: compute total return % at the 15th of each month, max 12 points
  const returnOverTime = useMemo(() => {
    const channelSet = new Set(filteredChannels.map(ch => ch.id))

    // All deposits and value updates for selected channels (unfiltered by time)
    const channelDeposits = deposits.filter(d => channelSet.has(d.channel_id))
    const channelValues = valueUpdates.filter(v => channelSet.has(v.channel_id))

    // All events within the filtered range (deposits + value updates)
    const allFilteredDates = [
      ...filteredDeposits.map(d => d.date),
      ...filteredValues.map(v => v.date),
    ]
    if (allFilteredDates.length === 0) return []

    // Determine date range from all filtered events
    const sortedDates = [...new Set(allFilteredDates)].sort()
    const firstDate = sortedDates[0]
    const firstD = new Date(firstDate + 'T00:00:00')
    // Extend sampling to today (or custom filter end), not just the last event date
    const todayStr = new Date().toISOString().slice(0, 10)
    const endDateStr = timeRange === 'custom' && customTo ? customTo : todayStr
    const endD = new Date(endDateStr + 'T00:00:00')
    const endMonthEnd = new Date(endD.getFullYear(), endD.getMonth() + 1, 0)

    // Build list of last-day-of-month dates spanning the range
    const monthlyDates: string[] = []
    const cursor = new Date(firstD.getFullYear(), firstD.getMonth() + 1, 0) // last day of firstD's month
    if (cursor < firstD) {
      // move to last day of next month
      cursor.setMonth(cursor.getMonth() + 2)
      cursor.setDate(0)
    }
    while (cursor <= endMonthEnd) {
      const y = cursor.getFullYear()
      const m = String(cursor.getMonth() + 1).padStart(2, '0')
      const d = String(cursor.getDate()).padStart(2, '0')
      monthlyDates.push(`${y}-${m}-${d}`)
      // Move to last day of next month
      cursor.setMonth(cursor.getMonth() + 2)
      cursor.setDate(0)
    }

    // If no 15th falls in range, use the actual event dates (capped at 12)
    const sampledDates = monthlyDates.length > 0
      ? monthlyDates.slice(-12)
      : sortedDates.slice(-12)

    const points: { date: string; returnPct: number }[] = []

    for (const date of sampledDates) {
      // Use the event sourcing engine with events up to this date
      const depositsToDate = channelDeposits.filter(d => d.date <= date)
      const valuesToDate = channelValues.filter(v => v.date <= date)

      let totalInvested = 0
      let totalValue = 0

      for (const ch of filteredChannels) {
        const isCash = ch.investment_path === CASH_PATH_LABEL
        const summary = computeChannelSummary(ch.id, depositsToDate, valuesToDate, isCash)
        totalInvested += summary.totalDeposits
        totalValue += summary.currentValue
      }

      if (totalInvested <= 0) continue

      const pct = ((totalValue - totalInvested) / totalInvested) * 100
      points.push({ date, returnPct: pct })
    }

    return points
  }, [filteredDeposits, filteredValues, filteredChannels, deposits, valueUpdates, timeRange, customTo])

  return (
    <div className="section-page">
      <div className="section-header">
        <h1>השקעות</h1>
        <div className="section-header-actions">
          {!isLoading && channels.length > 0 && (
            <ChartFilterPopover hasActive={hasActiveFilters} onClear={clearFilters}>
              <div className="filter-popover-field">
                <div className="filter-popover-label">אפיק השקעה</div>
                <FilterMultiSelect
                  options={channelOptions}
                  value={selectedChannels}
                  placeholder="הכל"
                  onChange={setSelectedChannels}
                />
              </div>
              <div className="filter-popover-field">
                <div className="filter-popover-label">טווח זמן</div>
                <div className="filter-tabs">
                  <button type="button" className={`filter-tab${timeRange === 'last6' ? ' active' : ''}`} onClick={() => setTimeRange('last6')}>6 חודשים</button>
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
            </ChartFilterPopover>
          )}
          <div className="section-tabs">
            <NavLink to="/investments" end className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
              טבלה
            </NavLink>
            <NavLink to="/investments/charts" className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
              גרפים
            </NavLink>
          </div>
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
              <div className="label">הפקדות (נטו)</div>
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

          {returnOverTime.length >= 2 && (() => {
            const minPct = Math.min(...returnOverTime.map(p => p.returnPct))
            const maxPct = Math.max(...returnOverTime.map(p => p.returnPct))
            const rawRange = maxPct - minPct || 1

            // Pick a nice step size: 0.5, 1, 2, 5, 10, 20, 50...
            const niceSteps = [0.5, 1, 2, 5, 10, 20, 50]
            const idealStep = rawRange / 5
            const step = niceSteps.find(s => s >= idealStep) ?? Math.ceil(idealStep / 10) * 10

            // Round min/max to step boundaries
            const yMin = Math.floor(minPct / step) * step - step
            const yMax = Math.ceil(maxPct / step) * step + step
            const yRange = yMax - yMin

            const svgW = 800
            const svgH = 240
            const padL = 60
            const padR = 40
            const padT = 28
            const padB = 32
            const chartW = svgW - padL - padR
            const chartH = svgH - padT - padB

            const dataInset = 12
            const toX = (i: number) => padL + dataInset + (i / (returnOverTime.length - 1)) * (chartW - dataInset)
            const toY = (pct: number) => padT + (1 - (pct - yMin) / yRange) * chartH

            const pathD = returnOverTime
              .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.returnPct).toFixed(1)}`)
              .join(' ')

            // Y-axis gridlines at nice step intervals
            const gridLines: { pct: number; y: number }[] = []
            for (let v = yMin; v <= yMax; v += step) {
              gridLines.push({ pct: v, y: toY(v) })
            }

            // Format grid label: show decimal only if step is 0.5
            const fmtGrid = (v: number) => (step < 1 ? v.toFixed(1) : v.toFixed(0)) + '%'

            // X-axis labels — show every data point
            const labelIndices = returnOverTime.map((_, i) => i)

            // Zero line
            const zeroY = yMin <= 0 && yMax >= 0 ? toY(0) : null

            return (
              <div className="chart-card">
                <h3>תשואה כוללת לאורך זמן</h3>
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="line-chart-svg">
                  {/* Grid lines */}
                  {gridLines.map((g, i) => (
                    <g key={i}>
                      <line x1={padL} x2={svgW - padR} y1={g.y} y2={g.y} stroke="var(--border-light)" strokeWidth="1" />
                      <text x={padL - 8} y={g.y + 4} textAnchor="end" fontSize="11" fill="var(--text)" fontFamily="var(--sans)" direction="ltr">
                        {fmtGrid(g.pct)}
                      </text>
                    </g>
                  ))}
                  {/* Zero line */}
                  {zeroY !== null && (
                    <line x1={padL} x2={svgW - padR} y1={zeroY} y2={zeroY} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 3" />
                  )}
                  {/* Line */}
                  <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                  {/* Dots + labels */}
                  {returnOverTime.map((p, i) => (
                    <g key={i}>
                      <circle cx={toX(i)} cy={toY(p.returnPct)} r="3.5" fill="var(--accent)" />
                      <text x={toX(i)} y={toY(p.returnPct) - 10} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text-h)" fontFamily="var(--sans)" direction="ltr">
                        {p.returnPct.toFixed(1)}%
                      </text>
                    </g>
                  ))}
                  {/* X-axis labels */}
                  {labelIndices.map(i => {
                    const p = returnOverTime[i]
                    const d = new Date(p.date + 'T00:00:00')
                    const label = d.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' })
                    return (
                      <text key={i} x={toX(i)} y={svgH - 4} textAnchor="middle" fontSize="11" fill="var(--text)" fontFamily="var(--sans)">
                        {label}
                      </text>
                    )
                  })}
                </svg>
              </div>
            )
          })()}

          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>התפלגות השקעות לפי {groupByLabels[groupBy]}</h3>
              <div className="filter-tabs" style={{ width: 'auto' }}>
                <button type="button" className={`filter-tab${groupBy === 'channel' ? ' active' : ''}`} onClick={() => setGroupBy('channel')}>אפיק</button>
                <button type="button" className={`filter-tab${groupBy === 'path' ? ' active' : ''}`} onClick={() => setGroupBy('path')}>מסלול השקעה</button>
                <button type="button" className={`filter-tab${groupBy === 'depositor' ? ' active' : ''}`} onClick={() => setGroupBy('depositor')}>מפקיד</button>
              </div>
            </div>
            <div className="h-bar-chart">
              {chartEntries.map((entry, i) => {
                const widthPct = (entry.value / chartMax) * 100
                const pct = (entry.value / chartTotal) * 100
                const narrow = widthPct < 12
                return (
                  <div className="h-bar-row" key={entry.label}>
                    <span className="h-bar-label">{entry.label}</span>
                    <div className="h-bar-track">
                      <div
                        className="h-bar-fill"
                        style={{
                          width: `${widthPct}%`,
                          background: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
                        }}
                      >
                        {!narrow && <span className="h-bar-pct">{pct.toFixed(1)}%</span>}
                      </div>
                      {narrow && <span className="h-bar-pct-out">{pct.toFixed(1)}%</span>}
                    </div>
                    <span className="h-bar-value">{formatCurrency(entry.value)}</span>
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
