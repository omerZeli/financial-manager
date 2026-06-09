import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useInvestmentChannels } from '../contexts/InvestmentChannelsContext'
import { useInvestmentDeposits } from '../contexts/InvestmentDepositsContext'
import { useInvestmentValues } from '../contexts/InvestmentValuesContext'
import { useSalary } from '../contexts/SalaryContext'
import { FilterMultiSelect } from '../components/common/FilterMultiSelect'
import DateInput from '../components/common/DatePicker'
import { ChartFilterPopover } from '../components/common/ChartFilterPopover'
import { computeChannelSummary, CASH_PATH_LABEL } from '../lib/computeChannelSummary'
import { formatLocalDate, todayStr as getTodayStr } from '../lib/dateUtils'
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
  now.setDate(1)
  return formatLocalDate(now)
}

export function InvestmentsChartsPage() {
  const { channels, loading: chLoading, fetchChannels } = useInvestmentChannels()
  const { deposits, loading: depLoading, fetchDeposits } = useInvestmentDeposits()
  const { valueUpdates, loading: valLoading, fetchValueUpdates } = useInvestmentValues()
  const { salaries, fetchSalaries } = useSalary()

  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [channelsInited, setChannelsInited] = useState(false)
  const [groupBy, setGroupBy] = useState<'channel' | 'path' | 'depositor'>('channel')
  const [returnChartMode, setReturnChartMode] = useState<'return' | 'value'>('return')
  const [pensionFilter, setPensionFilter] = useState<'all' | 'pension' | 'noPension'>('all')

  useEffect(() => { fetchChannels() }, [fetchChannels])
  useEffect(() => { fetchDeposits() }, [fetchDeposits])
  useEffect(() => { fetchValueUpdates() }, [fetchValueUpdates])
  useEffect(() => { fetchSalaries() }, [fetchSalaries])

  // Build salary month map for effective date computation
  const salaryMonthMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of salaries) {
      map.set(s.id, s.month)
    }
    return map
  }, [salaries])

  // Set of employer names for identifying employer deposits
  const employerNames = useMemo(() => new Set(salaries.map(s => s.employer)), [salaries])

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

  // Set of channel IDs after pension + channel selection filters
  const filteredChannels = useMemo(() => {
    let list = channels
    if (pensionFilter === 'pension') list = list.filter(ch => ch.is_pension)
    else if (pensionFilter === 'noPension') list = list.filter(ch => !ch.is_pension)
    if (selectedChannels.length < channels.length) {
      const set = new Set(selectedChannels)
      list = list.filter(ch => set.has(ch.id))
    }
    return list
  }, [channels, selectedChannels, pensionFilter])

  const filteredChannelIds = useMemo(() => new Set(filteredChannels.map(ch => ch.id)), [filteredChannels])

  // Filter deposits and value updates by time range and filtered channels
  const filteredDeposits = useMemo(() => {
    const minDate = getMinDate(timeRange, customFrom)
    const maxDate = timeRange === 'custom' && customTo ? customTo : '9999-12-31'
    return deposits.filter(d => {
      if (!filteredChannelIds.has(d.channel_id)) return false
      let effectiveDate: string
      if (d.salary_id && salaryMonthMap.has(d.salary_id)) {
        // Linked to a salary — use that salary's month
        effectiveDate = salaryMonthMap.get(d.salary_id)!
      } else if (employerNames.has(d.depositor) && !d.is_withdrawal) {
        // Employer deposit without salary link — shift back 1 month
        const dt = new Date(d.date + 'T00:00:00')
        dt.setMonth(dt.getMonth() - 1)
        effectiveDate = formatLocalDate(dt)
      } else {
        effectiveDate = d.date
      }
      return effectiveDate >= minDate && effectiveDate <= maxDate
    })
  }, [deposits, timeRange, customFrom, customTo, filteredChannelIds, salaryMonthMap, employerNames])

  const filteredValues = useMemo(() => {
    const minDate = getMinDate(timeRange, customFrom)
    const maxDate = timeRange === 'custom' && customTo ? customTo : '9999-12-31'
    return valueUpdates.filter(v => v.date >= minDate && v.date <= maxDate && filteredChannelIds.has(v.channel_id))
  }, [valueUpdates, timeRange, customFrom, customTo, filteredChannelIds])

  const isFiltered = timeRange !== 'all'

  const summaries = useMemo(() => {
    return filteredChannels.map(ch => {
      const isCash = ch.investment_path === CASH_PATH_LABEL
      const summary = computeChannelSummary(ch.id, filteredDeposits, filteredValues, isCash)
      return { ...ch, ...summary, isCash }
    })
  }, [filteredChannels, filteredDeposits, filteredValues])

  // Cash channels have fake deposits (value = deposits), so exclude them from
  // the deposits card and return calculations. They still count toward current value.
  const nonCashSummaries = useMemo(() => summaries.filter(s => !s.isCash), [summaries])
  const nonCashChannels = useMemo(() => filteredChannels.filter(ch => ch.investment_path !== CASH_PATH_LABEL), [filteredChannels])
  const cashChannelIds = useMemo(() => new Set(filteredChannels.filter(ch => ch.investment_path === CASH_PATH_LABEL).map(ch => ch.id)), [filteredChannels])

  // Gross deposits in range (excluding cash channels and withdrawals) for the deposits card
  const totalDeposited = useMemo(() => {
    return filteredDeposits
      .filter(d => !cashChannelIds.has(d.channel_id) && !d.is_withdrawal)
      .reduce((s, d) => s + d.amount, 0)
  }, [filteredDeposits, cashChannelIds])
  const totalCurrentValue = summaries.reduce((s, c) => s + c.currentValue, 0)

  // Compute total return correctly for filtered time ranges.
  // When a time filter is active, we compare the portfolio value at the start
  // of the range to the value at the end, subtracting net cash flows in the range.
  // Formula: return = (endValue - startValue) - netCashFlowInRange
  const { totalReturn, totalReturnPercent } = useMemo(() => {
    if (!isFiltered) {
      // No time filter — use net invested capital from non-cash summaries
      const nonCashValue = nonCashSummaries.reduce((s, c) => s + c.currentValue, 0)
      const netInvested = nonCashSummaries.reduce((s, c) => s + c.totalDeposits, 0)
      const ret = nonCashValue - netInvested
      return { totalReturn: ret, totalReturnPercent: netInvested > 0 ? ret / netInvested : 0 }
    }

    const minDate = getMinDate(timeRange, customFrom)
    const maxDate = timeRange === 'custom' && customTo ? customTo : '9999-12-31'
    const channelSet = new Set(nonCashChannels.map(ch => ch.id))

    // Events before the range start → opening balance per channel (non-cash only)
    const depositsBeforeRange = deposits.filter(d => channelSet.has(d.channel_id) && d.date < minDate)
    const valuesBeforeRange = valueUpdates.filter(v => channelSet.has(v.channel_id) && v.date < minDate)

    // Events up to the range end → closing balance per channel (non-cash only)
    const depositsToEnd = deposits.filter(d => channelSet.has(d.channel_id) && d.date <= maxDate)
    const valuesToEnd = valueUpdates.filter(v => channelSet.has(v.channel_id) && v.date <= maxDate)

    let openingValue = 0
    let closingValue = 0

    for (const ch of nonCashChannels) {
      const startSummary = computeChannelSummary(ch.id, depositsBeforeRange, valuesBeforeRange, false)
      const endSummary = computeChannelSummary(ch.id, depositsToEnd, valuesToEnd, false)
      openingValue += startSummary.currentValue
      closingValue += endSummary.currentValue
    }

    // Net cash flow within the range (deposits minus withdrawals), excluding cash channels
    const nonCashFilteredDeposits = filteredDeposits.filter(d => !cashChannelIds.has(d.channel_id))
    const netCashFlow = nonCashFilteredDeposits.reduce((sum, d) => {
      return sum + (d.is_withdrawal ? -d.amount : d.amount)
    }, 0)

    const ret = (closingValue - openingValue) - netCashFlow
    // Base for percentage: opening value + deposits in range (the capital at risk)
    const base = openingValue + nonCashFilteredDeposits.filter(d => !d.is_withdrawal).reduce((s, d) => s + d.amount, 0)
    return { totalReturn: ret, totalReturnPercent: base > 0 ? ret / base : 0 }
  }, [isFiltered, timeRange, customFrom, customTo, nonCashSummaries, nonCashChannels, cashChannelIds, filteredDeposits, deposits, valueUpdates])

  // Investment duration — when filtered, use the filter range length; otherwise earliest deposit to today
  const investmentDuration = useMemo(() => {
    if (isFiltered) {
      // For preset ranges, use the exact month count to avoid floating-point drift
      if (timeRange === 'last6' || timeRange === 'last12') {
        const totalMonths = timeRange === 'last6' ? 6 : 12
        const years = Math.floor(totalMonths / 12)
        const months = totalMonths % 12
        const parts: string[] = []
        if (years > 0) parts.push(`${years} שנים`)
        if (months > 0 || years === 0) parts.push(`${months} חודשים`)
        return { label: parts.join(' ו-'), months: totalMonths }
      }
      const minDate = getMinDate(timeRange, customFrom)
      const maxDate = timeRange === 'custom' && customTo ? customTo : getTodayStr()
      const start = new Date(minDate)
      const end = new Date(maxDate)
      const totalMonths = Math.max((end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()), 0)
      const years = Math.floor(totalMonths / 12)
      const months = totalMonths % 12
      const parts: string[] = []
      if (years > 0) parts.push(`${years} שנים`)
      if (months > 0 || years === 0) parts.push(`${months} חודשים`)
      return { label: parts.join(' ו-'), months: totalMonths }
    }
    const allDates = filteredDeposits.filter(d => !d.is_withdrawal && !cashChannelIds.has(d.channel_id)).map(d => d.date)
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
  }, [isFiltered, timeRange, customFrom, customTo, filteredDeposits, cashChannelIds])

  // Average yearly return (simple annualization)
  const avgYearlyReturn = investmentDuration.months > 0
    ? totalReturnPercent * (12 / investmentDuration.months)
    : 0
  const avgYearlyReturnAbs = investmentDuration.months > 0
    ? totalReturn * (12 / investmentDuration.months)
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
    if (pensionFilter !== 'all') return true
    return false
  }, [selectedChannels, channelOptions.length, timeRange, customFrom, customTo, pensionFilter])

  const clearFilters = () => {
    setSelectedChannels(channelOptions.map(o => o.value))
    setTimeRange('all')
    setCustomFrom('')
    setCustomTo('')
    setPensionFilter('all')
  }

  // Return over time & value over time: compute at the last day of each month
  const { returnOverTime, valueOverTime } = useMemo(() => {
    const nonCashChannelSet = new Set(nonCashChannels.map(ch => ch.id))

    // All deposits and value updates for selected non-cash channels (unfiltered by time)
    const nonCashAllDeposits = deposits.filter(d => nonCashChannelSet.has(d.channel_id))
    const nonCashAllValues = valueUpdates.filter(v => nonCashChannelSet.has(v.channel_id))

    // All deposits and value updates for ALL selected channels (including cash) — for value chart
    const allChannelSet = new Set(filteredChannels.map(ch => ch.id))
    const allChannelDeposits = deposits.filter(d => allChannelSet.has(d.channel_id))
    const allChannelValues = valueUpdates.filter(v => allChannelSet.has(v.channel_id))

    // Events within the filtered range (all channels)
    const allFilteredDates = [
      ...filteredDeposits.map(d => d.date),
      ...filteredValues.map(v => v.date),
    ]
    if (allFilteredDates.length === 0) return { returnOverTime: [], valueOverTime: [] }

    // Determine date range from all filtered events
    const sortedDates = [...new Set(allFilteredDates)].sort()
    const firstDate = sortedDates[0]
    const firstD = new Date(firstDate + 'T00:00:00')
    const todayStr = getTodayStr()
    const endDateStr = timeRange === 'custom' && customTo ? customTo : todayStr
    const endD = new Date(endDateStr + 'T00:00:00')
    const endMonthEnd = new Date(endD.getFullYear(), endD.getMonth() + 1, 0)

    // Build list of last-day-of-month dates spanning the range
    const monthlyDates: string[] = []
    let curYear = firstD.getFullYear()
    let curMonth = firstD.getMonth()
    while (true) {
      const lastDay = new Date(curYear, curMonth + 1, 0)
      if (lastDay > endMonthEnd) break
      if (lastDay >= firstD) {
        const y = lastDay.getFullYear()
        const m = String(lastDay.getMonth() + 1).padStart(2, '0')
        const d = String(lastDay.getDate()).padStart(2, '0')
        monthlyDates.push(`${y}-${m}-${d}`)
      }
      curMonth++
      if (curMonth > 11) { curMonth = 0; curYear++ }
    }

    if (monthlyDates.length > 0 && monthlyDates[monthlyDates.length - 1] > todayStr) {
      monthlyDates.pop()
    }

    const sampledDates = monthlyDates.length > 0
      ? monthlyDates.slice(-18)
      : sortedDates.slice(-18)

    const returnPoints: { date: string; returnPct: number }[] = []
    const valuePoints: { date: string; totalValue: number }[] = []

    for (const date of sampledDates) {
      // Return chart: non-cash channels only
      const ncDepositsToDate = nonCashAllDeposits.filter(d => d.date <= date)
      const ncValuesToDate = nonCashAllValues.filter(v => v.date <= date)

      let totalInvested = 0
      let totalNonCashValue = 0

      for (const ch of nonCashChannels) {
        const summary = computeChannelSummary(ch.id, ncDepositsToDate, ncValuesToDate, false)
        totalInvested += summary.totalDeposits
        totalNonCashValue += summary.currentValue
      }

      if (totalInvested > 0) {
        const pct = ((totalNonCashValue - totalInvested) / totalInvested) * 100
        returnPoints.push({ date, returnPct: pct })
      }

      // Value chart: all channels (including cash)
      const allDepositsToDate = allChannelDeposits.filter(d => d.date <= date)
      const allValuesToDate = allChannelValues.filter(v => v.date <= date)

      let totalAllValue = 0
      for (const ch of filteredChannels) {
        const isCash = ch.investment_path === CASH_PATH_LABEL
        const summary = computeChannelSummary(ch.id, allDepositsToDate, allValuesToDate, isCash)
        totalAllValue += summary.currentValue
      }

      valuePoints.push({ date, totalValue: totalAllValue })
    }

    return { returnOverTime: returnPoints, valueOverTime: valuePoints }
  }, [filteredDeposits, filteredValues, filteredChannels, nonCashChannels, deposits, valueUpdates, timeRange, customTo])

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
                <div className="filter-popover-label">סוג אפיק</div>
                <div className="filter-tabs">
                  <button type="button" className={`filter-tab${pensionFilter === 'all' ? ' active' : ''}`} onClick={() => setPensionFilter('all')}>הכל</button>
                  <button type="button" className={`filter-tab${pensionFilter === 'pension' ? ' active' : ''}`} onClick={() => setPensionFilter('pension')}>פנסיוני</button>
                  <button type="button" className={`filter-tab${pensionFilter === 'noPension' ? ' active' : ''}`} onClick={() => setPensionFilter('noPension')}>לא פנסיוני</button>
                </div>
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
              <div className="label">הפקדות</div>
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
                {formatCurrency(avgYearlyReturnAbs)} ({formatPercent(avgYearlyReturn)})
              </div>
            </div>
          </div>

          {(returnOverTime.length >= 2 || valueOverTime.length >= 2) && (() => {
            const showReturn = returnChartMode === 'return'
            const activeData = showReturn ? returnOverTime : valueOverTime
            if (activeData.length < 2) return null

            const values = showReturn
              ? (activeData as typeof returnOverTime).map(p => p.returnPct)
              : (activeData as typeof valueOverTime).map(p => p.totalValue)

            const minVal = Math.min(...values)
            const maxVal = Math.max(...values)
            const rawRange = maxVal - minVal || 1

            // Pick a nice step size
            let niceSteps: number[]
            let step: number
            if (showReturn) {
              niceSteps = [0.5, 1, 2, 5, 10, 20, 50]
              const idealStep = rawRange / 5
              step = niceSteps.find(s => s >= idealStep) ?? Math.ceil(idealStep / 10) * 10
            } else {
              // Currency values — pick steps in thousands
              const idealStep = rawRange / 5
              const magnitude = Math.pow(10, Math.floor(Math.log10(idealStep)))
              const candidates = [1, 2, 5, 10].map(m => m * magnitude)
              step = candidates.find(s => s >= idealStep) ?? candidates[candidates.length - 1]
            }

            const yMin = Math.floor(minVal / step) * step - step
            const yMax = Math.ceil(maxVal / step) * step + step
            const yRange = yMax - yMin

            const svgW = 800
            const svgH = 240
            const padL = showReturn ? 60 : 80
            const padR = 40
            const padT = 28
            const padB = 32
            const chartW = svgW - padL - padR
            const chartH = svgH - padT - padB

            const dataInset = 12
            const toX = (i: number) => padL + dataInset + (i / (activeData.length - 1)) * (chartW - dataInset)
            const toY = (v: number) => padT + (1 - (v - yMin) / yRange) * chartH

            const pathD = activeData
              .map((p, i) => {
                const v = showReturn ? (p as typeof returnOverTime[0]).returnPct : (p as typeof valueOverTime[0]).totalValue
                return `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`
              })
              .join(' ')

            // Y-axis gridlines
            const gridLines: { val: number; y: number }[] = []
            for (let v = yMin; v <= yMax; v += step) {
              gridLines.push({ val: v, y: toY(v) })
            }

            const fmtGrid = (v: number) => {
              if (showReturn) return ((step < 1 ? v.toFixed(1) : v.toFixed(0)) + '%')
              return v >= 1000 ? `${(v / 1000).toLocaleString('he-IL')}K` : v.toLocaleString('he-IL')
            }

            const fmtDot = (v: number) => {
              if (showReturn) return v.toFixed(1) + '%'
              return formatCurrency(v)
            }

            const labelIndices = activeData.map((_, i) => i)

            // Zero line (only for return mode)
            const zeroY = showReturn && yMin <= 0 && yMax >= 0 ? toY(0) : null

            const returnChartLabels: Record<string, string> = {
              return: 'תשואה כוללת',
              value: 'שווי כולל',
            }

            return (
              <div className="chart-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>{returnChartLabels[returnChartMode]} לאורך זמן</h3>
                  <div className="filter-tabs" style={{ width: 'auto' }}>
                    <button type="button" className={`filter-tab${returnChartMode === 'return' ? ' active' : ''}`} onClick={() => setReturnChartMode('return')}>תשואה</button>
                    <button type="button" className={`filter-tab${returnChartMode === 'value' ? ' active' : ''}`} onClick={() => setReturnChartMode('value')}>שווי</button>
                  </div>
                </div>
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="line-chart-svg">
                  {/* Grid lines */}
                  {gridLines.map((g, i) => (
                    <g key={i}>
                      <line x1={padL} x2={svgW - padR} y1={g.y} y2={g.y} stroke="var(--border-light)" strokeWidth="1" />
                      <text x={padL - 8} y={g.y + 4} textAnchor="end" fontSize="11" fill="var(--text)" fontFamily="var(--sans)" direction="ltr">
                        {fmtGrid(g.val)}
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
                  {activeData.map((p, i) => {
                    const v = showReturn ? (p as typeof returnOverTime[0]).returnPct : (p as typeof valueOverTime[0]).totalValue
                    return (
                      <g key={i}>
                        <circle cx={toX(i)} cy={toY(v)} r="3.5" fill="var(--accent)" />
                        <text x={toX(i)} y={toY(v) - 10} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text-h)" fontFamily="var(--sans)" direction="ltr">
                          {fmtDot(v)}
                        </text>
                      </g>
                    )
                  })}
                  {/* X-axis labels */}
                  {labelIndices.map(i => {
                    const p = activeData[i]
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
