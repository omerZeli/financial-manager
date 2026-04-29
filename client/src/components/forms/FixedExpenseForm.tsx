import { useState, useEffect } from 'react'
import { CustomSelect } from '../common/CustomSelect'
import { NumberInput } from '../common/NumberInput'
import { ReadOnlySelect } from '../common/ReadOnlySelect'
import DateInput from '../common/DateInput'
import type { DropdownOption } from '../../hooks/useDropdownOptions'

interface FixedExpenseFormProps {
  sortedFixedCategoryOptions: DropdownOption[]
  fixedCategoryLoading: boolean
  addFixedCategory: (label: string) => Promise<DropdownOption | null>
  removeFixedCategory: (id: string) => Promise<boolean>
  employerOptions: { value: string; label: string }[]
  onSubmit: (data: { name: string; category: string; amount: number; start_date: string; end_date: string | null; salary_employer: string | null }) => Promise<void>
  onClose: () => void
}

export function FixedExpenseForm({
  sortedFixedCategoryOptions,
  fixedCategoryLoading,
  addFixedCategory,
  removeFixedCategory,
  employerOptions,
  onSubmit,
  onClose,
}: FixedExpenseFormProps) {
  const [fixedName, setFixedName] = useState('')
  const [fixedCategory, setFixedCategory] = useState('')
  const [fixedAmount, setFixedAmount] = useState('')
  const [fixedStartDate, setFixedStartDate] = useState('')
  const [hasEndDate, setHasEndDate] = useState(false)
  const [fixedEndDate, setFixedEndDate] = useState('')
  const [fixedSaving, setFixedSaving] = useState(false)
  const [fixedDeductedFromSalary, setFixedDeductedFromSalary] = useState(false)
  const [fixedSalaryEmployer, setFixedSalaryEmployer] = useState('')

  // Auto-select employer when there's only one
  useEffect(() => {
    if (!fixedDeductedFromSalary) { setFixedSalaryEmployer(''); return }
    if (employerOptions.length === 1) setFixedSalaryEmployer(employerOptions[0].value)
    else setFixedSalaryEmployer('')
  }, [fixedDeductedFromSalary, employerOptions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fixedName || !fixedCategory || !fixedAmount || !fixedStartDate) return
    setFixedSaving(true)
    await onSubmit({
      name: fixedName,
      category: fixedCategory,
      amount: Number(fixedAmount),
      start_date: fixedStartDate,
      end_date: hasEndDate && fixedEndDate ? fixedEndDate : null,
      salary_employer: fixedDeductedFromSalary && fixedSalaryEmployer ? fixedSalaryEmployer : null,
    })
    setFixedSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="סגור">&times;</button>
        <h2>הוסף הוצאה קבועה</h2>
        <form onSubmit={handleSubmit}>
          <label>שם הוצאה</label>
          <input type="text" placeholder="הכנס שם הוצאה" value={fixedName} onChange={e => setFixedName(e.target.value)} required />

          <label>קטגוריה</label>
          <CustomSelect
            options={sortedFixedCategoryOptions}
            value={fixedCategory}
            placeholder="הכנס קטגוריה"
            onChange={setFixedCategory}
            onAddOption={addFixedCategory}
            onRemoveOption={removeFixedCategory}
            loading={fixedCategoryLoading}
          />

          <label>סכום</label>
          <NumberInput placeholder="הכנס סכום" value={fixedAmount} onChange={setFixedAmount} required />

          <label>תאריך התחלה</label>
          <DateInput value={fixedStartDate} onChange={setFixedStartDate} required />

          <div className="toggle-row">
            <label className="toggle-label" htmlFor="has-end-date">יש תאריך סיום?</label>
            <button
              type="button"
              id="has-end-date"
              role="switch"
              aria-checked={hasEndDate}
              className={`toggle-switch${hasEndDate ? ' active' : ''}`}
              onClick={() => { setHasEndDate(prev => !prev); setFixedEndDate('') }}
            >
              <span className="toggle-knob" />
            </button>
          </div>

          {hasEndDate && (
            <>
              <label>תאריך סיום</label>
              <DateInput value={fixedEndDate} onChange={setFixedEndDate} required min={fixedStartDate || undefined} />
            </>
          )}

          <div className="toggle-row">
            <label className="toggle-label" htmlFor="fixed-salary-deduct">נוכה מהמשכורת?</label>
            <button
              type="button"
              id="fixed-salary-deduct"
              role="switch"
              aria-checked={fixedDeductedFromSalary}
              className={`toggle-switch${fixedDeductedFromSalary ? ' active' : ''}`}
              onClick={() => { setFixedDeductedFromSalary(prev => !prev); setFixedSalaryEmployer('') }}
            >
              <span className="toggle-knob" />
            </button>
          </div>

          {fixedDeductedFromSalary && (
            <>
              <label>מעסיק</label>
              <ReadOnlySelect
                options={employerOptions}
                value={fixedSalaryEmployer}
                placeholder="בחר מעסיק"
                onChange={setFixedSalaryEmployer}
              />
            </>
          )}

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={fixedSaving || !fixedCategory || (fixedDeductedFromSalary && !fixedSalaryEmployer)}>
              {fixedSaving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
