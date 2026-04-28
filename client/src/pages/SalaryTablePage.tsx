import { useEffect, useState, useCallback, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useSalary } from '../contexts/SalaryContext'
import { NumberInput } from '../components/common/NumberInput'
import { CustomSelect } from '../components/common/CustomSelect'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { SortableTh, FilterPopover } from '../components/common/TableControls'
import { useTableControls, type ColumnDef } from '../hooks/useTableControls'
import { useDropdownOptions } from '../hooks/useDropdownOptions'
import './Section.css'

function formatMonth(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
}

function formatCurrency(n: number) {
  return n.toLocaleString('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 })
}

const salaryColumns: ColumnDef[] = [
  { key: 'month', type: 'date', label: 'חודש' },
  { key: 'employer', type: 'string', label: 'מעסיק' },
  { key: 'bruto', type: 'number', label: 'ברוטו' },
  { key: 'neto', type: 'number', label: 'נטו' },
]

export function SalaryTablePage() {
  const { salaries, loading, fetchSalaries, addSalary, updateSalary, deleteSalary } = useSalary()
  const { options: employerOptions, loading: employerLoading, addOption: addEmployer, removeOption: removeEmployer } = useDropdownOptions('employer')

  // Sort employer options by total neto salary
  const sortedEmployerOptions = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const s of salaries) totals[s.employer] = (totals[s.employer] || 0) + s.neto
    return [...employerOptions].sort((a, b) => (totals[b.label] || 0) - (totals[a.label] || 0))
  }, [employerOptions, salaries])

  const getSalaryValue = useCallback((item: typeof salaries[0], key: string) => {
    if (key === 'month') return item.month
    if (key === 'employer') return item.employer
    if (key === 'bruto') return item.bruto
    if (key === 'neto') return item.neto
    return null
  }, [])

  const table = useTableControls(salaries, salaryColumns, 'month', 'desc', getSalaryValue)
  const [showModal, setShowModal] = useState(false)
  const [month, setMonth] = useState('')
  const [employer, setEmployer] = useState('')
  const [bruto, setBruto] = useState('')
  const [neto, setNeto] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // Edit salary state
  const [editingSalary, setEditingSalary] = useState<string | null>(null)
  const [editMonth, setEditMonth] = useState('')
  const [editEmployer, setEditEmployer] = useState('')
  const [editBruto, setEditBruto] = useState('')
  const [editNeto, setEditNeto] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => { fetchSalaries() }, [fetchSalaries])

  // Auto-default employer when there's exactly one option
  useEffect(() => {
    if (!employer && employerOptions.length === 1) {
      setEmployer(employerOptions[0].label)
    }
  }, [employerOptions, employer])

  const openEditSalary = (id: string) => {
    const s = salaries.find(s => s.id === id)
    if (!s) return
    setEditingSalary(id)
    setEditMonth(s.month.slice(0, 7))
    setEditEmployer(s.employer)
    setEditBruto(String(s.bruto))
    setEditNeto(String(s.neto))
  }

  const resetEditSalary = () => {
    setEditingSalary(null)
    setEditMonth('')
    setEditEmployer('')
    setEditBruto('')
    setEditNeto('')
  }

  const handleEditSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSalary || !editMonth || !editEmployer || !editBruto || !editNeto) return
    setEditSaving(true)
    await updateSalary(editingSalary, { month: editMonth + '-01', employer: editEmployer, bruto: Number(editBruto), neto: Number(editNeto) })
    setEditSaving(false)
    resetEditSalary()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!month || !employer || !bruto || !neto) return
    setSaving(true)
    await addSalary({ month: month + '-01', employer, bruto: Number(bruto), neto: Number(neto) })
    setSaving(false)
    setShowModal(false)
    setMonth('')
    setEmployer(employerOptions.length === 1 ? employerOptions[0].label : '')
    setBruto('')
    setNeto('')
  }

  return (
    <div className="section-page">
      <div className="section-header">
        <h1>משכורת</h1>
        <div className="section-header-actions">
          {salaries.length > 0 && (
            <FilterPopover columns={salaryColumns} filters={table.filters} stringOptions={table.stringOptions} onStringFilter={table.setStringFilter} onNumberFilter={table.setNumberFilter} onDateFilter={table.setDateFilter} onClear={table.clearFilters} hasActive={table.hasActiveFilters} />
          )}
          <div className="section-tabs">
            <NavLink to="/salary" end className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
              טבלה
            </NavLink>
            <NavLink to="/salary/charts" className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
              גרפים
            </NavLink>
          </div>
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
                  <SortableTh label="חודש" colKey="month" sortKey={table.sortKey} sortDir={table.sortDir} onSort={table.toggleSort} />
                  <SortableTh label="מעסיק" colKey="employer" sortKey={table.sortKey} sortDir={table.sortDir} onSort={table.toggleSort} />
                  <SortableTh label="ברוטו" colKey="bruto" sortKey={table.sortKey} sortDir={table.sortDir} onSort={table.toggleSort} />
                  <SortableTh label="נטו" colKey="neto" sortKey={table.sortKey} sortDir={table.sortDir} onSort={table.toggleSort} />
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {table.processed.map(s => (
                  <tr key={s.id}>
                    <td>{formatMonth(s.month)}</td>
                    <td>{s.employer}</td>
                    <td className="num-cell">{formatCurrency(s.bruto)}</td>
                    <td className="num-cell">{formatCurrency(s.neto)}</td>
                    <td className="col-actions actions-group">
                      <button className="edit-btn" onClick={() => openEditSalary(s.id)} title="ערוך">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
                        </svg>
                      </button>
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
            return s ? `${formatMonth(s.month)} - ${s.employer} - ברוטו ${formatCurrency(s.bruto)}, נטו ${formatCurrency(s.neto)}` : undefined
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

              <label>מעסיק</label>
              <CustomSelect
                options={sortedEmployerOptions}
                value={employer}
                placeholder="בחר מעסיק"
                onChange={setEmployer}
                onAddOption={addEmployer}
                onRemoveOption={removeEmployer}
                loading={employerLoading}
              />

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

      {/* Edit salary modal */}
      {editingSalary && (
        <div className="modal-overlay" onClick={resetEditSalary}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={resetEditSalary} title="סגור">&times;</button>
            <h2>עריכת משכורת</h2>
            <form onSubmit={handleEditSalarySubmit}>
              <label>חודש</label>
              <input type="month" value={editMonth} onChange={e => setEditMonth(e.target.value)} required dir="ltr" />

              <label>מעסיק</label>
              <CustomSelect
                options={sortedEmployerOptions}
                value={editEmployer}
                placeholder="בחר מעסיק"
                onChange={setEditEmployer}
                onAddOption={addEmployer}
                onRemoveOption={removeEmployer}
                loading={employerLoading}
              />

              <label>ברוטו</label>
              <NumberInput placeholder="הכנס ברוטו" value={editBruto} onChange={setEditBruto} required />

              <label>נטו</label>
              <NumberInput placeholder="הכנס נטו" value={editNeto} onChange={setEditNeto} required />

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={editSaving}>
                  {editSaving ? 'שומר...' : 'שמור'}
                </button>
                <button type="button" className="btn-cancel" onClick={resetEditSalary}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
