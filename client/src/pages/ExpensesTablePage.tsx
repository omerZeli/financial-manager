import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useExpenses } from '../contexts/ExpensesContext'
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

export function ExpensesTablePage() {
  const { expenses, loading, fetchExpenses, addExpense, deleteExpense } = useExpenses()
  const { options: categoryOptions, loading: categoryLoading, addOption: addCategory, removeOption: removeCategory } = useDropdownOptions('expense_category')
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !category || !amount || !date) return
    setSaving(true)
    await addExpense({ name, category, amount: Number(amount), date })
    setSaving(false)
    setShowModal(false)
    setName('')
    setCategory('')
    setAmount('')
    setDate('')
  }

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

      {loading ? (
        <div className="section-empty">טוען...</div>
      ) : expenses.length === 0 ? (
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
              {expenses.map(exp => (
                <tr key={exp.id}>
                  <td>{exp.name}</td>
                  <td>{exp.category}</td>
                  <td className="num-cell">{formatCurrency(exp.amount)}</td>
                  <td>{formatDate(exp.date)}</td>
                  <td className="col-actions">
                    <button className="delete-btn" onClick={() => deleteExpense(exp.id)} title="מחק">
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
      )}

      <button className="section-fab" onClick={() => setShowModal(true)} title="הוסף הוצאה">+</button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>הוסף הוצאה</h2>
            <form onSubmit={handleSubmit}>
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
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
