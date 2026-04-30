import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { useExpenses } from '../contexts/ExpensesContext'
import { useFixedExpenses } from '../contexts/FixedExpensesContext'
import { usePaybacks } from '../contexts/PaybacksContext'
import { useExpenseTypes } from '../contexts/ExpenseTypesContext'
import { useSalary } from '../contexts/SalaryContext'
import { useDropdownOptions } from '../hooks/useDropdownOptions'
import { useTableControls, type ColumnDef } from '../hooks/useTableControls'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { SortableTh, FilterPopover } from '../components/common/TableControls'
import { ExpenseForm } from '../components/forms/ExpenseForm'
import { FixedExpenseForm } from '../components/forms/FixedExpenseForm'
import { PaybackForm } from '../components/forms/PaybackForm'
import { ExpenseTypeForm } from '../components/forms/ExpenseTypeForm'
import { EditExpenseForm } from '../components/forms/EditExpenseForm'
import { EditFixedExpenseForm } from '../components/forms/EditFixedExpenseForm'
import { EditPaybackForm } from '../components/forms/EditPaybackForm'
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

type ModalType = null | 'picker' | 'expense' | 'fixed' | 'payback' | 'expense_type'
type ActiveTab = 'all' | 'regular' | 'fixed' | 'paybacks'

export function ExpensesTablePage() {
  const { expenses, loading, fetchExpenses, addExpense, updateExpense, deleteExpense } = useExpenses()
  const { fixedExpenses, inflatedExpenses, loading: fixedLoading, fetchFixedExpenses, addFixedExpense, updateFixedExpense, deleteFixedExpense } = useFixedExpenses()
  const { paybacks, loading: paybacksLoading, fetchPaybacks, addPayback, updatePayback, deletePayback, removeByExpenseId, removeByFixedExpenseId } = usePaybacks()
  const { salaries, fetchSalaries } = useSalary()
  const { options: categoryOptions, loading: categoryLoading, addOption: addCategory, removeOption: removeCategory } = useDropdownOptions('expense_category')
  const { options: fixedCategoryOptions, loading: fixedCategoryLoading, addOption: addFixedCategory, removeOption: removeFixedCategory } = useDropdownOptions('fixed_expense_category')
  const { options: personOptions, loading: personLoading, addOption: addPerson, removeOption: removePerson } = useDropdownOptions('payback_person')
  const { options: expenseTypeOptions, loading: etTypeLoading, addOption: addExpenseTypeOption, removeOption: removeExpenseTypeOption } = useDropdownOptions('expense_type')
  const { expenseTypes, fetchExpenseTypes, addExpenseType, updateExpenseType, deleteExpenseType } = useExpenseTypes()

  const [modal, setModal] = useState<ModalType>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('all')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [pendingDeleteType, setPendingDeleteType] = useState<'expense' | 'fixed' | 'payback' | null>(null)
  const [editingFixed, setEditingFixed] = useState<string | null>(null)
  const [editingExpense, setEditingExpense] = useState<string | null>(null)
  const [editingPayback, setEditingPayback] = useState<string | null>(null)

  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchExpenses() }, [fetchExpenses])
  useEffect(() => { fetchFixedExpenses() }, [fetchFixedExpenses])
  useEffect(() => { fetchPaybacks() }, [fetchPaybacks])
  useEffect(() => { fetchExpenseTypes() }, [fetchExpenseTypes])
  useEffect(() => { fetchSalaries() }, [fetchSalaries])

  // Sort category options by total expense amount (regular + inflated)
  const sortedCategoryOptions = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const e of expenses) totals[e.category] = (totals[e.category] || 0) + e.amount
    for (const ie of inflatedExpenses) totals[ie.category] = (totals[ie.category] || 0) + ie.amount
    return [...categoryOptions].sort((a, b) => (totals[b.label] || 0) - (totals[a.label] || 0))
  }, [categoryOptions, expenses, inflatedExpenses])

  // Sort fixed category options by total fixed expense amount
  const sortedFixedCategoryOptions = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const fe of fixedExpenses) totals[fe.category] = (totals[fe.category] || 0) + fe.amount
    for (const ie of inflatedExpenses) totals[ie.category] = (totals[ie.category] || 0) + ie.amount
    return [...fixedCategoryOptions].sort((a, b) => (totals[b.label] || 0) - (totals[a.label] || 0))
  }, [fixedCategoryOptions, fixedExpenses, inflatedExpenses])

  // Sort person options by total payback amount
  const sortedPersonOptions = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const pb of paybacks) totals[pb.person] = (totals[pb.person] || 0) + pb.amount
    return [...personOptions].sort((a, b) => (totals[b.label] || 0) - (totals[a.label] || 0))
  }, [personOptions, paybacks])

  // Sort expense type options by total expense amount for that type
  const sortedExpenseTypeOptions = useMemo(() => {
    const catTotals: Record<string, number> = {}
    for (const e of expenses) catTotals[e.category] = (catTotals[e.category] || 0) + e.amount
    for (const ie of inflatedExpenses) catTotals[ie.category] = (catTotals[ie.category] || 0) + ie.amount
    const typeTotals: Record<string, number> = {}
    for (const et of expenseTypes) {
      typeTotals[et.type_name] = et.categories.reduce((sum, cat) => sum + (catTotals[cat] || 0), 0)
    }
    return [...expenseTypeOptions].sort((a, b) => (typeTotals[b.label] || 0) - (typeTotals[a.label] || 0))
  }, [expenseTypeOptions, expenses, inflatedExpenses, expenseTypes])

  // Build a map of "to_me" payback totals per expense_id
  const toMeByExpense = useMemo(() => {
    const map: Record<string, number> = {}
    for (const pb of paybacks) {
      if (pb.direction === 'to_me' && pb.expense_id) {
        map[pb.expense_id] = (map[pb.expense_id] || 0) + pb.amount
      }
    }
    return map
  }, [paybacks])

  // Build a list of "to_me" paybacks linked to fixed expenses (with date info for inflated matching)
  const toMeByFixed = useMemo(() => {
    const map: Record<string, { total: number; items: { amount: number; date: string }[] }> = {}
    for (const pb of paybacks) {
      if (pb.direction === 'to_me' && pb.fixed_expense_id) {
        if (!map[pb.fixed_expense_id]) map[pb.fixed_expense_id] = { total: 0, items: [] }
        map[pb.fixed_expense_id].total += pb.amount
        map[pb.fixed_expense_id].items.push({ amount: pb.amount, date: pb.date })
      }
    }
    return map
  }, [paybacks])

  // "by_me" paybacks as virtual expense rows
  const byMeAsExpenses = useMemo(() => {
    return paybacks
      .filter(pb => pb.direction === 'by_me')
      .map(pb => ({
        id: `payback_${pb.id}`,
        user_id: pb.user_id,
        name: pb.name || '',
        category: pb.category || '',
        amount: pb.amount,
        date: pb.date,
        created_at: pb.created_at,
        _paybackPerson: pb.person,
      }))
  }, [paybacks])

  // Options for the "to_me" payback expense dropdown: regular (not fully paid) + fixed expenses
  const paybackExpenseOptions = useMemo(() => {
    const regularOpts = expenses
      .filter(exp => {
        const returned = toMeByExpense[exp.id] || 0
        return exp.amount - returned > 0
      })
      .map(exp => {
        const returned = toMeByExpense[exp.id] || 0
        const remaining = exp.amount - returned
        return {
          value: `expense:${exp.id}`,
          label: `${exp.name} - ${formatCurrency(remaining)} (${formatDate(exp.date)})`,
          _date: exp.date,
          _amount: remaining,
        }
      })

    const fixedOpts = fixedExpenses.map(fe => {
      const returned = toMeByFixed[fe.id]?.total || 0
      const remaining = fe.amount - returned
      return {
        value: `fixed:${fe.id}`,
        label: `${fe.name} - ${formatCurrency(remaining)} (קבועה)`,
        _date: fe.start_date,
        _amount: remaining,
      }
    })

    return [...regularOpts, ...fixedOpts].sort((a, b) => b._date.localeCompare(a._date))
  }, [expenses, fixedExpenses, toMeByExpense, toMeByFixed])

  // Merge real + inflated + by_me paybacks, adjust amounts for to_me paybacks
  const allExpenses = useMemo(() => {
    const adjusted = expenses.map(exp => {
      const returned = toMeByExpense[exp.id] || 0
      return { ...exp, amount: exp.amount - returned, _originalAmount: exp.amount, _returnedAmount: returned }
    })

    const inflatedAdjusted = inflatedExpenses.map(e => ({
      ...e,
      _originalAmount: undefined as number | undefined,
      _returnedAmount: undefined as number | undefined,
      _paybackPerson: undefined as string | undefined,
    }))

    for (const [fixedId, data] of Object.entries(toMeByFixed)) {
      for (const pb of data.items) {
        const candidates = inflatedAdjusted
          .filter(ie => ie.id.startsWith(fixedId + '_') && ie.date <= pb.date)
          .sort((a, b) => b.date.localeCompare(a.date))
        if (candidates.length > 0) {
          const target = candidates[0]
          if (!target._originalAmount) {
            target._originalAmount = target.amount
            target._returnedAmount = 0
          }
          target._returnedAmount = (target._returnedAmount || 0) + pb.amount
          target.amount -= pb.amount
        }
      }
    }

    const merged = [
      ...adjusted.filter(e => e.amount !== 0).map(e => ({ ...e, _paybackPerson: undefined as string | undefined })),
      ...inflatedAdjusted.filter(e => e.amount !== 0),
      ...byMeAsExpenses.map(e => ({ ...e, _originalAmount: undefined as number | undefined, _returnedAmount: undefined as number | undefined })),
    ]
    return merged.sort((a, b) => b.date.localeCompare(a.date))
  }, [expenses, inflatedExpenses, byMeAsExpenses, toMeByExpense, toMeByFixed])

  // Column definitions for each sub-tab
  const allExpCols: ColumnDef[] = useMemo(() => [
    { key: 'name', type: 'string', label: 'שם הוצאה' },
    { key: 'category', type: 'string', label: 'קטגוריה' },
    { key: 'amount', type: 'number', label: 'סכום' },
    { key: 'date', type: 'date', label: 'תאריך' },
  ], [])

  const regularExpCols: ColumnDef[] = useMemo(() => [
    { key: 'name', type: 'string', label: 'שם הוצאה' },
    { key: 'category', type: 'string', label: 'קטגוריה' },
    { key: 'amount', type: 'number', label: 'סכום' },
    { key: 'date', type: 'date', label: 'תאריך' },
  ], [])

  const fixedExpCols: ColumnDef[] = useMemo(() => [
    { key: 'name', type: 'string', label: 'שם הוצאה' },
    { key: 'category', type: 'string', label: 'קטגוריה' },
    { key: 'amount', type: 'number', label: 'סכום' },
    { key: 'start_date', type: 'date', label: 'תאריך התחלה' },
    { key: 'end_date', type: 'date', label: 'תאריך סיום' },
  ], [])

  const paybackCols: ColumnDef[] = useMemo(() => [
    { key: 'direction', type: 'string', label: 'כיוון' },
    { key: 'details', type: 'string', label: 'פרטים' },
    { key: 'category', type: 'string', label: 'קטגוריה' },
    { key: 'amount', type: 'number', label: 'סכום' },
    { key: 'date', type: 'date', label: 'תאריך' },
    { key: 'person', type: 'string', label: 'אדם' },
  ], [])

  const getAllExpValue = useCallback((item: (typeof allExpenses)[0], key: string) => {
    if (key === 'name') return item.name
    if (key === 'category') return item.category
    if (key === 'amount') return item.amount
    if (key === 'date') return item.date
    return null
  }, [])

  const getRegularExpValue = useCallback((item: (typeof expenses)[0], key: string) => {
    if (key === 'name') return item.name
    if (key === 'category') return item.category
    if (key === 'amount') return item.amount
    if (key === 'date') return item.date
    return null
  }, [])

  const getFixedExpValue = useCallback((item: (typeof fixedExpenses)[0], key: string) => {
    if (key === 'name') return item.name
    if (key === 'category') return item.category
    if (key === 'amount') return item.amount
    if (key === 'start_date') return item.start_date
    if (key === 'end_date') return item.end_date || ''
    return null
  }, [])

  const getPaybackDetails = useCallback((pb: (typeof paybacks)[0]) => {
    if (pb.direction === 'by_me') return pb.name || ''
    const linkedExp = pb.expense_id ? expenses.find(e => e.id === pb.expense_id) : null
    const linkedFixed = pb.fixed_expense_id ? fixedExpenses.find(e => e.id === pb.fixed_expense_id) : null
    return linkedExp ? linkedExp.name : linkedFixed ? `${linkedFixed.name} (קבועה)` : 'הוצאה שנמחקה'
  }, [expenses, fixedExpenses])

  const getPaybackCategory = useCallback((pb: (typeof paybacks)[0]) => {
    if (pb.direction === 'by_me') return pb.category || ''
    const linkedExp = pb.expense_id ? expenses.find(e => e.id === pb.expense_id) : null
    const linkedFixed = pb.fixed_expense_id ? fixedExpenses.find(e => e.id === pb.fixed_expense_id) : null
    return linkedExp ? linkedExp.category : linkedFixed ? linkedFixed.category : '-'
  }, [expenses, fixedExpenses])

  const getPaybackValue = useCallback((item: (typeof paybacks)[0], key: string) => {
    if (key === 'direction') return item.direction === 'by_me' ? 'שילמתי' : 'קיבלתי'
    if (key === 'details') return getPaybackDetails(item)
    if (key === 'category') return getPaybackCategory(item)
    if (key === 'amount') return item.amount
    if (key === 'date') return item.date
    if (key === 'person') return item.person
    return null
  }, [getPaybackDetails, getPaybackCategory])

  const allExpTable = useTableControls(allExpenses, allExpCols, 'date', 'desc', getAllExpValue)
  const regularExpTable = useTableControls(expenses, regularExpCols, 'date', 'desc', getRegularExpValue)
  const fixedExpTable = useTableControls(fixedExpenses, fixedExpCols, 'start_date', 'desc', getFixedExpValue)
  const paybackTable = useTableControls(paybacks, paybackCols, 'date', 'desc', getPaybackValue)

  const activeTable = activeTab === 'all' ? allExpTable : activeTab === 'regular' ? regularExpTable : activeTab === 'fixed' ? fixedExpTable : paybackTable

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

  // Recent salaries (last 6 months)
  const recentSalaries = useMemo(() => {
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const cutoff = sixMonthsAgo.toISOString().slice(0, 10)
    return salaries.filter(s => s.month >= cutoff)
  }, [salaries])

  const salaryOptions = useMemo(() => {
    return [...recentSalaries]
      .sort((a, b) => b.neto - a.neto)
      .map(s => {
        const d = new Date(s.month + 'T00:00:00')
        const monthLabel = d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
        return { value: s.id, label: `${monthLabel} - ${s.employer}` }
      })
  }, [recentSalaries])

  // Unique employer options from salaries, sorted by total neto
  const employerOptions = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const s of salaries) totals[s.employer] = (totals[s.employer] || 0) + s.neto
    const unique = [...new Set(salaries.map(s => s.employer))]
    return unique
      .sort((a, b) => (totals[b] || 0) - (totals[a] || 0))
      .map(e => ({ value: e, label: e }))
  }, [salaries])

  const allCategoryLabels = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const e of expenses) totals[e.category] = (totals[e.category] || 0) + e.amount
    for (const ie of inflatedExpenses) totals[ie.category] = (totals[ie.category] || 0) + ie.amount
    const set = new Set<string>()
    for (const o of categoryOptions) set.add(o.label)
    for (const o of fixedCategoryOptions) set.add(o.label)
    return Array.from(set).sort((a, b) => (totals[b] || 0) - (totals[a] || 0))
  }, [categoryOptions, fixedCategoryOptions, expenses, inflatedExpenses])

  const isLoading = activeTab === 'all'
    ? (loading || fixedLoading || paybacksLoading)
    : activeTab === 'regular'
      ? loading
      : activeTab === 'fixed'
        ? fixedLoading
        : paybacksLoading

  return (
    <div className="section-page">
      <div className="section-header">
        <h1>הוצאות</h1>
        <div className="section-header-actions">
          {!isLoading && (
            <FilterPopover columns={activeTab === 'all' ? allExpCols : activeTab === 'regular' ? regularExpCols : activeTab === 'fixed' ? fixedExpCols : paybackCols} filters={activeTable.filters} stringOptions={activeTable.stringOptions} onStringFilter={activeTable.setStringFilter} onNumberFilter={activeTable.setNumberFilter} onDateFilter={activeTable.setDateFilter} onClear={activeTable.clearFilters} hasActive={activeTable.hasActiveFilters} />
          )}
          <div className="section-tabs">
            <NavLink to="/expenses" end className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
              טבלה
            </NavLink>
            <NavLink to="/expenses/charts" className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
              גרפים
            </NavLink>
          </div>
        </div>
      </div>

      {/* Sub-tabs for expense types */}
      <div className="sub-tabs">
        <button className={`sub-tab${activeTab === 'all' ? ' active' : ''}`} onClick={() => setActiveTab('all')}>
          כל ההוצאות
        </button>
        <button className={`sub-tab${activeTab === 'regular' ? ' active' : ''}`} onClick={() => setActiveTab('regular')}>
          הוצאות רגילות
        </button>
        <button className={`sub-tab${activeTab === 'fixed' ? ' active' : ''}`} onClick={() => setActiveTab('fixed')}>
          הוצאות קבועות
        </button>
        <button className={`sub-tab${activeTab === 'paybacks' ? ' active' : ''}`} onClick={() => setActiveTab('paybacks')}>
          העברות
        </button>
      </div>

      {isLoading ? (
        <div className="section-empty">טוען...</div>
      ) : activeTab === 'all' ? (
        allExpenses.length === 0 ? (
          <div className="section-empty">אין הוצאות עדיין. לחץ על + כדי להוסיף.</div>
        ) : (
            <div className="section-table-wrap">
              <table className="section-table">
                <thead>
                  <tr>
                    <SortableTh label="שם הוצאה" colKey="name" sortKey={allExpTable.sortKey} sortDir={allExpTable.sortDir} onSort={allExpTable.toggleSort} />
                    <SortableTh label="קטגוריה" colKey="category" sortKey={allExpTable.sortKey} sortDir={allExpTable.sortDir} onSort={allExpTable.toggleSort} />
                    <SortableTh label="סכום" colKey="amount" sortKey={allExpTable.sortKey} sortDir={allExpTable.sortDir} onSort={allExpTable.toggleSort} />
                    <SortableTh label="תאריך" colKey="date" sortKey={allExpTable.sortKey} sortDir={allExpTable.sortDir} onSort={allExpTable.toggleSort} />
                  </tr>
                </thead>
                <tbody>
                  {allExpTable.processed.map(exp => (
                    <tr key={exp.id}>
                      <td>{exp.name}</td>
                      <td>{exp.category}</td>
                      <td className="num-cell">{formatCurrency(exp.amount)}</td>
                      <td>{formatDate(exp.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        )
      ) : activeTab === 'regular' ? (
        expenses.length === 0 ? (
          <div className="section-empty">אין הוצאות רגילות עדיין. לחץ על + כדי להוסיף.</div>
        ) : (
            <div className="section-table-wrap">
              <table className="section-table">
                <thead>
                  <tr>
                    <SortableTh label="שם הוצאה" colKey="name" sortKey={regularExpTable.sortKey} sortDir={regularExpTable.sortDir} onSort={regularExpTable.toggleSort} />
                    <SortableTh label="קטגוריה" colKey="category" sortKey={regularExpTable.sortKey} sortDir={regularExpTable.sortDir} onSort={regularExpTable.toggleSort} />
                    <SortableTh label="סכום" colKey="amount" sortKey={regularExpTable.sortKey} sortDir={regularExpTable.sortDir} onSort={regularExpTable.toggleSort} />
                    <SortableTh label="תאריך" colKey="date" sortKey={regularExpTable.sortKey} sortDir={regularExpTable.sortDir} onSort={regularExpTable.toggleSort} />
                    <th className="col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {regularExpTable.processed.map(exp => (
                    <tr key={exp.id}>
                      <td>{exp.name}</td>
                      <td>{exp.category}</td>
                      <td className="num-cell">{formatCurrency(exp.amount)}</td>
                      <td>{formatDate(exp.date)}</td>
                      <td className="col-actions actions-group">
                        <button className="edit-btn" onClick={() => setEditingExpense(exp.id)} title="ערוך">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
                          </svg>
                        </button>
                        <button className="delete-btn" onClick={() => { setPendingDeleteId(exp.id); setPendingDeleteType('expense') }} title="מחק">
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
      ) : activeTab === 'fixed' ? (
        fixedExpenses.length === 0 ? (
          <div className="section-empty">אין הוצאות קבועות עדיין. לחץ על + כדי להוסיף.</div>
        ) : (
            <div className="section-table-wrap">
              <table className="section-table">
                <thead>
                  <tr>
                    <SortableTh label="שם הוצאה" colKey="name" sortKey={fixedExpTable.sortKey} sortDir={fixedExpTable.sortDir} onSort={fixedExpTable.toggleSort} />
                    <SortableTh label="קטגוריה" colKey="category" sortKey={fixedExpTable.sortKey} sortDir={fixedExpTable.sortDir} onSort={fixedExpTable.toggleSort} />
                    <SortableTh label="סכום" colKey="amount" sortKey={fixedExpTable.sortKey} sortDir={fixedExpTable.sortDir} onSort={fixedExpTable.toggleSort} />
                    <SortableTh label="תאריך התחלה" colKey="start_date" sortKey={fixedExpTable.sortKey} sortDir={fixedExpTable.sortDir} onSort={fixedExpTable.toggleSort} />
                    <SortableTh label="תאריך סיום" colKey="end_date" sortKey={fixedExpTable.sortKey} sortDir={fixedExpTable.sortDir} onSort={fixedExpTable.toggleSort} />
                    <th className="col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {fixedExpTable.processed.map(exp => (
                    <tr key={exp.id}>
                      <td>{exp.name}</td>
                      <td>{exp.category}</td>
                      <td className="num-cell">{formatCurrency(exp.amount)}</td>
                      <td>{formatDate(exp.start_date)}</td>
                      <td>{exp.end_date ? formatDate(exp.end_date) : '-'}</td>
                      <td className="col-actions actions-group">
                        <button className="edit-btn" onClick={() => setEditingFixed(exp.id)} title="ערוך">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
                          </svg>
                        </button>
                        <button className="delete-btn" onClick={() => { setPendingDeleteId(exp.id); setPendingDeleteType('fixed') }} title="מחק">
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
      ) : (
        /* Paybacks tab */
        paybacks.length === 0 ? (
          <div className="section-empty">אין העברות עדיין. לחץ על + כדי להוסיף.</div>
        ) : (
            <div className="section-table-wrap">
              <table className="section-table">
                <thead>
                  <tr>
                    <SortableTh label="כיוון" colKey="direction" sortKey={paybackTable.sortKey} sortDir={paybackTable.sortDir} onSort={paybackTable.toggleSort} />
                    <SortableTh label="פרטים" colKey="details" sortKey={paybackTable.sortKey} sortDir={paybackTable.sortDir} onSort={paybackTable.toggleSort} />
                    <SortableTh label="קטגוריה" colKey="category" sortKey={paybackTable.sortKey} sortDir={paybackTable.sortDir} onSort={paybackTable.toggleSort} />
                    <SortableTh label="סכום" colKey="amount" sortKey={paybackTable.sortKey} sortDir={paybackTable.sortDir} onSort={paybackTable.toggleSort} />
                    <SortableTh label="תאריך" colKey="date" sortKey={paybackTable.sortKey} sortDir={paybackTable.sortDir} onSort={paybackTable.toggleSort} />
                    <SortableTh label="אדם" colKey="person" sortKey={paybackTable.sortKey} sortDir={paybackTable.sortDir} onSort={paybackTable.toggleSort} />
                    <th className="col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {paybackTable.processed.map(pb => {
                    const linkedExp = pb.direction === 'to_me' && pb.expense_id ? expenses.find(e => e.id === pb.expense_id) : null
                    const linkedFixed = pb.direction === 'to_me' && pb.fixed_expense_id ? fixedExpenses.find(e => e.id === pb.fixed_expense_id) : null
                    return (
                    <tr key={pb.id}>
                      <td>
                        <span className={`direction-badge ${pb.direction}`}>
                          {pb.direction === 'by_me' ? 'שילמתי' : 'קיבלתי'}
                        </span>
                      </td>
                      <td>
                        {pb.direction === 'by_me'
                          ? pb.name
                          : linkedExp ? linkedExp.name : linkedFixed ? `${linkedFixed.name} (קבועה)` : 'הוצאה שנמחקה'
                        }
                      </td>
                      <td>{pb.direction === 'by_me' ? pb.category : (linkedExp ? linkedExp.category : linkedFixed ? linkedFixed.category : '-')}</td>
                      <td className="num-cell">{formatCurrency(pb.amount)}</td>
                      <td>{formatDate(pb.date)}</td>
                      <td>{pb.person}</td>
                      <td className="col-actions actions-group">
                        <button className="edit-btn" onClick={() => setEditingPayback(pb.id)} title="ערוך">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
                          </svg>
                        </button>
                        <button className="delete-btn" onClick={() => { setPendingDeleteId(pb.id); setPendingDeleteType('payback') }} title="מחק">
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
      )}

      {pendingDeleteId && pendingDeleteType && (
        <ConfirmDialog
          message="האם אתה בטוח שברצונך למחוק?"
          itemName={(() => {
            if (pendingDeleteType === 'expense') {
              const exp = expenses.find(e => e.id === pendingDeleteId)
              return exp ? `${exp.name} - ${formatCurrency(exp.amount)} (${formatDate(exp.date)})` : undefined
            }
            if (pendingDeleteType === 'fixed') {
              const fe = fixedExpenses.find(e => e.id === pendingDeleteId)
              return fe ? `${fe.name} - ${formatCurrency(fe.amount)}` : undefined
            }
            if (pendingDeleteType === 'payback') {
              const pb = paybacks.find(p => p.id === pendingDeleteId)
              if (!pb) return undefined
              const label = pb.direction === 'by_me' ? pb.name : (pb.expense_id ? expenses.find(e => e.id === pb.expense_id)?.name : pb.fixed_expense_id ? fixedExpenses.find(e => e.id === pb.fixed_expense_id)?.name : null)
              return `${label || 'החזר'} - ${formatCurrency(pb.amount)} (${formatDate(pb.date)})`
            }
            return undefined
          })()}
          details={(() => {
            if (pendingDeleteType === 'expense') {
              const linked = paybacks.filter(p => p.expense_id === pendingDeleteId)
              if (linked.length === 0) return undefined
              return linked.map(p => `החזר - ${formatCurrency(p.amount)} מ${p.person} (${formatDate(p.date)})`)
            }
            if (pendingDeleteType === 'fixed') {
              const related = inflatedExpenses.filter(ie => ie.id.startsWith(pendingDeleteId + '_'))
              if (related.length === 0) return undefined
              const dates = related.map(ie => ie.date).sort()
              return [`${related.length} הוצאות (${formatDate(dates[dates.length - 1])} - ${formatDate(dates[0])})`]
            }
            return undefined
          })()}
          onConfirm={() => {
            if (pendingDeleteType === 'expense') {
              deleteExpense(pendingDeleteId)
              removeByExpenseId(pendingDeleteId)
            }
            else if (pendingDeleteType === 'fixed') { deleteFixedExpense(pendingDeleteId); removeByFixedExpenseId(pendingDeleteId) }
            else if (pendingDeleteType === 'payback') deletePayback(pendingDeleteId)
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
            <button className="fab-menu-item" onClick={() => setModal('expense')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
              </svg>
              הוצאה רגילה
            </button>
            <button className="fab-menu-item" onClick={() => setModal('fixed')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4" /><path d="M12 18v4" /><path d="M4.93 4.93l2.83 2.83" /><path d="M16.24 16.24l2.83 2.83" /><path d="M2 12h4" /><path d="M18 12h4" /><path d="M4.93 19.07l2.83-2.83" /><path d="M16.24 7.76l2.83-2.83" />
              </svg>
              הוצאה קבועה
            </button>
            <button className="fab-menu-item" onClick={() => setModal('payback')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              החזר
            </button>
            <button className="fab-menu-item" onClick={() => setModal('expense_type')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l4.58-4.58c.94-.94.94-2.48 0-3.42L9 5Z" /><circle cx="6" cy="9" r="1" />
              </svg>
              סוגי הוצאות
            </button>
          </div>
        )}
        <button className="section-fab" onClick={() => setModal(modal === 'picker' ? null : 'picker')} title="הוסף הוצאה">+</button>
      </div>

      {/* Form modals — each is its own component with isolated state */}
      {modal === 'expense' && (
        <ExpenseForm
          expenses={expenses}
          sortedCategoryOptions={sortedCategoryOptions}
          categoryLoading={categoryLoading}
          addCategory={addCategory}
          removeCategory={removeCategory}
          salaryOptions={salaryOptions}
          recentSalaries={recentSalaries}
          onSubmit={addExpense}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'fixed' && (
        <FixedExpenseForm
          sortedFixedCategoryOptions={sortedFixedCategoryOptions}
          fixedCategoryLoading={fixedCategoryLoading}
          addFixedCategory={addFixedCategory}
          removeFixedCategory={removeFixedCategory}
          employerOptions={employerOptions}
          onSubmit={addFixedExpense}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'payback' && (
        <PaybackForm
          expenses={expenses}
          fixedExpenses={fixedExpenses}
          sortedCategoryOptions={sortedCategoryOptions}
          categoryLoading={categoryLoading}
          addCategory={addCategory}
          removeCategory={removeCategory}
          sortedPersonOptions={sortedPersonOptions}
          personLoading={personLoading}
          addPerson={addPerson}
          removePerson={removePerson}
          paybackExpenseOptions={paybackExpenseOptions}
          toMeByExpense={toMeByExpense}
          toMeByFixed={toMeByFixed}
          onSubmit={addPayback}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'expense_type' && (
        <ExpenseTypeForm
          sortedExpenseTypeOptions={sortedExpenseTypeOptions}
          etTypeLoading={etTypeLoading}
          addExpenseTypeOption={addExpenseTypeOption}
          removeExpenseTypeOption={removeExpenseTypeOption}
          expenseTypeOptions={expenseTypeOptions}
          expenseTypes={expenseTypes}
          allCategoryLabels={allCategoryLabels}
          addExpenseType={addExpenseType}
          updateExpenseType={updateExpenseType}
          deleteExpenseType={deleteExpenseType}
          onClose={() => setModal(null)}
        />
      )}

      {/* Edit modals */}
      {editingFixed && (() => {
        const fe = fixedExpenses.find(e => e.id === editingFixed)
        if (!fe) return null
        return (
          <EditFixedExpenseForm
            initialEndDate={fe.end_date || ''}
            onSubmit={async (endDate) => { await updateFixedExpense(editingFixed, { end_date: endDate }) }}
            onClose={() => setEditingFixed(null)}
          />
        )
      })()}

      {editingExpense && (() => {
        const exp = expenses.find(e => e.id === editingExpense)
        if (!exp) return null
        return (
          <EditExpenseForm
            expense={exp}
            expenses={expenses}
            sortedCategoryOptions={sortedCategoryOptions}
            categoryLoading={categoryLoading}
            addCategory={addCategory}
            removeCategory={removeCategory}
            onSubmit={async (id, fields) => { await updateExpense(id, fields) }}
            onClose={() => setEditingExpense(null)}
          />
        )
      })()}

      {editingPayback && (() => {
        const pb = paybacks.find(p => p.id === editingPayback)
        if (!pb) return null
        return (
          <EditPaybackForm
            payback={pb}
            sortedCategoryOptions={sortedCategoryOptions}
            categoryLoading={categoryLoading}
            addCategory={addCategory}
            removeCategory={removeCategory}
            sortedPersonOptions={sortedPersonOptions}
            personLoading={personLoading}
            addPerson={addPerson}
            removePerson={removePerson}
            onSubmit={async (id, fields) => { await updatePayback(id, fields) }}
            onClose={() => setEditingPayback(null)}
          />
        )
      })()}
    </div>
  )
}