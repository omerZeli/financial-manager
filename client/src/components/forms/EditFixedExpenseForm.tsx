import { useState } from 'react'
import DateInput from '../common/DateInput'

interface EditFixedExpenseFormProps {
  initialEndDate: string
  onSubmit: (endDate: string | null) => Promise<void>
  onClose: () => void
}

export function EditFixedExpenseForm({ initialEndDate, onSubmit, onClose }: EditFixedExpenseFormProps) {
  const [editFixedEndDate, setEditFixedEndDate] = useState(initialEndDate)
  const [editFixedSaving, setEditFixedSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditFixedSaving(true)
    await onSubmit(editFixedEndDate || null)
    setEditFixedSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="סגור">&times;</button>
        <h2>עריכת הוצאה קבועה</h2>
        <form onSubmit={handleSubmit}>
          <label>תאריך סיום</label>
          <DateInput value={editFixedEndDate} onChange={setEditFixedEndDate} />

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={editFixedSaving}>
              {editFixedSaving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
