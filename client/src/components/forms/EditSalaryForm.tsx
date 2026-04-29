import { useState } from 'react'
import { CustomSelect } from '../common/CustomSelect'
import { NumberInput } from '../common/NumberInput'
import type { DropdownOption } from '../../hooks/useDropdownOptions'

interface Salary {
  id: string
  month: string
  employer: string
  bruto: number
  neto: number
}

interface EditSalaryFormProps {
  salary: Salary
  sortedEmployerOptions: DropdownOption[]
  employerLoading: boolean
  addEmployer: (label: string) => Promise<DropdownOption | null>
  removeEmployer: (id: string) => Promise<boolean>
  onSubmit: (id: string, fields: { month: string; employer: string; bruto: number; neto: number }) => Promise<void>
  onClose: () => void
}

export function EditSalaryForm({
  salary,
  sortedEmployerOptions,
  employerLoading,
  addEmployer,
  removeEmployer,
  onSubmit,
  onClose,
}: EditSalaryFormProps) {
  const [editMonth, setEditMonth] = useState(salary.month.slice(0, 7))
  const [editEmployer, setEditEmployer] = useState(salary.employer)
  const [editBruto, setEditBruto] = useState(String(salary.bruto))
  const [editNeto, setEditNeto] = useState(String(salary.neto))
  const [editSaving, setEditSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editMonth || !editEmployer || !editBruto || !editNeto) return
    setEditSaving(true)
    await onSubmit(salary.id, { month: editMonth + '-01', employer: editEmployer, bruto: Number(editBruto), neto: Number(editNeto) })
    setEditSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="סגור">&times;</button>
        <h2>עריכת משכורת</h2>
        <form onSubmit={handleSubmit}>
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
            <button type="button" className="btn-cancel" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
