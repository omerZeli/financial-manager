import { useState, useEffect } from 'react'
import { CustomSelect } from '../common/CustomSelect'
import { NumberInput } from '../common/NumberInput'
import { ReadOnlySelect } from '../common/ReadOnlySelect'
import DateInput from '../common/DatePicker'
import type { DropdownOption } from '../../hooks/useDropdownOptions'

interface Deposit {
  id: string
  channel_id: string
  amount: number
  date: string
  depositor: string
  salary_id: string | null
}

interface EditDepositFormProps {
  deposit: Deposit
  sortedChannelSelectOptions: { value: string; label: string }[]
  sortedDepositorOptions: DropdownOption[]
  depositorLoading: boolean
  addDepositor: (label: string) => Promise<DropdownOption | null>
  removeDepositor: (id: string) => Promise<boolean>
  pinnedDepositors: string[]
  salaryOptions: { value: string; label: string }[]
  recentSalaries: { id: string; month: string; employer: string }[]
  onSubmit: (id: string, fields: { channel_id: string; amount: number; date: string; depositor: string; salary_id: string | null }) => Promise<void>
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
  salaryOptions: salaryOptionsProp,
  recentSalaries,
  onSubmit,
  onClose,
}: EditDepositFormProps) {
  const [editDepChannel, setEditDepChannel] = useState(deposit.channel_id)
  const [editDepAmount, setEditDepAmount] = useState(String(deposit.amount))
  const [editDepDate, setEditDepDate] = useState(deposit.date)
  const [editDepDepositor, setEditDepDepositor] = useState(deposit.depositor)
  const [editDepSaving, setEditDepSaving] = useState(false)
  const [editDepDeductedFromSalary, setEditDepDeductedFromSalary] = useState(!!deposit.salary_id)
  const [editDepSelectedSalaryId, setEditDepSelectedSalaryId] = useState(deposit.salary_id || '')

  const isDepositorMe = editDepDepositor === 'אני'

  // Auto-select salary when date changes (only if no salary already selected)
  useEffect(() => {
    if (!editDepDeductedFromSalary || !editDepDate) { setEditDepSelectedSalaryId(''); return }
    // If the user already has a salary selected (from the existing deposit), keep it
    if (editDepSelectedSalaryId) return
    const d = new Date(editDepDate + 'T00:00:00')
    const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1)
    const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
    const matching = recentSalaries.filter(s => s.month.slice(0, 7) === prevMonth)
    if (matching.length === 1) setEditDepSelectedSalaryId(matching[0].id)
    else setEditDepSelectedSalaryId('')
  }, [editDepDeductedFromSalary, editDepDate, recentSalaries])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editDepChannel || !editDepAmount || !editDepDate || !editDepDepositor) return
    setEditDepSaving(true)
    await onSubmit(deposit.id, {
      channel_id: editDepChannel,
      amount: Number(editDepAmount),
      date: editDepDate,
      depositor: editDepDepositor,
      salary_id: editDepDeductedFromSalary && editDepSelectedSalaryId ? editDepSelectedSalaryId : null,
    })
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
            onChange={(val) => { setEditDepDepositor(val); setEditDepDeductedFromSalary(false); setEditDepSelectedSalaryId('') }}
            onAddOption={addDepositor}
            onRemoveOption={removeDepositor}
            loading={depositorLoading}
          />

          <label>תאריך</label>
          <DateInput value={editDepDate} onChange={setEditDepDate} required />

          {isDepositorMe && (
            <div className="toggle-row">
              <label className="toggle-label" htmlFor="edit-dep-salary-deduct">נוכה מהמשכורת?</label>
              <button
                type="button"
                id="edit-dep-salary-deduct"
                role="switch"
                aria-checked={editDepDeductedFromSalary}
                className={`toggle-switch${editDepDeductedFromSalary ? ' active' : ''}`}
                onClick={() => { setEditDepDeductedFromSalary(prev => !prev); setEditDepSelectedSalaryId('') }}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          )}

          {editDepDeductedFromSalary && (
            <>
              <label>משכורת</label>
              <ReadOnlySelect
                options={salaryOptionsProp}
                value={editDepSelectedSalaryId}
                placeholder="בחר משכורת"
                onChange={setEditDepSelectedSalaryId}
              />
            </>
          )}

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={editDepSaving || !editDepChannel || !editDepDepositor || (editDepDeductedFromSalary && !editDepSelectedSalaryId)}>
              {editDepSaving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
