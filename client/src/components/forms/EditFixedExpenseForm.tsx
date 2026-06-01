import { useState } from 'react'
import DateInput from '../common/DatePicker'
import { NumberInput } from '../common/NumberInput'

interface EditFixedExpenseFormProps {
  initialEndDate: string
  initialAmount: number
  onSubmit: (fields: { end_date: string | null; amount: number }) => Promise<void>
  onClose: () => void
}

export function EditFixedExpenseForm({ initialEndDate, initialAmount, onSubmit, onClose }: EditFixedExpenseFormProps) {
  const [editFixedEndDate, setEditFixedEndDate] = useState(initialEndDate)
  const [editFixedAmount, setEditFixedAmount] = useState(String(initialAmount))
  const [editFixedSaving, setEditFixedSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditFixedSaving(true)
    await onSubmit({
      end_date: editFixedEndDate || null,
      amount: Number(editFixedAmount),
    })
    setEditFixedSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="סגור">&times;</button>
        <h2>עריכת הוצאה קבועה</h2>
        <form onSubmit={handleSubmit}>
          <label>סכום</label>
          <NumberInput value={editFixedAmount} onChange={setEditFixedAmount} placeholder="הכנס סכום" required />

          <label>תאריך סיום</label>
          <DateInput value={editFixedEndDate} onChange={setEditFixedEndDate} />

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={editFixedSaving || !editFixedAmount}>
              {editFixedSaving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
