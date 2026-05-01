import { useState, useEffect } from 'react'
import { CustomSelect } from '../common/CustomSelect'
import { NumberInput } from '../common/NumberInput'
import { ReadOnlySelect } from '../common/ReadOnlySelect'
import DateInput from '../common/DatePicker'
import type { DropdownOption } from '../../hooks/useDropdownOptions'

interface DepositFormProps {
  sortedChannelSelectOptions: { value: string; label: string }[]
  sortedDepositorOptions: DropdownOption[]
  depositorLoading: boolean
  addDepositor: (label: string) => Promise<DropdownOption | null>
  removeDepositor: (id: string) => Promise<boolean>
  pinnedDepositors: string[]
  salaryOptions: { value: string; label: string }[]
  recentSalaries: { id: string; month: string; employer: string }[]
  onSubmit: (data: { channel_id: string; amount: number; date: string; depositor: string; salary_id: string | null }) => Promise<void>
  onClose: () => void
}

export function DepositForm({
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
}: DepositFormProps) {
  const [depChannel, setDepChannel] = useState('')
  const [depAmount, setDepAmount] = useState('')
  const [depDate, setDepDate] = useState('')
  const [depDepositor, setDepDepositor] = useState('')
  const [depSaving, setDepSaving] = useState(false)
  const [depDeductedFromSalary, setDepDeductedFromSalary] = useState(false)
  const [depSelectedSalaryId, setDepSelectedSalaryId] = useState('')

  const isDepositorMe = depDepositor === 'אני'

  // Auto-select salary when date changes
  useEffect(() => {
    if (!depDeductedFromSalary || !depDate) { setDepSelectedSalaryId(''); return }
    const d = new Date(depDate + 'T00:00:00')
    const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1)
    const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
    const matching = recentSalaries.filter(s => s.month.slice(0, 7) === prevMonth)
    if (matching.length === 1) setDepSelectedSalaryId(matching[0].id)
    else setDepSelectedSalaryId('')
  }, [depDeductedFromSalary, depDate, recentSalaries])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!depChannel || !depAmount || !depDate || !depDepositor) return
    setDepSaving(true)
    await onSubmit({
      channel_id: depChannel,
      amount: Number(depAmount),
      date: depDate,
      depositor: depDepositor,
      salary_id: depDeductedFromSalary && depSelectedSalaryId ? depSelectedSalaryId : null,
    })
    setDepSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="סגור">&times;</button>
        <h2>הפקדה חדשה</h2>
        <form onSubmit={handleSubmit}>
          <label>אפיק</label>
          <ReadOnlySelect
            options={sortedChannelSelectOptions}
            value={depChannel}
            placeholder="בחר אפיק"
            onChange={setDepChannel}
          />

          <label>סכום הפקדה</label>
          <NumberInput placeholder="הכנס סכום" value={depAmount} onChange={setDepAmount} required />

          <label>מי הפקיד</label>
          <CustomSelect
            options={sortedDepositorOptions}
            pinnedOptions={pinnedDepositors}
            value={depDepositor}
            placeholder="הכנס מפקיד"
            onChange={(val) => { setDepDepositor(val); setDepDeductedFromSalary(false); setDepSelectedSalaryId('') }}
            onAddOption={addDepositor}
            onRemoveOption={removeDepositor}
            loading={depositorLoading}
          />

          <label>תאריך</label>
          <DateInput value={depDate} onChange={setDepDate} required />

          {isDepositorMe && (
            <div className="toggle-row">
              <label className="toggle-label" htmlFor="dep-salary-deduct">נוכה מהמשכורת?</label>
              <button
                type="button"
                id="dep-salary-deduct"
                role="switch"
                aria-checked={depDeductedFromSalary}
                className={`toggle-switch${depDeductedFromSalary ? ' active' : ''}`}
                onClick={() => { setDepDeductedFromSalary(prev => !prev); setDepSelectedSalaryId('') }}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          )}

          {depDeductedFromSalary && (
            <>
              <label>משכורת</label>
              <ReadOnlySelect
                options={salaryOptionsProp}
                value={depSelectedSalaryId}
                placeholder="בחר משכורת"
                onChange={setDepSelectedSalaryId}
              />
            </>
          )}

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={depSaving || !depChannel || !depDepositor || (depDeductedFromSalary && !depSelectedSalaryId)}>
              {depSaving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
