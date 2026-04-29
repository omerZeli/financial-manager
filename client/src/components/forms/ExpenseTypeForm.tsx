import { useState, useEffect, useMemo } from 'react'
import { CustomSelect } from '../common/CustomSelect'
import { MultiSelect } from '../common/MultiSelect'
import type { DropdownOption } from '../../hooks/useDropdownOptions'
import type { ExpenseType } from '../../contexts/ExpenseTypesContext'

interface ExpenseTypeFormProps {
  sortedExpenseTypeOptions: DropdownOption[]
  etTypeLoading: boolean
  addExpenseTypeOption: (label: string) => Promise<DropdownOption | null>
  removeExpenseTypeOption: (id: string) => Promise<boolean>
  expenseTypeOptions: DropdownOption[]
  expenseTypes: ExpenseType[]
  allCategoryLabels: string[]
  addExpenseType: (typeName: string, categories: string[]) => Promise<void>
  updateExpenseType: (id: string, categories: string[]) => Promise<void>
  deleteExpenseType: (id: string) => Promise<void>
  onClose: () => void
}

export function ExpenseTypeForm({
  sortedExpenseTypeOptions,
  etTypeLoading,
  addExpenseTypeOption,
  removeExpenseTypeOption,
  expenseTypeOptions,
  expenseTypes,
  allCategoryLabels,
  addExpenseType,
  updateExpenseType,
  deleteExpenseType,
  onClose,
}: ExpenseTypeFormProps) {
  const [etTypeName, setEtTypeName] = useState('')
  const [etCategories, setEtCategories] = useState<string[]>([])
  const [etSaving, setEtSaving] = useState(false)

  const existingType = useMemo(() => expenseTypes.find(et => et.type_name === etTypeName), [expenseTypes, etTypeName])

  useEffect(() => {
    if (existingType) {
      setEtCategories(existingType.categories)
    } else {
      setEtCategories([])
    }
  }, [existingType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!etTypeName || etCategories.length === 0) return
    setEtSaving(true)
    if (existingType) {
      await updateExpenseType(existingType.id, etCategories)
    } else {
      await addExpenseType(etTypeName, etCategories)
    }
    setEtSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="סגור">&times;</button>
        <h2>{existingType ? 'עריכת סוג הוצאות' : 'סוג הוצאות חדש'}</h2>
        <form onSubmit={handleSubmit}>
          <label>סוג</label>
          <CustomSelect
            options={sortedExpenseTypeOptions}
            value={etTypeName}
            placeholder="הכנס סוג הוצאות"
            onChange={setEtTypeName}
            onAddOption={addExpenseTypeOption}
            onRemoveOption={async (id) => {
              const opt = expenseTypeOptions.find(o => o.id === id)
              const removed = await removeExpenseTypeOption(id)
              if (removed && opt) {
                const et = expenseTypes.find(e => e.type_name === opt.label)
                if (et) await deleteExpenseType(et.id)
                if (opt.label === etTypeName) setEtTypeName('')
              }
              return removed
            }}
            loading={etTypeLoading}
          />

          <label>קטגוריות</label>
          <MultiSelect
            options={allCategoryLabels}
            value={etCategories}
            placeholder="בחר קטגוריות"
            onChange={setEtCategories}
          />

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={etSaving || !etTypeName || etCategories.length === 0}>
              {etSaving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
