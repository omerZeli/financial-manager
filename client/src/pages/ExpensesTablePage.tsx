import { useEffect, useState, useRef, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useExpenses } from '../contexts/ExpensesContext'
import { useFixedExpenses } from '../contexts/FixedExpensesContext'
import { usePaybacks } from '../contexts/PaybacksContext'
import { useExpenseTypes } from '../contexts/ExpenseTypesContext'
import { useSalary } from '../contexts/SalaryContext'
import { useDropdownOptions } from '../hooks/useDropdownOptions'
import { CustomSelect } from '../components/common/CustomSelect'
import { ReadOnlySelect } from '../components/common/ReadOnlySelect'
import { AutocompleteInput } from '../components/common/AutocompleteInput'
import { NumberInput } from '../components/common/NumberInput'
import { MultiSelect } from '../components/common/MultiSelect'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import DateInput from '../components/common/DateInput'
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
  const { expenses, loading, fetchExpenses, addExpense, deleteExpense } = useExpenses()
  const { fixedExpenses, inflatedExpenses, loading: fixedLoading, fetchFixedExpenses, addFixedExpense, updateFixedExpense, deleteFixedExpense } = useFixedExpenses()
  const { paybacks, loading: paybacksLoading, fetchPaybacks, addPayback, deletePayback, removeByExpenseId } = usePaybacks()
  const { salaries, fetchSalaries } = useSalary()
  const { options: categoryOptions, loading: categoryLoading, addOption: addCategory, removeOption: removeCategory } = useDropdownOptions('expense_category')
  const { options: fixedCategoryOptions, loading: fixedCategoryLoading, addOption: addFixedCategory, removeOption: removeFixedCategory } = useDropdownOptions('fixed_expense_category')
  const { options: personOptions, loading: personLoading, addOption: addPerson, removeOption: removePerson } = useDropdownOptions('payback_person')
  const { options: expenseTypeOptions, loading: etTypeLoading, addOption: addExpenseTypeOption, removeOption: removeExpenseTypeOption } = useDropdownOptions('expense_type')
  const { expenseTypes, fetchExpenseTypes, addExpenseType, updateExpenseType, deleteExpenseType } = useExpenseTypes()

  const [modal, setModal] = useState<ModalType>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('all')

  // Regular expense form
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [deductedFromSalary, setDeductedFromSalary] = useState(false)
  const [selectedSalaryId, setSelectedSalaryId] = useState('')

  // Fixed expense form
  const [fixedName, setFixedName] = useState('')
  const [fixedCategory, setFixedCategory] = useState('')
  const [fixedAmount, setFixedAmount] = useState('')
  const [fixedStartDate, setFixedStartDate] = useState('')
  const [hasEndDate, setHasEndDate] = useState(false)
  const [fixedEndDate, setFixedEndDate] = useState('')
  const [fixedSaving, setFixedSaving] = useState(false)
  const [fixedDeductedFromSalary, setFixedDeductedFromSalary] = useState(false)
  const [fixedSalaryEmployer, setFixedSalaryEmployer] = useState('')

  // Payback form
  const [pbDirection, setPbDirection] = useState<'by_me' | 'to_me'>('by_me')
  const [pbName, setPbName] = useState('')
  const [pbCategory, setPbCategory] = useState('')
  const [pbAmount, setPbAmount] = useState('')
  const [pbDate, setPbDate] = useState('')
  const [pbPerson, setPbPerson] = useState('')
  const [pbExpenseId, setPbExpenseId] = useState('')
  const [pbSaving, setPbSaving] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [pendingDeleteType, setPendingDeleteType] = useState<'expense' | 'fixed' | 'payback' | null>(null)

  // Edit fixed expense state
  const [editingFixed, setEditingFixed] = useState<string | null>(null)
  const [editFixedEndDate, setEditFixedEndDate] = useState('')
  const [editFixedSaving, setEditFixedSaving] = useState(false)

  // Expense type form
  const [etTypeName, setEtTypeName] = useState('')
  const [etCategories, setEtCategories] = useState<string[]>([])
  const [etSaving, setEtSaving] = useState(false)

  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchExpenses() }, [fetchExpenses])
  useEffect(() => { fetchFixedExpenses() }, [fetchFixedExpenses])
  useEffect(() => { fetchPaybacks() }, [fetchPaybacks])
  useEffect(() => { fetchExpenseTypes() }, [fetchExpenseTypes])
  useEffect(() => { fetchSalaries() }, [fetchSalaries])

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

  // Merge real + inflated + by_me paybacks, adjust amounts for to_me paybacks
  const allExpenses = useMemo(() => {
    const adjusted = expenses.map(exp => {
      const returned = toMeByExpense[exp.id] || 0
      return { ...exp, amount: exp.amount - returned, _originalAmount: exp.amount, _returnedAmount: returned }
    })
    const merged = [
      ...adjusted.filter(e => e.amount !== 0).map(e => ({ ...e, _paybackPerson: undefined as string | undefined })),
      ...inflatedExpenses.map(e => ({ ...e, _originalAmount: undefined as number | undefined, _returnedAmount: undefined as number | undefined, _paybackPerson: undefined as string | undefined })),
      ...byMeAsExpenses.map(e => ({ ...e, _originalAmount: undefined as number | undefined, _returnedAmount: undefined as number | undefined })),
    ]
    return merged.sort((a, b) => b.date.localeCompare(a.date))
  }, [expenses, inflatedExpenses, byMeAsExpenses, toMeByExpense])

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

  const resetExpenseForm = () => { setName(''); setCategory(''); setAmount(''); setDate(''); setDeductedFromSalary(false); setSelectedSalaryId('') }
  const resetFixedForm = () => { setFixedName(''); setFixedCategory(''); setFixedAmount(''); setFixedStartDate(''); setHasEndDate(false); setFixedEndDate(''); setFixedDeductedFromSalary(false); setFixedSalaryEmployer('') }
  const resetPaybackForm = () => { setPbDirection('by_me'); setPbName(''); setPbCategory(''); setPbAmount(''); setPbDate(''); setPbPerson(''); setPbExpenseId('') }

  // Recent salaries (last 6 months)
  const recentSalaries = useMemo(() => {
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const cutoff = sixMonthsAgo.toISOString().slice(0, 10)
    return salaries.filter(s => s.month >= cutoff)
  }, [salaries])

  const salaryOptions = useMemo(() => {
    return recentSalaries.map(s => {
      const d = new Date(s.month + 'T00:00:00')
      const monthLabel = d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
      return { value: s.id, label: `${monthLabel} - ${s.employer}` }
    })
  }, [recentSalaries])

  // Auto-select salary for regular expense when date changes (previous month's salary)
  useEffect(() => {
    if (!deductedFromSalary || !date) { setSelectedSalaryId(''); return }
    const d = new Date(date + 'T00:00:00')
    const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1)
    const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
    const matching = recentSalaries.filter(s => s.month.slice(0, 7) === prevMonth)
    if (matching.length === 1) setSelectedSalaryId(matching[0].id)
    else setSelectedSalaryId('')
  }, [deductedFromSalary, date, recentSalaries])

  // Unique employer options from salaries
  const employerOptions = useMemo(() => {
    const unique = [...new Set(salaries.map(s => s.employer))]
    return unique.map(e => ({ value: e, label: e }))
  }, [salaries])

  // Auto-select employer when there's only one
  useEffect(() => {
    if (!fixedDeductedFromSalary) { setFixedSalaryEmployer(''); return }
    if (employerOptions.length === 1) setFixedSalaryEmployer(employerOptions[0].value)
    else setFixedSalaryEmployer('')
  }, [fixedDeductedFromSalary, employerOptions])

  const openEditFixed = (id: string) => {
    const fe = fixedExpenses.find(e => e.id === id)
    if (!fe) return
    setEditingFixed(id)
    setEditFixedEndDate(fe.end_date || '')
  }

  const resetEditFixed = () => {
    setEditingFixed(null)
    setEditFixedEndDate('')
  }

  const handleEditFixedSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingFixed) return
    setEditFixedSaving(true)
    await updateFixedExpense(editingFixed, {
      end_date: editFixedEndDate || null,
    })
    setEditFixedSaving(false)
    resetEditFixed()
  }

  // Expense type helpers
  const resetExpenseTypeForm = () => { setEtTypeName(''); setEtCategories([]) }

  const expenseNameSuggestions = useMemo(() => {
    const set = new Set<string>()
    for (const e of expenses) set.add(e.name)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [expenses])

  const allCategoryLabels = useMemo(() => {
    const set = new Set<string>()
    for (const o of categoryOptions) set.add(o.label)
    for (const o of fixedCategoryOptions) set.add(o.label)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [categoryOptions, fixedCategoryOptions])

  const existingType = useMemo(() => expenseTypes.find(et => et.type_name === etTypeName), [expenseTypes, etTypeName])

  useEffect(() => {
    if (existingType) {
      setEtCategories(existingType.categories)
    } else {
      setEtCategories([])
    }
  }, [existingType])

  const handleExpenseTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!etTypeName || etCategories.length === 0) return
    setEtSaving(true)
    if (existingType) {
      await updateExpenseType(existingType.id, etCategories)
    } else {
      await addExpenseType(etTypeName, etCategories)
    }
    setEtSaving(false)
    setModal(null)
    resetExpenseTypeForm()
  }

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !category || !amount || !date) return
    setSaving(true)
    await addExpense({ name, category, amount: Number(amount), date, salary_id: deductedFromSalary && selectedSalaryId ? selectedSalaryId : null })
    setSaving(false)
    setModal(null)
    resetExpenseForm()
  }

  const handleFixedSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fixedName || !fixedCategory || !fixedAmount || !fixedStartDate) return
    setFixedSaving(true)
    await addFixedExpense({
      name: fixedName,
      category: fixedCategory,
      amount: Number(fixedAmount),
      start_date: fixedStartDate,
      end_date: hasEndDate && fixedEndDate ? fixedEndDate : null,
      salary_employer: fixedDeductedFromSalary && fixedSalaryEmployer ? fixedSalaryEmployer : null,
    })
    setFixedSaving(false)
    setModal(null)
    resetFixedForm()
  }

  const handlePaybackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pbAmount || !pbDate || !pbPerson) return
    if (pbDirection === 'by_me' && (!pbName || !pbCategory)) return
    if (pbDirection === 'to_me' && !pbExpenseId) return
    setPbSaving(true)
    await addPayback({
      direction: pbDirection,
      name: pbDirection === 'by_me' ? pbName : null,
      category: pbDirection === 'by_me' ? pbCategory : null,
      amount: Number(pbAmount),
      date: pbDate,
      person: pbPerson,
      expense_id: pbDirection === 'to_me' ? pbExpenseId : null,
    })
    setPbSaving(false)
    setModal(null)
    resetPaybackForm()
  }

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
        <div className="section-tabs">
          <NavLink to="/expenses" end className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
            טבלה
          </NavLink>
          <NavLink to="/expenses/charts" className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
            גרפים
          </NavLink>
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
                  <th>שם הוצאה</th>
                  <th>קטגוריה</th>
                  <th>סכום</th>
                  <th>תאריך</th>
                </tr>
              </thead>
              <tbody>
                {allExpenses.map(exp => (
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
                  <th>שם הוצאה</th>
                  <th>קטגוריה</th>
                  <th>סכום</th>
                  <th>תאריך</th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id}>
                    <td>{exp.name}</td>
                    <td>{exp.category}</td>
                    <td className="num-cell">{formatCurrency(exp.amount)}</td>
                    <td>{formatDate(exp.date)}</td>
                    <td className="col-actions">
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
                  <th>שם הוצאה</th>
                  <th>קטגוריה</th>
                  <th>סכום</th>
                  <th>תאריך התחלה</th>
                  <th>תאריך סיום</th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {fixedExpenses.map(exp => (
                  <tr key={exp.id}>
                    <td>{exp.name}</td>
                    <td>{exp.category}</td>
                    <td className="num-cell">{formatCurrency(exp.amount)}</td>
                    <td>{formatDate(exp.start_date)}</td>
                    <td>{exp.end_date ? formatDate(exp.end_date) : '-'}</td>
                    <td className="col-actions actions-group">
                      <button className="edit-btn" onClick={() => openEditFixed(exp.id)} title="ערוך">
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
                  <th>כיוון</th>
                  <th>פרטים</th>
                  <th>קטגוריה</th>
                  <th>סכום</th>
                  <th>תאריך</th>
                  <th>אדם</th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {paybacks.map(pb => {
                  const linkedExp = pb.direction === 'to_me' ? expenses.find(e => e.id === pb.expense_id) : null
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
                        : (() => {
                            return linkedExp ? linkedExp.name : 'הוצאה שנמחקה'
                          })()
                      }
                    </td>
                    <td>{pb.direction === 'by_me' ? pb.category : (linkedExp ? linkedExp.category : '-')}</td>
                    <td className="num-cell">{formatCurrency(pb.amount)}</td>
                    <td>{formatDate(pb.date)}</td>
                    <td>{pb.person}</td>
                    <td className="col-actions">
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
              const label = pb.direction === 'by_me' ? pb.name : expenses.find(e => e.id === pb.expense_id)?.name
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
            else if (pendingDeleteType === 'fixed') deleteFixedExpense(pendingDeleteId)
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

      {/* Regular expense modal */}
      {modal === 'expense' && (
        <div className="modal-overlay" onClick={() => { setModal(null); resetExpenseForm() }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setModal(null); resetExpenseForm() }} title="סגור">&times;</button>
            <h2>הוסף הוצאה רגילה</h2>
            <form onSubmit={handleExpenseSubmit}>
              <label>שם הוצאה</label>
              <AutocompleteInput
                suggestions={expenseNameSuggestions}
                value={name}
                onChange={setName}
                placeholder="הכנס שם הוצאה"
                required
              />

              <label>קטגוריה</label>
              <CustomSelect
                options={categoryOptions}
                value={category}
                placeholder="הכנס קטגוריה"
                onChange={setCategory}
                onAddOption={addCategory}
                onRemoveOption={removeCategory}
                loading={categoryLoading}
              />

              <label>סכום</label>
              <NumberInput placeholder="הכנס סכום" value={amount} onChange={setAmount} required />

              <label>תאריך</label>
              <DateInput value={date} onChange={setDate} required />

              <div className="toggle-row">
                <label className="toggle-label" htmlFor="exp-salary-deduct">נוכה מהמשכורת?</label>
                <button
                  type="button"
                  id="exp-salary-deduct"
                  role="switch"
                  aria-checked={deductedFromSalary}
                  className={`toggle-switch${deductedFromSalary ? ' active' : ''}`}
                  onClick={() => { setDeductedFromSalary(prev => !prev); setSelectedSalaryId('') }}
                >
                  <span className="toggle-knob" />
                </button>
              </div>

              {deductedFromSalary && (
                <>
                  <label>משכורת</label>
                  <ReadOnlySelect
                    options={salaryOptions}
                    value={selectedSalaryId}
                    placeholder="בחר משכורת"
                    onChange={setSelectedSalaryId}
                  />
                </>
              )}

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={saving || !category || (deductedFromSalary && !selectedSalaryId)}>
                  {saving ? 'שומר...' : 'שמור'}
                </button>
                <button type="button" className="btn-cancel" onClick={() => { setModal(null); resetExpenseForm() }}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fixed expense modal */}
      {modal === 'fixed' && (
        <div className="modal-overlay" onClick={() => { setModal(null); resetFixedForm() }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setModal(null); resetFixedForm() }} title="סגור">&times;</button>
            <h2>הוסף הוצאה קבועה</h2>
            <form onSubmit={handleFixedSubmit}>
              <label>שם הוצאה</label>
              <input type="text" placeholder="הכנס שם הוצאה" value={fixedName} onChange={e => setFixedName(e.target.value)} required />

              <label>קטגוריה</label>
              <CustomSelect
                options={fixedCategoryOptions}
                value={fixedCategory}
                placeholder="הכנס קטגוריה"
                onChange={setFixedCategory}
                onAddOption={addFixedCategory}
                onRemoveOption={removeFixedCategory}
                loading={fixedCategoryLoading}
              />

              <label>סכום</label>
              <NumberInput placeholder="הכנס סכום" value={fixedAmount} onChange={setFixedAmount} required />

              <label>תאריך התחלה</label>
              <DateInput value={fixedStartDate} onChange={setFixedStartDate} required />

              <div className="toggle-row">
                <label className="toggle-label" htmlFor="has-end-date">יש תאריך סיום?</label>
                <button
                  type="button"
                  id="has-end-date"
                  role="switch"
                  aria-checked={hasEndDate}
                  className={`toggle-switch${hasEndDate ? ' active' : ''}`}
                  onClick={() => { setHasEndDate(prev => !prev); setFixedEndDate('') }}
                >
                  <span className="toggle-knob" />
                </button>
              </div>

              {hasEndDate && (
                <>
                  <label>תאריך סיום</label>
                  <DateInput value={fixedEndDate} onChange={setFixedEndDate} required min={fixedStartDate || undefined} />
                </>
              )}

              <div className="toggle-row">
                <label className="toggle-label" htmlFor="fixed-salary-deduct">נוכה מהמשכורת?</label>
                <button
                  type="button"
                  id="fixed-salary-deduct"
                  role="switch"
                  aria-checked={fixedDeductedFromSalary}
                  className={`toggle-switch${fixedDeductedFromSalary ? ' active' : ''}`}
                  onClick={() => { setFixedDeductedFromSalary(prev => !prev); setFixedSalaryEmployer('') }}
                >
                  <span className="toggle-knob" />
                </button>
              </div>

              {fixedDeductedFromSalary && (
                <>
                  <label>מעסיק</label>
                  <ReadOnlySelect
                    options={employerOptions}
                    value={fixedSalaryEmployer}
                    placeholder="בחר מעסיק"
                    onChange={setFixedSalaryEmployer}
                  />
                </>
              )}

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={fixedSaving || !fixedCategory || (fixedDeductedFromSalary && !fixedSalaryEmployer)}>
                  {fixedSaving ? 'שומר...' : 'שמור'}
                </button>
                <button type="button" className="btn-cancel" onClick={() => { setModal(null); resetFixedForm() }}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payback modal */}
      {modal === 'payback' && (
        <div className="modal-overlay" onClick={() => { setModal(null); resetPaybackForm() }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setModal(null); resetPaybackForm() }} title="סגור">&times;</button>
            <h2>הוסף החזר</h2>
            <form onSubmit={handlePaybackSubmit}>
              {/* Direction toggle */}
              <div className="direction-toggle">
                <button
                  type="button"
                  className={`direction-btn${pbDirection === 'by_me' ? ' active' : ''}`}
                  onClick={() => { setPbDirection('by_me'); setPbExpenseId('') }}
                >
                  שילמתי לאחר
                </button>
                <button
                  type="button"
                  className={`direction-btn${pbDirection === 'to_me' ? ' active' : ''}`}
                  onClick={() => { setPbDirection('to_me'); setPbName(''); setPbCategory('') }}
                >
                  שילמו לי
                </button>
              </div>

              {pbDirection === 'by_me' ? (
                <>
                  <label>שם הוצאה</label>
                  <input type="text" placeholder="הכנס שם הוצאה" value={pbName} onChange={e => setPbName(e.target.value)} required />

                  <label>קטגוריה</label>
                  <CustomSelect
                    options={categoryOptions}
                    value={pbCategory}
                    placeholder="הכנס קטגוריה"
                    onChange={setPbCategory}
                    onAddOption={addCategory}
                    onRemoveOption={removeCategory}
                    loading={categoryLoading}
                  />
                </>
              ) : (
                <>
                  <label>הוצאה מקורית</label>
                  <select
                    className="form-select"
                    value={pbExpenseId}
                    onChange={e => setPbExpenseId(e.target.value)}
                    required
                  >
                    <option value="">בחר הוצאה</option>
                    {expenses.map(exp => (
                      <option key={exp.id} value={exp.id}>
                        {exp.name} - {formatCurrency(exp.amount)} ({formatDate(exp.date)})
                      </option>
                    ))}
                  </select>
                </>
              )}

              <label>סכום</label>
              <NumberInput placeholder="הכנס סכום" value={pbAmount} onChange={setPbAmount} required />

              <label>תאריך</label>
              <DateInput value={pbDate} onChange={setPbDate} required />

              <label>
                {pbDirection === 'by_me' ? 'למי שילמתי' : 'מי שילם לי'}
              </label>
              <CustomSelect
                options={personOptions}
                value={pbPerson}
                placeholder="הכנס שם"
                onChange={setPbPerson}
                onAddOption={addPerson}
                onRemoveOption={removePerson}
                loading={personLoading}
              />

              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={pbSaving || !pbPerson || (pbDirection === 'by_me' ? !pbCategory : !pbExpenseId)}
                >
                  {pbSaving ? 'שומר...' : 'שמור'}
                </button>
                <button type="button" className="btn-cancel" onClick={() => { setModal(null); resetPaybackForm() }}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit fixed expense modal */}
      {editingFixed && (
        <div className="modal-overlay" onClick={resetEditFixed}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={resetEditFixed} title="סגור">&times;</button>
            <h2>עריכת הוצאה קבועה</h2>
            <form onSubmit={handleEditFixedSubmit}>
              <label>תאריך סיום</label>
              <DateInput value={editFixedEndDate} onChange={setEditFixedEndDate} />

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={editFixedSaving}>
                  {editFixedSaving ? 'שומר...' : 'שמור'}
                </button>
                <button type="button" className="btn-cancel" onClick={resetEditFixed}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense type modal */}
      {modal === 'expense_type' && (
        <div className="modal-overlay" onClick={() => { setModal(null); resetExpenseTypeForm() }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setModal(null); resetExpenseTypeForm() }} title="סגור">&times;</button>
            <h2>{existingType ? 'עריכת סוג הוצאות' : 'סוג הוצאות חדש'}</h2>
            <form onSubmit={handleExpenseTypeSubmit}>
              <label>סוג</label>
              <CustomSelect
                options={expenseTypeOptions}
                value={etTypeName}
                placeholder="הכנס סוג הוצאות"
                onChange={setEtTypeName}
                onAddOption={addExpenseTypeOption}
                onRemoveOption={async (id) => {
                  const opt = expenseTypeOptions.find(o => o.id === id)
                  const removed = await removeExpenseTypeOption(id)
                  if (removed && opt) {
                    const et = expenseTypes.find(e => e.type_name === opt.label)
                    if (et) await deleteExpenseType(et.id)
                    if (opt.label === etTypeName) setEtTypeName('')
                  }
                  return removed
                }}
                loading={etTypeLoading}
              />

              <label>קטגוריות</label>
              <MultiSelect
                options={allCategoryLabels}
                value={etCategories}
                placeholder="בחר קטגוריות"
                onChange={setEtCategories}
              />

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={etSaving || !etTypeName || etCategories.length === 0}>
                  {etSaving ? 'שומר...' : 'שמור'}
                </button>
                <button type="button" className="btn-cancel" onClick={() => { setModal(null); resetExpenseTypeForm() }}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
