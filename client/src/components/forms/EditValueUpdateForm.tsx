import { useState } from 'react'
import { NumberInput } from '../common/NumberInput'
import DateInput from '../common/DateInput'

interface ValueUpdate {
  id: string
  value: number
  date: string
}

interface EditValueUpdateFormProps {
  valueUpdate: ValueUpdate
  onSubmit: (id: string, fields: { value: number; date: string }) => Promise<void>
  onClose: () => void
}

export function EditValueUpdateForm({
  valueUpdate,
  onSubmit,
  onClose,
}: EditValueUpdateFormProps) {
  const [editValValue, setEditValValue] = useState(String(valueUpdate.value))
  const [editValDate, setEditValDate] = useState(valueUpdate.date)
  const [editValSaving, setEditValSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editValValue || !editValDate) return
    setEditValSaving(true)
    await onSubmit(valueUpdate.id, { value: Number(editValValue), date: editValDate })
    setEditValSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="סגור">&times;</button>
        <h2>עריכת עדכון שווי</h2>
        <form onSubmit={handleSubmit}>
          <label>שווי</label>
          <NumberInput placeholder="הכנס שווי" value={editValValue} onChange={setEditValValue} required />

          <label>תאריך</label>
          <DateInput value={editValDate} onChange={setEditValDate} required />

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={editValSaving}>
              {editValSaving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
