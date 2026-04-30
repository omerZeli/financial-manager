import { useState, useEffect, useMemo } from 'react'
import { AutocompleteInput } from '../common/AutocompleteInput'
import { CustomSelect } from '../common/CustomSelect'
import { NumberInput } from '../common/NumberInput'
import { ReadOnlySelect } from '../common/ReadOnlySelect'
import DateInput from '../common/DatePicker'
import type { DropdownOption } from '../../hooks/useDropdownOptions'
import type { Expense } from '../../contexts/ExpensesContext'

interface ExpenseFormProps {
  expenses: Expense[]
  sortedCategoryOptions: DropdownOption[]
  categoryLoading: boolean
  addCategory: (label: string) => Promise<DropdownOption | null>
  removeCategory: (id: string) => Promise<boolean>
  salaryOptions: { value: string; label: string }[]
  recentSalaries: { id: string; month: string; employer: string }[]
  onSubmit: (data: { name: string; category: string; amount: number; date: string; salary_id: string | null }) => Promise<void>
  onClose: () => void
}

export function ExpenseForm({
  expenses,
  sortedCategoryOptions,
  categoryLoading,
  addCategory,
  removeCategory,
  salaryOptions,
  recentSalaries,
  onSubmit,
  onClose,
}: ExpenseFormProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [deductedFromSalary, setDeductedFromSalary] = useState(false)
  const [selectedSalaryId, setSelectedSalaryId] = useState('')

  const expenseNameSuggestions = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const e of expenses) totals[e.name] = (totals[e.name] || 0) + e.amount
    return Object.keys(totals).sort((a, b) => totals[b] - totals[a])
  }, [expenses])

  // Auto-select salary when date changes
  useEffect(() => {
    if (!deductedFromSalary || !date) { setSelectedSalaryId(''); return }
    const d = new Date(date + 'T00:00:00')
    const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1)
    const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
    const matching = recentSalaries.filter(s => s.month.slice(0, 7) === prevMonth)
    if (matching.length === 1) setSelectedSalaryId(matching[0].id)
    else setSelectedSalaryId('')
  }, [deductedFromSalary, date, recentSalaries])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !category || !amount || !date) return
    setSaving(true)
    await onSubmit({ name, category, amount: Number(amount), date, salary_id: deductedFromSalary && selectedSalaryId ? selectedSalaryId : null })
    setSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="סגור">&times;</button>
        <h2>הוסף הוצאה רגילה</h2>
        <form onSubmit={handleSubmit}>
          <label>שם הוצאה</label>
          <AutocompleteInput
            suggestions={expenseNameSuggestions}
            value={name}
            onChange={setName}
            onSelect={(val) => {
              const prev = expenses.find(e => e.name === val)
              if (prev) setCategory(prev.category)
            }}
            placeholder="הכנס שם הוצאה"
            required
          />

          <label>קטגוריה</label>
          <CustomSelect
            options={sortedCategoryOptions}
            value={category}
            placeholder="הכנס קטגוריה"
            onChange={setCategory}
            onAddOption={addCategory}
            onRemoveOption={removeCategory}
            loading={categoryLoading}
          />

          <label>סכום</label>
          <NumberInput placeholder="הכנס סכום" value={amount} onChange={setAmount} required />

          <label>תאריך</label>
          <DateInput value={date} onChange={setDate} required />

          <div className="toggle-row">
            <label className="toggle-label" htmlFor="exp-salary-deduct">נוכה מהמשכורת?</label>
            <button
              type="button"
              id="exp-salary-deduct"
              role="switch"
              aria-checked={deductedFromSalary}
              className={`toggle-switch${deductedFromSalary ? ' active' : ''}`}
              onClick={() => { setDeductedFromSalary(prev => !prev); setSelectedSalaryId('') }}
            >
              <span className="toggle-knob" />
            </button>
          </div>

          {deductedFromSalary && (
            <>
              <label>משכורת</label>
              <ReadOnlySelect
                options={salaryOptions}
                value={selectedSalaryId}
                placeholder="בחר משכורת"
                onChange={setSelectedSalaryId}
              />
            </>
          )}

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={saving || !category || (deductedFromSalary && !selectedSalaryId)}>
              {saving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
