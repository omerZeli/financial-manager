import { useState, useMemo } from 'react'
import { AutocompleteInput } from '../common/AutocompleteInput'
import { CustomSelect } from '../common/CustomSelect'
import { NumberInput } from '../common/NumberInput'
import DateInput from '../common/DateInput'
import type { DropdownOption } from '../../hooks/useDropdownOptions'
import type { Expense } from '../../contexts/ExpensesContext'

interface EditExpenseFormProps {
  expense: Expense
  expenses: Expense[]
  sortedCategoryOptions: DropdownOption[]
  categoryLoading: boolean
  addCategory: (label: string) => Promise<DropdownOption | null>
  removeCategory: (id: string) => Promise<boolean>
  onSubmit: (id: string, fields: { name: string; category: string; amount: number; date: string }) => Promise<void>
  onClose: () => void
}

export function EditExpenseForm({
  expense,
  expenses,
  sortedCategoryOptions,
  categoryLoading,
  addCategory,
  removeCategory,
  onSubmit,
  onClose,
}: EditExpenseFormProps) {
  const [editExpName, setEditExpName] = useState(expense.name)
  const [editExpCategory, setEditExpCategory] = useState(expense.category)
  const [editExpAmount, setEditExpAmount] = useState(String(expense.amount))
  const [editExpDate, setEditExpDate] = useState(expense.date)
  const [editExpSaving, setEditExpSaving] = useState(false)

  const expenseNameSuggestions = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const e of expenses) totals[e.name] = (totals[e.name] || 0) + e.amount
    return Object.keys(totals).sort((a, b) => totals[b] - totals[a])
  }, [expenses])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editExpName || !editExpCategory || !editExpAmount || !editExpDate) return
    setEditExpSaving(true)
    await onSubmit(expense.id, { name: editExpName, category: editExpCategory, amount: Number(editExpAmount), date: editExpDate })
    setEditExpSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="סגור">&times;</button>
        <h2>עריכת הוצאה</h2>
        <form onSubmit={handleSubmit}>
          <label>שם הוצאה</label>
          <AutocompleteInput
            suggestions={expenseNameSuggestions}
            value={editExpName}
            onChange={setEditExpName}
            onSelect={(val) => {
              const prev = expenses.find(e => e.name === val)
              if (prev) setEditExpCategory(prev.category)
            }}
            placeholder="הכנס שם הוצאה"
            required
          />

          <label>קטגוריה</label>
          <CustomSelect
            options={sortedCategoryOptions}
            value={editExpCategory}
            placeholder="הכנס קטגוריה"
            onChange={setEditExpCategory}
            onAddOption={addCategory}
            onRemoveOption={removeCategory}
            loading={categoryLoading}
          />

          <label>סכום</label>
          <NumberInput placeholder="הכנס סכום" value={editExpAmount} onChange={setEditExpAmount} required />

          <label>תאריך</label>
          <DateInput value={editExpDate} onChange={setEditExpDate} required />

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={editExpSaving || !editExpCategory}>
              {editExpSaving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
