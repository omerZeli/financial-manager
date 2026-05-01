import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { useInvestmentChannels } from '../contexts/InvestmentChannelsContext'
import { useInvestmentDeposits } from '../contexts/InvestmentDepositsContext'
import { useInvestmentValues } from '../contexts/InvestmentValuesContext'
import { useSalary } from '../contexts/SalaryContext'
import { useDropdownOptions } from '../hooks/useDropdownOptions'
import { useTableControls, type ColumnDef } from '../hooks/useTableControls'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { SortableTh, FilterPopover } from '../components/common/TableControls'
import { ChannelForm } from '../components/forms/ChannelForm'
import { DepositForm } from '../components/forms/DepositForm'
import { ValueUpdateForm } from '../components/forms/ValueUpdateForm'
import { WithdrawalForm } from '../components/forms/WithdrawalForm'
import { EditDepositForm } from '../components/forms/EditDepositForm'
import { EditValueUpdateForm } from '../components/forms/EditValueUpdateForm'
import { computeChannelSummary, CASH_PATH_LABEL } from '../lib/computeChannelSummary'
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
  const { deposits, loading: depLoading, fetchDeposits, addDeposit, addWithdrawal, updateDeposit, deleteDeposit, removeByChannelId: removeDepositsByChannel } = useInvestmentDeposits()
  const { valueUpdates, loading: valLoading, fetchValueUpdates, addValueUpdate, updateValueUpdate, deleteValueUpdate, removeByChannelId: removeValuesByChannel } = useInvestmentValues()
  const { options: companyOptions, loading: companyLoading, addOption: addCompany, removeOption: removeCompany } = useDropdownOptions('investment_company')
  const { options: depositorOptions, loading: depositorLoading, addOption: addDepositor, removeOption: removeDepositor } = useDropdownOptions('investment_depositor')
  const { options: pathOptions, loading: pathLoading, addOption: addPath, removeOption: removePath } = useDropdownOptions('investment_path')
  const { salaries, fetchSalaries } = useSalary()

  const [modal, setModal] = useState<ModalType>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('channels')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [pendingDeleteType, setPendingDeleteType] = useState<'channel' | 'deposit' | 'value' | null>(null)
  const [editingDeposit, setEditingDeposit] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string | null>(null)
  // Value update form initial state (set when opening from channel row)
  const [valueFormInit, setValueFormInit] = useState<{ channelId: string; channelLabel: string; initialValue: string; initialPath: string; initialDate: string } | null>(null)

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
      const isCash = ch.investment_path === CASH_PATH_LABEL
      const summary = computeChannelSummary(ch.id, deposits, valueUpdates, isCash)
      return { ...ch, ...summary }
    })
  }, [channels, deposits, valueUpdates])

  // Sort company options by total current value per company
  const sortedCompanyOptions = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const cs of channelSummaries) totals[cs.company] = (totals[cs.company] || 0) + cs.currentValue
    return [...companyOptions].sort((a, b) => (totals[b.label] || 0) - (totals[a.label] || 0))
  }, [companyOptions, channelSummaries])

  // Sort path options by total current value per path
  const sortedPathOptions = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const cs of channelSummaries) totals[cs.investment_path] = (totals[cs.investment_path] || 0) + cs.currentValue
    const opts = [...pathOptions]
    // Ensure the hardcoded cash option participates in sorting even if not a user-created DB option
    if (!opts.some(o => o.label === CASH_PATH_LABEL)) {
      opts.push({ id: `__pinned__${CASH_PATH_LABEL}`, label: CASH_PATH_LABEL })
    }
    return opts.sort((a, b) => (totals[b.label] || 0) - (totals[a.label] || 0))
  }, [pathOptions, channelSummaries])

  // Sort depositor options by total deposited per depositor
  const sortedDepositorOptions = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const d of deposits) {
      if (!d.is_withdrawal) totals[d.depositor] = (totals[d.depositor] || 0) + d.amount
    }
    return [...depositorOptions].sort((a, b) => (totals[b.label] || 0) - (totals[a.label] || 0))
  }, [depositorOptions, deposits])

  // Sort channel options for ReadOnlySelect by total deposits
  const sortedChannelSelectOptions = useMemo(() => {
    return channelSummaries
      .sort((a, b) => b.totalDeposits - a.totalDeposits)
      .map(ch => ({ value: ch.id, label: `${ch.name} - ${ch.company}` }))
  }, [channelSummaries])

  // Pinned depositor options: "אני" + unique employer names
  const pinnedDepositors = useMemo(() => {
    const employers = [...new Set(salaries.map(s => s.employer))].sort()
    return ['אני', ...employers]
  }, [salaries])

  // All salaries for deposit salary deduction
  const allSalaries = useMemo(() => [...salaries], [salaries])

  const salaryOptions = useMemo(() => {
    return [...allSalaries]
      .sort((a, b) => b.neto - a.neto)
      .map(s => {
        const d = new Date(s.month + 'T00:00:00')
        const monthLabel = d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
        return { value: s.id, label: `${monthLabel} - ${s.employer}` }
      })
  }, [allSalaries])

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

  const openValueFormForChannel = (channelId: string) => {
    const ch = channels.find(c => c.id === channelId)
    const latestValue = valueUpdates
      .filter(v => v.channel_id === channelId)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    const today = new Date().toISOString().slice(0, 10)
    setValueFormInit({
      channelId,
      channelLabel: ch ? `${ch.name} - ${ch.company}` : '',
      initialValue: latestValue ? String(latestValue.value) : '',
      initialPath: ch ? ch.investment_path : '',
      initialDate: today,
    })
    setModal('value')
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
                        <td className="col-actions actions-group">
                          <button className="edit-btn" onClick={() => setEditingDeposit(dep.id)} title="ערוך">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
                            </svg>
                          </button>
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
                        <td className="col-actions actions-group">
                          <button className="edit-btn" onClick={() => setEditingValue(vu.id)} title="ערוך">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
                            </svg>
                          </button>
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

      {/* Form modals — each is its own component with isolated state */}
      {modal === 'channel' && (
        <ChannelForm
          sortedCompanyOptions={sortedCompanyOptions}
          companyLoading={companyLoading}
          addCompany={addCompany}
          removeCompany={removeCompany}
          sortedPathOptions={sortedPathOptions}
          pathLoading={pathLoading}
          addPath={addPath}
          removePath={removePath}
          onSubmit={addChannel}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'deposit' && (
        <DepositForm
          sortedChannelSelectOptions={sortedChannelSelectOptions}
          sortedDepositorOptions={sortedDepositorOptions}
          depositorLoading={depositorLoading}
          addDepositor={addDepositor}
          removeDepositor={removeDepositor}
          pinnedDepositors={pinnedDepositors}
          salaryOptions={salaryOptions}
          recentSalaries={allSalaries}
          onSubmit={addDeposit}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'value' && valueFormInit && (
        <ValueUpdateForm
          channelId={valueFormInit.channelId}
          channelLabel={valueFormInit.channelLabel}
          initialValue={valueFormInit.initialValue}
          initialPath={valueFormInit.initialPath}
          initialDate={valueFormInit.initialDate}
          sortedPathOptions={sortedPathOptions}
          pathLoading={pathLoading}
          addPath={addPath}
          removePath={removePath}
          onSubmit={async (data) => {
            const ch = channels.find(c => c.id === data.channel_id)
            if (ch && data.investment_path && data.investment_path !== ch.investment_path) {
              await updateChannel(data.channel_id, { investment_path: data.investment_path })
            }
            await addValueUpdate({ channel_id: data.channel_id, value: data.value, date: data.date })
          }}
          onClose={() => { setModal(null); setValueFormInit(null) }}
        />
      )}

      {modal === 'withdrawal' && (
        <WithdrawalForm
          sortedChannelSelectOptions={sortedChannelSelectOptions}
          onSubmit={async (data) => { await addWithdrawal(data) }}
          onClose={() => setModal(null)}
        />
      )}

      {/* Edit modals */}
      {editingDeposit && (() => {
        const dep = deposits.find(d => d.id === editingDeposit)
        if (!dep) return null
        return (
          <EditDepositForm
            deposit={dep}
            sortedChannelSelectOptions={sortedChannelSelectOptions}
            sortedDepositorOptions={sortedDepositorOptions}
            depositorLoading={depositorLoading}
            addDepositor={addDepositor}
            removeDepositor={removeDepositor}
            pinnedDepositors={pinnedDepositors}
            salaryOptions={salaryOptions}
            recentSalaries={allSalaries}
            onSubmit={async (id, fields) => { await updateDeposit(id, fields) }}
            onClose={() => setEditingDeposit(null)}
          />
        )
      })()}

      {editingValue && (() => {
        const vu = valueUpdates.find(v => v.id === editingValue)
        if (!vu) return null
        return (
          <EditValueUpdateForm
            valueUpdate={vu}
            onSubmit={async (id, fields) => { await updateValueUpdate(id, fields) }}
            onClose={() => setEditingValue(null)}
          />
        )
      })()}
    </div>
  )
}