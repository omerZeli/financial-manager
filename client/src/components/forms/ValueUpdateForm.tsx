import { useState } from 'react'
import { CustomSelect } from '../common/CustomSelect'
import { NumberInput } from '../common/NumberInput'
import DateInput from '../common/DatePicker'
import type { DropdownOption } from '../../hooks/useDropdownOptions'

interface ValueUpdateFormProps {
  channelId: string
  channelLabel: string
  initialValue: string
  initialPath: string
  initialDate: string
  sortedPathOptions: DropdownOption[]
  pathLoading: boolean
  addPath: (label: string) => Promise<DropdownOption | null>
  removePath: (id: string) => Promise<boolean>
  onSubmit: (data: { channel_id: string; value: number; date: string; investment_path?: string }) => Promise<void>
  onClose: () => void
}

export function ValueUpdateForm({
  channelId,
  channelLabel,
  initialValue,
  initialPath,
  initialDate,
  sortedPathOptions,
  pathLoading,
  addPath,
  removePath,
  onSubmit,
  onClose,
}: ValueUpdateFormProps) {
  const [valValue, setValValue] = useState(initialValue)
  const [valPath, setValPath] = useState(initialPath)
  const [valDate, setValDate] = useState(initialDate)
  const [valSaving, setValSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valValue || !valPath || !valDate) return
    setValSaving(true)
    await onSubmit({ channel_id: channelId, value: Number(valValue), date: valDate, investment_path: valPath })
    setValSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="סגור">&times;</button>
        <h2>עדכון שווי</h2>
        <div className="modal-subtitle">{channelLabel}</div>
        <form onSubmit={handleSubmit}>
          <label>שווי נוכחי</label>
          <NumberInput placeholder="הכנס שווי" value={valValue} onChange={setValValue} required />

          <label>מסלול השקעה</label>
          <CustomSelect
            options={sortedPathOptions}
            value={valPath}
            placeholder="הכנס מסלול השקעה"
            onChange={setValPath}
            onAddOption={addPath}
            onRemoveOption={removePath}
            loading={pathLoading}
          />

          <label>תאריך עדכון</label>
          <DateInput value={valDate} onChange={setValDate} required />

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={valSaving}>
              {valSaving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
