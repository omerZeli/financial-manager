import { useState, useMemo } from 'react'
import { AutocompleteInput } from '../common/AutocompleteInput'
import { CustomSelect } from '../common/CustomSelect'
import { NumberInput } from '../common/NumberInput'
import { ReadOnlySelect } from '../common/ReadOnlySelect'
import DateInput from '../common/DateInput'
import type { DropdownOption } from '../../hooks/useDropdownOptions'
import type { Expense } from '../../contexts/ExpensesContext'
import type { FixedExpense } from '../../contexts/FixedExpensesContext'

interface PaybackFormProps {
  expenses: Expense[]
  fixedExpenses: FixedExpense[]
  sortedCategoryOptions: DropdownOption[]
  categoryLoading: boolean
  addCategory: (label: string) => Promise<DropdownOption | null>
  removeCategory: (id: string) => Promise<boolean>
  sortedPersonOptions: DropdownOption[]
  personLoading: boolean
  addPerson: (label: string) => Promise<DropdownOption | null>
  removePerson: (id: string) => Promise<boolean>
  paybackExpenseOptions: { value: string; label: string }[]
  toMeByExpense: Record<string, number>
  toMeByFixed: Record<string, { total: number; items: { amount: number; date: string }[] }>
  onSubmit: (data: {
    direction: 'by_me' | 'to_me'
    name: string | null
    category: string | null
    amount: number
    date: string
    person: string
    expense_id: string | null
    fixed_expense_id: string | null
  }) => Promise<void>
  onClose: () => void
}

export function PaybackForm({
  expenses,
  fixedExpenses,
  sortedCategoryOptions,
  categoryLoading,
  addCategory,
  removeCategory,
  sortedPersonOptions,
  personLoading,
  addPerson,
  removePerson,
  paybackExpenseOptions,
  toMeByExpense,
  toMeByFixed,
  onSubmit,
  onClose,
}: PaybackFormProps) {
  const [pbDirection, setPbDirection] = useState<'by_me' | 'to_me'>('to_me')
  const [pbName, setPbName] = useState('')
  const [pbCategory, setPbCategory] = useState('')
  const [pbAmount, setPbAmount] = useState('')
  const [pbDate, setPbDate] = useState('')
  const [pbPerson, setPbPerson] = useState('')
  const [pbExpenseId, setPbExpenseId] = useState('')
  const [pbFixedExpenseId, setPbFixedExpenseId] = useState('')
  const [pbSaving, setPbSaving] = useState(false)

  const expenseNameSuggestions = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const e of expenses) totals[e.name] = (totals[e.name] || 0) + e.amount
    return Object.keys(totals).sort((a, b) => totals[b] - totals[a])
  }, [expenses])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pbAmount || !pbDate || !pbPerson) return
    if (pbDirection === 'by_me' && (!pbName || !pbCategory)) return
    if (pbDirection === 'to_me' && !pbExpenseId && !pbFixedExpenseId) return
    setPbSaving(true)
    await onSubmit({
      direction: pbDirection,
      name: pbDirection === 'by_me' ? pbName : null,
      category: pbDirection === 'by_me' ? pbCategory : null,
      amount: Number(pbAmount),
      date: pbDate,
      person: pbPerson,
      expense_id: pbDirection === 'to_me' && pbExpenseId ? pbExpenseId : null,
      fixed_expense_id: pbDirection === 'to_me' && pbFixedExpenseId ? pbFixedExpenseId : null,
    })
    setPbSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="סגור">&times;</button>
        <h2>הוסף החזר</h2>
        <form onSubmit={handleSubmit}>
          {/* Direction toggle */}
          <div className="direction-toggle">
            <button
              type="button"
              className={`direction-btn${pbDirection === 'to_me' ? ' active' : ''}`}
              onClick={() => { setPbDirection('to_me'); setPbName(''); setPbCategory('') }}
            >
              שילמו לי
            </button>
            <button
              type="button"
              className={`direction-btn${pbDirection === 'by_me' ? ' active' : ''}`}
              onClick={() => { setPbDirection('by_me'); setPbExpenseId(''); setPbFixedExpenseId('') }}
            >
              שילמתי לאחר
            </button>
          </div>

          {pbDirection === 'by_me' ? (
            <>
              <label>שם הוצאה</label>
              <AutocompleteInput
                suggestions={expenseNameSuggestions}
                value={pbName}
                onChange={setPbName}
                onSelect={(val) => {
                  const prev = expenses.find(e => e.name === val)
                  if (prev) setPbCategory(prev.category)
                }}
                placeholder="הכנס שם הוצאה"
                required
              />

              <label>קטגוריה</label>
              <CustomSelect
                options={sortedCategoryOptions}
                value={pbCategory}
                placeholder="הכנס קטגוריה"
                onChange={setPbCategory}
                onAddOption={addCategory}
                onRemoveOption={removeCategory}
                loading={categoryLoading}
              />
            </>
          ) : (
            <>
              <label>הוצאה מקורית</label>
              <ReadOnlySelect
                options={paybackExpenseOptions}
                value={pbExpenseId ? `expense:${pbExpenseId}` : pbFixedExpenseId ? `fixed:${pbFixedExpenseId}` : ''}
                placeholder="חפש הוצאה"
                onChange={(val) => {
                  if (val.startsWith('expense:')) {
                    const id = val.slice(8)
                    setPbExpenseId(id)
                    setPbFixedExpenseId('')
                    const exp = expenses.find(e => e.id === id)
                    if (exp) {
                      setPbDate(exp.date)
                      const returned = toMeByExpense[id] || 0
                      setPbAmount(String(exp.amount - returned))
                    }
                  } else if (val.startsWith('fixed:')) {
                    const id = val.slice(6)
                    setPbFixedExpenseId(id)
                    setPbExpenseId('')
                    const fe = fixedExpenses.find(e => e.id === id)
                    if (fe) {
                      const returned = toMeByFixed[id]?.total || 0
                      setPbAmount(String(fe.amount - returned))
                    }
                  }
                }}
              />
            </>
          )}

          <label>
            {pbDirection === 'by_me' ? 'למי שילמתי' : 'מי שילם לי'}
          </label>
          <CustomSelect
            options={sortedPersonOptions}
            value={pbPerson}
            placeholder="הכנס שם"
            onChange={setPbPerson}
            onAddOption={addPerson}
            onRemoveOption={removePerson}
            loading={personLoading}
          />

          <label>סכום</label>
          <NumberInput placeholder="הכנס סכום" value={pbAmount} onChange={setPbAmount} required />

          <label>תאריך</label>
          <DateInput value={pbDate} onChange={setPbDate} required />

          <div className="modal-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={pbSaving || !pbPerson || (pbDirection === 'by_me' ? !pbCategory : (!pbExpenseId && !pbFixedExpenseId))}
            >
              {pbSaving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
