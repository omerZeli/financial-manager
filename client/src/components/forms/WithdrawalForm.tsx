import { useState } from 'react'
import { NumberInput } from '../common/NumberInput'
import { ReadOnlySelect } from '../common/ReadOnlySelect'
import DateInput from '../common/DatePicker'

interface WithdrawalFormProps {
  sortedChannelSelectOptions: { value: string; label: string }[]
  onSubmit: (data: { channel_id: string; amount: number; date: string }) => Promise<void>
  onClose: () => void
}

export function WithdrawalForm({
  sortedChannelSelectOptions,
  onSubmit,
  onClose,
}: WithdrawalFormProps) {
  const [wdChannel, setWdChannel] = useState('')
  const [wdAmount, setWdAmount] = useState('')
  const [wdDate, setWdDate] = useState('')
  const [wdSaving, setWdSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wdChannel || !wdAmount || !wdDate) return
    setWdSaving(true)
    await onSubmit({ channel_id: wdChannel, amount: Number(wdAmount), date: wdDate })
    setWdSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="סגור">&times;</button>
        <h2>משיכה מאפיק</h2>
        <form onSubmit={handleSubmit}>
          <label>אפיק</label>
          <ReadOnlySelect
            options={sortedChannelSelectOptions}
            value={wdChannel}
            placeholder="בחר אפיק"
            onChange={setWdChannel}
          />

          <label>סכום משיכה</label>
          <NumberInput placeholder="הכנס סכום" value={wdAmount} onChange={setWdAmount} required />

          <label>תאריך</label>
          <DateInput value={wdDate} onChange={setWdDate} required />

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={wdSaving || !wdChannel}>
              {wdSaving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
