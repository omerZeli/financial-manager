import { useState } from 'react'
import { CustomSelect } from '../common/CustomSelect'
import { NumberInput } from '../common/NumberInput'
import { ReadOnlySelect } from '../common/ReadOnlySelect'
import DateInput from '../common/DateInput'
import type { DropdownOption } from '../../hooks/useDropdownOptions'

interface Deposit {
  id: string
  channel_id: string
  amount: number
  date: string
  depositor: string
}

interface EditDepositFormProps {
  deposit: Deposit
  sortedChannelSelectOptions: { value: string; label: string }[]
  sortedDepositorOptions: DropdownOption[]
  depositorLoading: boolean
  addDepositor: (label: string) => Promise<DropdownOption | null>
  removeDepositor: (id: string) => Promise<boolean>
  pinnedDepositors: string[]
  onSubmit: (id: string, fields: { channel_id: string; amount: number; date: string; depositor: string }) => Promise<void>
  onClose: () => void
}

export function EditDepositForm({
  deposit,
  sortedChannelSelectOptions,
  sortedDepositorOptions,
  depositorLoading,
  addDepositor,
  removeDepositor,
  pinnedDepositors,
  onSubmit,
  onClose,
}: EditDepositFormProps) {
  const [editDepChannel, setEditDepChannel] = useState(deposit.channel_id)
  const [editDepAmount, setEditDepAmount] = useState(String(deposit.amount))
  const [editDepDate, setEditDepDate] = useState(deposit.date)
  const [editDepDepositor, setEditDepDepositor] = useState(deposit.depositor)
  const [editDepSaving, setEditDepSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editDepChannel || !editDepAmount || !editDepDate || !editDepDepositor) return
    setEditDepSaving(true)
    await onSubmit(deposit.id, { channel_id: editDepChannel, amount: Number(editDepAmount), date: editDepDate, depositor: editDepDepositor })
    setEditDepSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="סגור">&times;</button>
        <h2>עריכת הפקדה</h2>
        <form onSubmit={handleSubmit}>
          <label>אפיק</label>
          <ReadOnlySelect
            options={sortedChannelSelectOptions}
            value={editDepChannel}
            placeholder="בחר אפיק"
            onChange={setEditDepChannel}
          />

          <label>סכום</label>
          <NumberInput placeholder="הכנס סכום" value={editDepAmount} onChange={setEditDepAmount} required />

          <label>מי הפקיד</label>
          <CustomSelect
            options={sortedDepositorOptions}
            pinnedOptions={pinnedDepositors}
            value={editDepDepositor}
            placeholder="הכנס מפקיד"
            onChange={setEditDepDepositor}
            onAddOption={addDepositor}
            onRemoveOption={removeDepositor}
            loading={depositorLoading}
          />

          <label>תאריך</label>
          <DateInput value={editDepDate} onChange={setEditDepDate} required />

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={editDepSaving || !editDepChannel || !editDepDepositor}>
              {editDepSaving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
