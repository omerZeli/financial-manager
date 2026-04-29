import { useState } from 'react'
import { CustomSelect } from '../common/CustomSelect'
import { NumberInput } from '../common/NumberInput'
import DateInput from '../common/DateInput'
import type { DropdownOption } from '../../hooks/useDropdownOptions'
import type { Payback } from '../../contexts/PaybacksContext'

interface EditPaybackFormProps {
  payback: Payback
  sortedCategoryOptions: DropdownOption[]
  categoryLoading: boolean
  addCategory: (label: string) => Promise<DropdownOption | null>
  removeCategory: (id: string) => Promise<boolean>
  sortedPersonOptions: DropdownOption[]
  personLoading: boolean
  addPerson: (label: string) => Promise<DropdownOption | null>
  removePerson: (id: string) => Promise<boolean>
  onSubmit: (id: string, fields: Record<string, unknown>) => Promise<void>
  onClose: () => void
}

export function EditPaybackForm({
  payback,
  sortedCategoryOptions,
  categoryLoading,
  addCategory,
  removeCategory,
  sortedPersonOptions,
  personLoading,
  addPerson,
  removePerson,
  onSubmit,
  onClose,
}: EditPaybackFormProps) {
  const [editPbAmount, setEditPbAmount] = useState(String(payback.amount))
  const [editPbDate, setEditPbDate] = useState(payback.date)
  const [editPbPerson, setEditPbPerson] = useState(payback.person)
  const [editPbName, setEditPbName] = useState(payback.name || '')
  const [editPbCategory, setEditPbCategory] = useState(payback.category || '')
  const [editPbSaving, setEditPbSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPbAmount || !editPbDate || !editPbPerson) return
    setEditPbSaving(true)
    const fields: Record<string, unknown> = { amount: Number(editPbAmount), date: editPbDate, person: editPbPerson }
    if (payback.direction === 'by_me') {
      fields.name = editPbName
      fields.category = editPbCategory
    }
    await onSubmit(payback.id, fields)
    setEditPbSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="סגור">&times;</button>
        <h2>עריכת החזר</h2>
        <form onSubmit={handleSubmit}>
          {payback.direction === 'by_me' && (
            <>
              <label>שם הוצאה</label>
              <input type="text" placeholder="הכנס שם הוצאה" value={editPbName} onChange={e => setEditPbName(e.target.value)} required />

              <label>קטגוריה</label>
              <CustomSelect
                options={sortedCategoryOptions}
                value={editPbCategory}
                placeholder="הכנס קטגוריה"
                onChange={setEditPbCategory}
                onAddOption={addCategory}
                onRemoveOption={removeCategory}
                loading={categoryLoading}
              />
            </>
          )}

          <label>סכום</label>
          <NumberInput placeholder="הכנס סכום" value={editPbAmount} onChange={setEditPbAmount} required />

          <label>תאריך</label>
          <DateInput value={editPbDate} onChange={setEditPbDate} required />

          <label>
            {payback.direction === 'by_me' ? 'למי שילמתי' : 'מי שילם לי'}
          </label>
          <CustomSelect
            options={sortedPersonOptions}
            value={editPbPerson}
            placeholder="הכנס שם"
            onChange={setEditPbPerson}
            onAddOption={addPerson}
            onRemoveOption={removePerson}
            loading={personLoading}
          />

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={editPbSaving || !editPbPerson || (payback.direction === 'by_me' && !editPbCategory)}>
              {editPbSaving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
