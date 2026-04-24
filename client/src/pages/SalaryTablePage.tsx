import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useSalary } from '../contexts/SalaryContext'
import { NumberInput } from '../components/common/NumberInput'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import './Section.css'

function formatMonth(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
}

function formatCurrency(n: number) {
  return n.toLocaleString('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 })
}

export function SalaryTablePage() {
  const { salaries, loading, fetchSalaries, addSalary, deleteSalary } = useSalary()
  const [showModal, setShowModal] = useState(false)
  const [month, setMonth] = useState('')
  const [bruto, setBruto] = useState('')
  const [neto, setNeto] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  useEffect(() => { fetchSalaries() }, [fetchSalaries])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!month || !bruto || !neto) return
    setSaving(true)
    // Store as first day of the selected month
    await addSalary({ month: month + '-01', bruto: Number(bruto), neto: Number(neto) })
    setSaving(false)
    setShowModal(false)
    setMonth('')
    setBruto('')
    setNeto('')
  }

  return (
    <div className="section-page">
      <div className="section-header">
        <h1>משכורת</h1>
        <div className="section-tabs">
          <NavLink to="/salary" end className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
            טבלה
          </NavLink>
          <NavLink to="/salary/charts" className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
            גרפים
          </NavLink>
        </div>
      </div>

      {loading ? (
        <div className="section-empty">טוען...</div>
      ) : salaries.length === 0 ? (
        <div className="section-empty">אין נתוני משכורת עדיין. לחץ על + כדי להוסיף.</div>
      ) : (
        <div className="section-table-wrap">
          <table className="section-table">
            <thead>
              <tr>
                <th>חודש</th>
                <th>ברוטו</th>
                <th>נטו</th>
                <th className="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {salaries.map(s => (
                <tr key={s.id}>
                  <td>{formatMonth(s.month)}</td>
                  <td className="num-cell">{formatCurrency(s.bruto)}</td>
                  <td className="num-cell">{formatCurrency(s.neto)}</td>
                  <td className="col-actions">
                    <button className="delete-btn" onClick={() => setPendingDeleteId(s.id)} title="מחק">
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

      <button className="section-fab" onClick={() => setShowModal(true)} title="הוסף משכורת">+</button>

      {pendingDeleteId && (
        <ConfirmDialog
          message="האם אתה בטוח שברצונך למחוק?"
          itemName={(() => {
            const s = salaries.find(s => s.id === pendingDeleteId)
            return s ? `${formatMonth(s.month)} - ברוטו ${formatCurrency(s.bruto)}, נטו ${formatCurrency(s.neto)}` : undefined
          })()}
          onConfirm={() => { deleteSalary(pendingDeleteId); setPendingDeleteId(null) }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)} title="סגור">&times;</button>
            <h2>הוסף משכורת</h2>
            <form onSubmit={handleSubmit}>
              <label>חודש</label>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)} required dir="ltr" />

              <label>ברוטו</label>
              <NumberInput placeholder="הכנס ברוטו" value={bruto} onChange={setBruto} required />

              <label>נטו</label>
              <NumberInput placeholder="הכנס נטו" value={neto} onChange={setNeto} required />

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
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
