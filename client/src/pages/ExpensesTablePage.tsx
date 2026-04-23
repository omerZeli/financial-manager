import { useEffect, useState, useRef, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useExpenses } from '../contexts/ExpensesContext'
import { useFixedExpenses } from '../contexts/FixedExpensesContext'
import { useDropdownOptions } from '../hooks/useDropdownOptions'
import { CustomSelect } from '../components/common/CustomSelect'
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

type ModalType = null | 'picker' | 'expense' | 'fixed'
type ActiveTab = 'expenses' | 'fixed'

export function ExpensesTablePage() {
  const { expenses, loading, fetchExpenses, addExpense, deleteExpense } = useExpenses()
  const { fixedExpenses, inflatedExpenses, loading: fixedLoading, fetchFixedExpenses, addFixedExpense, deleteFixedExpense } = useFixedExpenses()
  const { options: categoryOptions, loading: categoryLoading, addOption: addCategory, removeOption: removeCategory } = useDropdownOptions('expense_category')
  const { options: fixedCategoryOptions, loading: fixedCategoryLoading, addOption: addFixedCategory, removeOption: removeFixedCategory } = useDropdownOptions('fixed_expense_category')

  const [modal, setModal] = useState<ModalType>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('expenses')

  // Regular expense form
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

  // Fixed expense form
  const [fixedName, setFixedName] = useState('')
  const [fixedCategory, setFixedCategory] = useState('')
  const [fixedAmount, setFixedAmount] = useState('')
  const [fixedStartDate, setFixedStartDate] = useState('')
  const [hasEndDate, setHasEndDate] = useState(false)
  const [fixedEndDate, setFixedEndDate] = useState('')
  const [fixedSaving, setFixedSaving] = useState(false)

  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchExpenses() }, [fetchExpenses])
  useEffect(() => { fetchFixedExpenses() }, [fetchFixedExpenses])

  // Merge real + inflated expenses for the regular tab, sorted by date desc
  const allExpenses = useMemo(() => {
    return [...expenses, ...inflatedExpenses].sort((a, b) => b.date.localeCompare(a.date))
  }, [expenses, inflatedExpenses])

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

  const resetExpenseForm = () => { setName(''); setCategory(''); setAmount(''); setDate('') }
  const resetFixedForm = () => { setFixedName(''); setFixedCategory(''); setFixedAmount(''); setFixedStartDate(''); setHasEndDate(false); setFixedEndDate('') }

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !category || !amount || !date) return
    setSaving(true)
    await addExpense({ name, category, amount: Number(amount), date })
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
    })
    setFixedSaving(false)
    setModal(null)
    resetFixedForm()
  }

  const isLoading = activeTab === 'expenses' ? (loading || fixedLoading) : fixedLoading

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
        <button className={`sub-tab${activeTab === 'expenses' ? ' active' : ''}`} onClick={() => setActiveTab('expenses')}>
          כל ההוצאות
        </button>
        <button className={`sub-tab${activeTab === 'fixed' ? ' active' : ''}`} onClick={() => setActiveTab('fixed')}>
          הוצאות קבועות
        </button>
      </div>

      {isLoading ? (
        <div className="section-empty">טוען...</div>
      ) : activeTab === 'expenses' ? (
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
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {allExpenses.map(exp => (
                  <tr key={exp.id}>
                    <td>{exp.name}</td>
                    <td>{exp.category}</td>
                    <td className="num-cell">{formatCurrency(exp.amount)}</td>
                    <td>{formatDate(exp.date)}</td>
                    <td className="col-actions">
                      {!exp.id.includes('_') && (
                        <button className="delete-btn" onClick={() => deleteExpense(exp.id)} title="מחק">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
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
                    <td className="col-actions">
                      <button className="delete-btn" onClick={() => deleteFixedExpense(exp.id)} title="מחק">
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
              <input type="text" placeholder="הכנס שם הוצאה" value={name} onChange={e => setName(e.target.value)} required />

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
              <input type="number" placeholder="הכנס סכום" value={amount} onChange={e => setAmount(e.target.value)} required min="0" step="0.01" dir="ltr" />

              <label>תאריך</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required dir="ltr" />

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={saving || !category}>
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
              <input type="number" placeholder="הכנס סכום" value={fixedAmount} onChange={e => setFixedAmount(e.target.value)} required min="0" step="0.01" dir="ltr" />

              <label>תאריך התחלה</label>
              <input type="date" value={fixedStartDate} onChange={e => setFixedStartDate(e.target.value)} required dir="ltr" />

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
                  <input type="date" value={fixedEndDate} onChange={e => setFixedEndDate(e.target.value)} required dir="ltr" min={fixedStartDate || undefined} />
                </>
              )}

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={fixedSaving || !fixedCategory}>
                  {fixedSaving ? 'שומר...' : 'שמור'}
                </button>
                <button type="button" className="btn-cancel" onClick={() => { setModal(null); resetFixedForm() }}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
