import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { useInvestmentChannels } from '../contexts/InvestmentChannelsContext'
import { useInvestmentDeposits } from '../contexts/InvestmentDepositsContext'
import { useInvestmentValues } from '../contexts/InvestmentValuesContext'
import { useSalary } from '../contexts/SalaryContext'
import { useDropdownOptions } from '../hooks/useDropdownOptions'
import { useTableControls, type ColumnDef } from '../hooks/useTableControls'
import { CustomSelect } from '../components/common/CustomSelect'
import { ReadOnlySelect } from '../components/common/ReadOnlySelect'
import { NumberInput } from '../components/common/NumberInput'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { SortableTh, FilterPopover } from '../components/common/TableControls'
import DateInput from '../components/common/DateInput'
import { computeChannelSummary } from '../lib/computeChannelSummary'
import './Section.css'

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function formatCurrency(n: number) {
  return n.toLocaleString('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 })
}

function formatPercent(n: number) {
  return n.toLocaleString('he-IL', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

type ModalType = null | 'picker' | 'channel' | 'deposit' | 'value' | 'withdrawal'
type ActiveTab = 'channels' | 'deposits' | 'values'

export function InvestmentsTablePage() {
  const { channels, loading: chLoading, fetchChannels, addChannel, updateChannel, deleteChannel } = useInvestmentChannels()
  const { deposits, loading: depLoading, fetchDeposits, addDeposit, addWithdrawal, deleteDeposit, removeByChannelId: removeDepositsByChannel } = useInvestmentDeposits()
  const { valueUpdates, loading: valLoading, fetchValueUpdates, addValueUpdate, deleteValueUpdate, removeByChannelId: removeValuesByChannel } = useInvestmentValues()
  const { options: companyOptions, loading: companyLoading, addOption: addCompany, removeOption: removeCompany } = useDropdownOptions('investment_company')
  const { options: depositorOptions, loading: depositorLoading, addOption: addDepositor, removeOption: removeDepositor } = useDropdownOptions('investment_depositor')
  const { options: pathOptions, loading: pathLoading, addOption: addPath, removeOption: removePath } = useDropdownOptions('investment_path')
  const { salaries, fetchSalaries } = useSalary()

  const [modal, setModal] = useState<ModalType>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('channels')

  // Channel form
  const [chName, setChName] = useState('')
  const [chCompany, setChCompany] = useState('')
  const [chPath, setChPath] = useState('')
  const [chIsPension, setChIsPension] = useState(false)
  const [chSaving, setChSaving] = useState(false)

  // Deposit form
  const [depChannel, setDepChannel] = useState('')
  const [depAmount, setDepAmount] = useState('')
  const [depDate, setDepDate] = useState('')
  const [depDepositor, setDepDepositor] = useState('')
  const [depSaving, setDepSaving] = useState(false)
  const [depDeductedFromSalary, setDepDeductedFromSalary] = useState(false)
  const [depSelectedSalaryId, setDepSelectedSalaryId] = useState('')

  // Value update form
  const [valChannel, setValChannel] = useState('')
  const [valValue, setValValue] = useState('')
  const [valPath, setValPath] = useState('')
  const [valDate, setValDate] = useState('')
  const [valSaving, setValSaving] = useState(false)

  // Withdrawal form
  const [wdChannel, setWdChannel] = useState('')
  const [wdAmount, setWdAmount] = useState('')
  const [wdDate, setWdDate] = useState('')
  const [wdSaving, setWdSaving] = useState(false)

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [pendingDeleteType, setPendingDeleteType] = useState<'channel' | 'deposit' | 'value' | null>(null)

  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchChannels() }, [fetchChannels])
  useEffect(() => { fetchDeposits() }, [fetchDeposits])
  useEffect(() => { fetchValueUpdates() }, [fetchValueUpdates])
  useEffect(() => { fetchSalaries() }, [fetchSalaries])

  // Close picker on outside click
  useEffect(() => {
    if (modal !== 'picker') return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setModal(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [modal])

  // Computed channel summary data (event sourcing recalculation)
  const channelSummaries = useMemo(() => {
    return channels.map(ch => {
      const summary = computeChannelSummary(ch.id, deposits, valueUpdates)
      return { ...ch, ...summary }
    })
  }, [channels, deposits, valueUpdates])

  // Column definitions for each sub-tab
  const channelCols: ColumnDef[] = useMemo(() => [
    { key: 'name', type: 'string', label: 'שם' },
    { key: 'company', type: 'string', label: 'חברה' },
    { key: 'investment_path', type: 'string', label: 'מסלול' },
    { key: 'totalDeposits', type: 'number', label: 'סה"כ הפקדות' },
    { key: 'currentValue', type: 'number', label: 'שווי נוכחי' },
    { key: 'lastUpdated', type: 'date', label: 'עדכון אחרון' },
    { key: 'returnAbsolute', type: 'number', label: 'תשואה' },
    { key: 'returnPercent', type: 'number', label: 'תשואה %' },
  ], [])

  const depositCols: ColumnDef[] = useMemo(() => [
    { key: 'channel', type: 'string', label: 'אפיק' },
    { key: 'type', type: 'string', label: 'סוג' },
    { key: 'amount', type: 'number', label: 'סכום' },
    { key: 'depositor', type: 'string', label: 'מבצע' },
    { key: 'date', type: 'date', label: 'תאריך' },
  ], [])

  const valueCols: ColumnDef[] = useMemo(() => [
    { key: 'channel', type: 'string', label: 'אפיק' },
    { key: 'value', type: 'number', label: 'שווי' },
    { key: 'date', type: 'date', label: 'תאריך' },
  ], [])

  const getChannelValue = useCallback((item: (typeof channelSummaries)[0], key: string) => {
    if (key === 'name') return item.name
    if (key === 'company') return item.company
    if (key === 'investment_path') return item.investment_path
    if (key === 'totalDeposits') return item.totalDeposits
    if (key === 'currentValue') return item.currentValue
    if (key === 'lastUpdated') return item.lastUpdated || ''
    if (key === 'returnAbsolute') return item.returnAbsolute
    if (key === 'returnPercent') return item.returnPercent
    return null
  }, [])

  const getDepositValue = useCallback((item: (typeof deposits)[0], key: string) => {
    if (key === 'channel') {
      const ch = channels.find(c => c.id === item.channel_id)
      return ch ? `${ch.name} - ${ch.company}` : 'אפיק שנמחק'
    }
    if (key === 'type') return item.is_withdrawal ? 'משיכה' : 'הפקדה'
    if (key === 'amount') return item.amount
    if (key === 'depositor') return item.depositor
    if (key === 'date') return item.date
    return null
  }, [channels])

  const getValueUpdateValue = useCallback((item: (typeof valueUpdates)[0], key: string) => {
    if (key === 'channel') {
      const ch = channels.find(c => c.id === item.channel_id)
      return ch ? `${ch.name} - ${ch.company}` : 'אפיק שנמחק'
    }
    if (key === 'value') return item.value
    if (key === 'date') return item.date
    return null
  }, [channels])

  const channelTable = useTableControls(channelSummaries, channelCols, 'name', 'asc', getChannelValue)
  const depositTable = useTableControls(deposits, depositCols, 'date', 'desc', getDepositValue)
  const valueTable = useTableControls(valueUpdates, valueCols, 'date', 'desc', getValueUpdateValue)

  const activeTableCtrl = activeTab === 'channels' ? channelTable : activeTab === 'deposits' ? depositTable : valueTable

  const resetChannelForm = () => { setChName(''); setChCompany(''); setChPath(''); setChIsPension(false) }
  const resetDepositForm = () => { setDepChannel(''); setDepAmount(''); setDepDate(''); setDepDepositor(''); setDepDeductedFromSalary(false); setDepSelectedSalaryId('') }
  const resetValueForm = () => { setValChannel(''); setValValue(''); setValPath(''); setValDate('') }
  const resetWithdrawalForm = () => { setWdChannel(''); setWdAmount(''); setWdDate('') }

  // Pinned depositor options: "אני" + unique employer names
  const pinnedDepositors = useMemo(() => {
    const employers = [...new Set(salaries.map(s => s.employer))].sort()
    return ['אני', ...employers]
  }, [salaries])

  // Whether the selected depositor is a pinned (hard) option
  const isPinnedDepositor = useMemo(() => {
    return pinnedDepositors.includes(depDepositor)
  }, [pinnedDepositors, depDepositor])

  // Recent salaries (last 6 months)
  const recentSalaries = useMemo(() => {
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const cutoff = sixMonthsAgo.toISOString().slice(0, 10)
    return salaries.filter(s => s.month >= cutoff)
  }, [salaries])

  // Filtered salary options based on depositor
  const salaryOptions = useMemo(() => {
    const filtered = depDepositor && depDepositor !== 'אני'
      ? recentSalaries.filter(s => s.employer === depDepositor)
      : recentSalaries
    return filtered.map(s => {
      const d = new Date(s.month + 'T00:00:00')
      const monthLabel = d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
      return { value: s.id, label: `${monthLabel} - ${s.employer}` }
    })
  }, [recentSalaries, depDepositor])

  // Auto-select salary for deposit when date/depositor changes (previous month's salary)
  useEffect(() => {
    if (!depDeductedFromSalary || !depDate) { setDepSelectedSalaryId(''); return }
    const d = new Date(depDate + 'T00:00:00')
    const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1)
    const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
    let matching = recentSalaries.filter(s => s.month.slice(0, 7) === prevMonth)
    if (depDepositor && depDepositor !== 'אני') {
      matching = matching.filter(s => s.employer === depDepositor)
    }
    if (matching.length === 1) setDepSelectedSalaryId(matching[0].id)
    else setDepSelectedSalaryId('')
  }, [depDeductedFromSalary, depDate, depDepositor, recentSalaries])

  const openValueFormForChannel = (channelId: string) => {
    const ch = channels.find(c => c.id === channelId)
    const latestValue = valueUpdates
      .filter(v => v.channel_id === channelId)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    const today = new Date().toISOString().slice(0, 10)
    setValChannel(channelId)
    setValValue(latestValue ? String(latestValue.value) : '')
    setValPath(ch ? ch.investment_path : '')
    setValDate(today)
    setModal('value')
  }

  const handleChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chName || !chCompany || !chPath) return
    setChSaving(true)
    await addChannel({ name: chName, company: chCompany, investment_path: chPath, is_pension: chIsPension })
    setChSaving(false)
    setModal(null)
    resetChannelForm()
  }

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!depChannel || !depAmount || !depDate || !depDepositor) return
    setDepSaving(true)
    await addDeposit({ channel_id: depChannel, amount: Number(depAmount), date: depDate, depositor: depDepositor, salary_id: depDeductedFromSalary && depSelectedSalaryId ? depSelectedSalaryId : null })
    setDepSaving(false)
    setModal(null)
    resetDepositForm()
  }

  const handleValueSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valChannel || !valValue || !valPath || !valDate) return
    setValSaving(true)
    const ch = channels.find(c => c.id === valChannel)
    if (ch && valPath !== ch.investment_path) {
      await updateChannel(valChannel, { investment_path: valPath })
    }
    await addValueUpdate({ channel_id: valChannel, value: Number(valValue), date: valDate })
    setValSaving(false)
    setModal(null)
    resetValueForm()
  }

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wdChannel || !wdAmount || !wdDate) return
    setWdSaving(true)
    const amount = Number(wdAmount)
    // Add withdrawal record (deposit with is_withdrawal=true)
    await addWithdrawal({ channel_id: wdChannel, amount, date: wdDate })
    setWdSaving(false)
    setModal(null)
    resetWithdrawalForm()
  }

  const isLoading = chLoading || depLoading || valLoading

  return (
    <div className="section-page">
      <div className="section-header">
        <h1>השקעות</h1>
        <div className="section-header-actions">
          {!isLoading && (
            <FilterPopover columns={activeTab === 'channels' ? channelCols : activeTab === 'deposits' ? depositCols : valueCols} filters={activeTableCtrl.filters} stringOptions={activeTableCtrl.stringOptions} onStringFilter={activeTableCtrl.setStringFilter} onNumberFilter={activeTableCtrl.setNumberFilter} onDateFilter={activeTableCtrl.setDateFilter} onClear={activeTableCtrl.clearFilters} hasActive={activeTableCtrl.hasActiveFilters} />
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

      {/* Sub-tabs */}
      <div className="sub-tabs">
        <button className={`sub-tab${activeTab === 'channels' ? ' active' : ''}`} onClick={() => setActiveTab('channels')}>
          אפיקי השקעה
        </button>
        <button className={`sub-tab${activeTab === 'deposits' ? ' active' : ''}`} onClick={() => setActiveTab('deposits')}>
          הפקדות ומשיכות
        </button>
        <button className={`sub-tab${activeTab === 'values' ? ' active' : ''}`} onClick={() => setActiveTab('values')}>
          עדכוני ערך
        </button>
      </div>

      {isLoading ? (
        <div className="section-empty">טוען...</div>
      ) : activeTab === 'channels' ? (
        channelSummaries.length === 0 ? (
          <div className="section-empty">אין אפיקי השקעה עדיין. לחץ על + כדי להוסיף.</div>
        ) : (
            <div className="section-table-wrap">
              <table className="section-table">
                <thead>
                  <tr>
                    <SortableTh label="שם" colKey="name" sortKey={channelTable.sortKey} sortDir={channelTable.sortDir} onSort={channelTable.toggleSort} />
                    <SortableTh label="חברה" colKey="company" sortKey={channelTable.sortKey} sortDir={channelTable.sortDir} onSort={channelTable.toggleSort} />
                    <SortableTh label="מסלול" colKey="investment_path" sortKey={channelTable.sortKey} sortDir={channelTable.sortDir} onSort={channelTable.toggleSort} />
                    <SortableTh label='סה"כ הפקדות' colKey="totalDeposits" sortKey={channelTable.sortKey} sortDir={channelTable.sortDir} onSort={channelTable.toggleSort} />
                    <SortableTh label="שווי נוכחי" colKey="currentValue" sortKey={channelTable.sortKey} sortDir={channelTable.sortDir} onSort={channelTable.toggleSort} />
                    <SortableTh label="עדכון אחרון" colKey="lastUpdated" sortKey={channelTable.sortKey} sortDir={channelTable.sortDir} onSort={channelTable.toggleSort} />
                    <SortableTh label="תשואה" colKey="returnAbsolute" sortKey={channelTable.sortKey} sortDir={channelTable.sortDir} onSort={channelTable.toggleSort} />
                    <SortableTh label="תשואה %" colKey="returnPercent" sortKey={channelTable.sortKey} sortDir={channelTable.sortDir} onSort={channelTable.toggleSort} />
                    <th className="col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {channelTable.processed.map(ch => (
                    <tr key={ch.id}>
                      <td>
                        {ch.name}
                        {ch.is_pension && <span className="pension-badge">פנסיה</span>}
                      </td>
                      <td>{ch.company}</td>
                      <td>{ch.investment_path}</td>
                      <td className="num-cell">{formatCurrency(ch.totalDeposits)}</td>
                      <td className="num-cell">{ch.lastUpdated ? formatCurrency(ch.currentValue) : '-'}</td>
                      <td>{ch.lastUpdated ? formatDate(ch.lastUpdated) : '-'}</td>
                      <td className={`num-cell ${ch.returnAbsolute >= 0 ? 'positive-return' : 'negative-return'}`}>
                        {ch.lastUpdated ? formatCurrency(ch.returnAbsolute) : '-'}
                      </td>
                      <td className={`num-cell ${ch.returnPercent >= 0 ? 'positive-return' : 'negative-return'}`}>
                        {ch.lastUpdated ? formatPercent(ch.returnPercent) : '-'}
                      </td>
                      <td className="col-actions actions-group">
                        <button className="edit-btn" onClick={() => openValueFormForChannel(ch.id)} title="עדכון שווי">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
                          </svg>
                        </button>
                        <button className="delete-btn" onClick={() => { setPendingDeleteId(ch.id); setPendingDeleteType('channel') }} title="מחק">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        )
      ) : activeTab === 'deposits' ? (
        /* Deposits tab */
        deposits.length === 0 ? (
          <div className="section-empty">אין הפקדות ומשיכות עדיין. לחץ על + כדי להוסיף.</div>
        ) : (
            <div className="section-table-wrap">
              <table className="section-table">
                <thead>
                  <tr>
                    <SortableTh label="אפיק" colKey="channel" sortKey={depositTable.sortKey} sortDir={depositTable.sortDir} onSort={depositTable.toggleSort} />
                    <SortableTh label="סוג" colKey="type" sortKey={depositTable.sortKey} sortDir={depositTable.sortDir} onSort={depositTable.toggleSort} />
                    <SortableTh label="סכום" colKey="amount" sortKey={depositTable.sortKey} sortDir={depositTable.sortDir} onSort={depositTable.toggleSort} />
                    <SortableTh label="מבצע" colKey="depositor" sortKey={depositTable.sortKey} sortDir={depositTable.sortDir} onSort={depositTable.toggleSort} />
                    <SortableTh label="תאריך" colKey="date" sortKey={depositTable.sortKey} sortDir={depositTable.sortDir} onSort={depositTable.toggleSort} />
                    <th className="col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {depositTable.processed.map(dep => {
                    const ch = channels.find(c => c.id === dep.channel_id)
                    return (
                      <tr key={dep.id}>
                        <td>{ch ? `${ch.name} - ${ch.company}` : 'אפיק שנמחק'}</td>
                        <td>{dep.is_withdrawal
                          ? <span className="direction-badge by_me">משיכה</span>
                          : <span className="direction-badge to_me">הפקדה</span>
                        }</td>
                        <td className="num-cell">{formatCurrency(dep.amount)}</td>
                        <td>{dep.depositor}</td>
                        <td>{formatDate(dep.date)}</td>
                        <td className="col-actions">
                          <button className="delete-btn" onClick={() => { setPendingDeleteId(dep.id); setPendingDeleteType('deposit') }} title="מחק">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
        )
      ) : activeTab === 'values' ? (
        /* Value updates tab */
        valueUpdates.length === 0 ? (
          <div className="section-empty">אין עדכוני ערך עדיין. לחץ על + כדי להוסיף.</div>
        ) : (
            <div className="section-table-wrap">
              <table className="section-table">
                <thead>
                  <tr>
                    <SortableTh label="אפיק" colKey="channel" sortKey={valueTable.sortKey} sortDir={valueTable.sortDir} onSort={valueTable.toggleSort} />
                    <SortableTh label="שווי" colKey="value" sortKey={valueTable.sortKey} sortDir={valueTable.sortDir} onSort={valueTable.toggleSort} />
                    <SortableTh label="תאריך" colKey="date" sortKey={valueTable.sortKey} sortDir={valueTable.sortDir} onSort={valueTable.toggleSort} />
                    <th className="col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {valueTable.processed.map(vu => {
                    const ch = channels.find(c => c.id === vu.channel_id)
                    return (
                      <tr key={vu.id}>
                        <td>{ch ? `${ch.name} - ${ch.company}` : 'אפיק שנמחק'}</td>
                        <td className="num-cell">{formatCurrency(vu.value)}</td>
                        <td>{formatDate(vu.date)}</td>
                        <td className="col-actions">
                          <button className="delete-btn" onClick={() => { setPendingDeleteId(vu.id); setPendingDeleteType('value') }} title="מחק">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
        )
      ) : null}

      {pendingDeleteId && pendingDeleteType && (
        <ConfirmDialog
          message="האם אתה בטוח שברצונך למחוק?"
          itemName={(() => {
            if (pendingDeleteType === 'channel') {
              const ch = channels.find(c => c.id === pendingDeleteId)
              return ch ? `${ch.name} - ${ch.company}` : undefined
            }
            if (pendingDeleteType === 'deposit') {
              const dep = deposits.find(d => d.id === pendingDeleteId)
              if (!dep) return undefined
              const ch = channels.find(c => c.id === dep.channel_id)
              const typeLabel = dep.is_withdrawal ? 'משיכה' : 'הפקדה'
              return `${typeLabel} - ${formatCurrency(dep.amount)} (${ch ? ch.name : ''}, ${dep.depositor}, ${formatDate(dep.date)})`
            }
            if (pendingDeleteType === 'value') {
              const vu = valueUpdates.find(v => v.id === pendingDeleteId)
              if (!vu) return undefined
              const ch = channels.find(c => c.id === vu.channel_id)
              return `עדכון שווי - ${formatCurrency(vu.value)} (${ch ? ch.name : ''}, ${formatDate(vu.date)})`
            }
            return undefined
          })()}
          details={(() => {
            if (pendingDeleteType === 'channel') {
              const items: string[] = []
              const chDeps = deposits.filter(d => d.channel_id === pendingDeleteId)
              const chVals = valueUpdates.filter(v => v.channel_id === pendingDeleteId)
              for (const d of chDeps) {
                const depLabel = d.is_withdrawal ? 'משיכה' : 'הפקדה'
                items.push(`${depLabel} - ${formatCurrency(d.amount)} (${formatDate(d.date)})`)
              }
              for (const v of chVals) {
                items.push(`עדכון שווי - ${formatCurrency(v.value)} (${formatDate(v.date)})`)
              }
              return items.length > 0 ? items : undefined
            }
            return undefined
          })()}
          onConfirm={() => {
            if (pendingDeleteType === 'channel') {
              deleteChannel(pendingDeleteId)
              removeDepositsByChannel(pendingDeleteId)
              removeValuesByChannel(pendingDeleteId)
            }
            else if (pendingDeleteType === 'deposit') deleteDeposit(pendingDeleteId)
            else if (pendingDeleteType === 'value') deleteValueUpdate(pendingDeleteId)
            setPendingDeleteId(null)
            setPendingDeleteType(null)
          }}
          onCancel={() => { setPendingDeleteId(null); setPendingDeleteType(null) }}
        />
      )}

      {/* FAB with type picker */}
      <div className="fab-wrap" ref={pickerRef}>
        {modal === 'picker' && (
          <div className="fab-menu">
            <button className="fab-menu-item" onClick={() => setModal('channel')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              אפיק השקעה חדש
            </button>
            <button className="fab-menu-item" onClick={() => setModal('deposit')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M12 9v6" /><path d="M9 12h6" />
              </svg>
              הפקדה
            </button>
            <button className="fab-menu-item" onClick={() => setModal('withdrawal')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M9 12h6" />
              </svg>
              משיכה
            </button>
          </div>
        )}
        <button className="section-fab" onClick={() => setModal(modal === 'picker' ? null : 'picker')} title="הוסף">+</button>
      </div>

      {/* Channel modal */}
      {modal === 'channel' && (
        <div className="modal-overlay" onClick={() => { setModal(null); resetChannelForm() }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setModal(null); resetChannelForm() }} title="סגור">&times;</button>
            <h2>אפיק השקעה חדש</h2>
            <form onSubmit={handleChannelSubmit}>
              <label>שם אפיק</label>
              <input type="text" placeholder="הכנס שם אפיק" value={chName} onChange={e => setChName(e.target.value)} required />

              <label>חברה</label>
              <CustomSelect
                options={companyOptions}
                value={chCompany}
                placeholder="הכנס חברה"
                onChange={setChCompany}
                onAddOption={addCompany}
                onRemoveOption={removeCompany}
                loading={companyLoading}
              />

              <label>מסלול השקעה</label>
              <CustomSelect
                options={pathOptions}
                value={chPath}
                placeholder="הכנס מסלול השקעה"
                onChange={setChPath}
                onAddOption={addPath}
                onRemoveOption={removePath}
                loading={pathLoading}
              />

              <div className="toggle-row">
                <label className="toggle-label" htmlFor="is-pension">אפיק פנסיוני?</label>
                <button
                  type="button"
                  id="is-pension"
                  role="switch"
                  aria-checked={chIsPension}
                  className={`toggle-switch${chIsPension ? ' active' : ''}`}
                  onClick={() => setChIsPension(prev => !prev)}
                >
                  <span className="toggle-knob" />
                </button>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={chSaving || !chCompany}>
                  {chSaving ? 'שומר...' : 'שמור'}
                </button>
                <button type="button" className="btn-cancel" onClick={() => { setModal(null); resetChannelForm() }}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit modal */}
      {modal === 'deposit' && (
        <div className="modal-overlay" onClick={() => { setModal(null); resetDepositForm() }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setModal(null); resetDepositForm() }} title="סגור">&times;</button>
            <h2>הפקדה חדשה</h2>
            <form onSubmit={handleDepositSubmit}>
              <label>אפיק</label>
              <ReadOnlySelect
                options={channels.map(ch => ({ value: ch.id, label: `${ch.name} - ${ch.company}` }))}
                value={depChannel}
                placeholder="בחר אפיק"
                onChange={setDepChannel}
              />

              <label>סכום הפקדה</label>
              <NumberInput placeholder="הכנס סכום" value={depAmount} onChange={setDepAmount} required />

              <label>מי הפקיד</label>
              <CustomSelect
                options={depositorOptions}
                pinnedOptions={pinnedDepositors}
                value={depDepositor}
                placeholder="הכנס מפקיד"
                onChange={(val) => { setDepDepositor(val); setDepDeductedFromSalary(false); setDepSelectedSalaryId('') }}
                onAddOption={addDepositor}
                onRemoveOption={removeDepositor}
                loading={depositorLoading}
              />

              <label>תאריך</label>
              <DateInput value={depDate} onChange={setDepDate} required />

              {isPinnedDepositor && depDepositor && (
                <div className="toggle-row">
                  <label className="toggle-label" htmlFor="dep-salary-deduct">נוכה מהמשכורת?</label>
                  <button
                    type="button"
                    id="dep-salary-deduct"
                    role="switch"
                    aria-checked={depDeductedFromSalary}
                    className={`toggle-switch${depDeductedFromSalary ? ' active' : ''}`}
                    onClick={() => { setDepDeductedFromSalary(prev => !prev); setDepSelectedSalaryId('') }}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>
              )}

              {depDeductedFromSalary && (
                <>
                  <label>משכורת</label>
                  <ReadOnlySelect
                    options={salaryOptions}
                    value={depSelectedSalaryId}
                    placeholder="בחר משכורת"
                    onChange={setDepSelectedSalaryId}
                  />
                </>
              )}

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={depSaving || !depChannel || !depDepositor || (depDeductedFromSalary && !depSelectedSalaryId)}>
                  {depSaving ? 'שומר...' : 'שמור'}
                </button>
                <button type="button" className="btn-cancel" onClick={() => { setModal(null); resetDepositForm() }}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Value update modal */}
      {modal === 'value' && (
        <div className="modal-overlay" onClick={() => { setModal(null); resetValueForm() }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setModal(null); resetValueForm() }} title="סגור">&times;</button>
            <h2>עדכון שווי</h2>
            <div className="modal-subtitle">{(() => { const c = channels.find(c => c.id === valChannel); return c ? `${c.name} - ${c.company}` : '' })()}</div>
            <form onSubmit={handleValueSubmit}>
              <label>שווי נוכחי</label>
              <NumberInput placeholder="הכנס שווי" value={valValue} onChange={setValValue} required />

              <label>מסלול השקעה</label>
              <CustomSelect
                options={pathOptions}
                value={valPath}
                placeholder="הכנס מסלול השקעה"
                onChange={setValPath}
                onAddOption={addPath}
                onRemoveOption={removePath}
                loading={pathLoading}
              />

              <label>תאריך עדכון</label>
              <DateInput value={valDate} onChange={setValDate} required />

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={valSaving || !valChannel}>
                  {valSaving ? 'שומר...' : 'שמור'}
                </button>
                <button type="button" className="btn-cancel" onClick={() => { setModal(null); resetValueForm() }}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdrawal modal */}
      {modal === 'withdrawal' && (
        <div className="modal-overlay" onClick={() => { setModal(null); resetWithdrawalForm() }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setModal(null); resetWithdrawalForm() }} title="סגור">&times;</button>
            <h2>משיכה מאפיק</h2>
            <form onSubmit={handleWithdrawalSubmit}>
              <label>אפיק</label>
              <ReadOnlySelect
                options={channels.map(ch => ({ value: ch.id, label: `${ch.name} - ${ch.company}` }))}
                value={wdChannel}
                placeholder="בחר אפיק"
                onChange={setWdChannel}
              />

              <label>סכום משיכה</label>
              <NumberInput placeholder="הכנס סכום" value={wdAmount} onChange={setWdAmount} required />

              <label>תאריך</label>
              <DateInput value={wdDate} onChange={setWdDate} required />

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={wdSaving || !wdChannel}>
                  {wdSaving ? 'שומר...' : 'שמור'}
                </button>
                <button type="button" className="btn-cancel" onClick={() => { setModal(null); resetWithdrawalForm() }}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
