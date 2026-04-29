import { useState, useEffect } from 'react'
import { CustomSelect } from '../common/CustomSelect'
import { NumberInput } from '../common/NumberInput'
import type { DropdownOption } from '../../hooks/useDropdownOptions'

interface SalaryFormProps {
  sortedEmployerOptions: DropdownOption[]
  employerOptions: DropdownOption[]
  employerLoading: boolean
  addEmployer: (label: string) => Promise<DropdownOption | null>
  removeEmployer: (id: string) => Promise<boolean>
  onSubmit: (data: { month: string; employer: string; bruto: number; neto: number }) => Promise<void>
  onClose: () => void
}

export function SalaryForm({
  sortedEmployerOptions,
  employerOptions,
  employerLoading,
  addEmployer,
  removeEmployer,
  onSubmit,
  onClose,
}: SalaryFormProps) {
  const [month, setMonth] = useState('')
  const [employer, setEmployer] = useState('')
  const [bruto, setBruto] = useState('')
  const [neto, setNeto] = useState('')
  const [saving, setSaving] = useState(false)

  // Auto-default employer when there's exactly one option
  useEffect(() => {
    if (!employer && employerOptions.length === 1) {
      setEmployer(employerOptions[0].label)
    }
  }, [employerOptions, employer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!month || !employer || !bruto || !neto) return
    setSaving(true)
    await onSubmit({ month: month + '-01', employer, bruto: Number(bruto), neto: Number(neto) })
    setSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="סגור">&times;</button>
        <h2>הוסף משכורת</h2>
        <form onSubmit={handleSubmit}>
          <label>חודש</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} required dir="ltr" />

          <label>מעסיק</label>
          <CustomSelect
            options={sortedEmployerOptions}
            value={employer}
            placeholder="בחר מעסיק"
            onChange={setEmployer}
            onAddOption={addEmployer}
            onRemoveOption={removeEmployer}
            loading={employerLoading}
          />

          <label>ברוטו</label>
          <NumberInput placeholder="הכנס ברוטו" value={bruto} onChange={setBruto} required />

          <label>נטו</label>
          <NumberInput placeholder="הכנס נטו" value={neto} onChange={setNeto} required />

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
