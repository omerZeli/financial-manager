import { useRef } from 'react'
import './DateInput.css'

interface DateInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
}

/**
 * A date input that allows both manual text entry (DD/MM/YYYY)
 * and a native date picker via a calendar icon button.
 */
export function DateInput({ id, value, onChange, required, error }: DateInputProps) {
  const hiddenDateRef = useRef<HTMLInputElement>(null)

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoValue = e.target.value // YYYY-MM-DD
    if (!isoValue) return
    const [year, month, day] = isoValue.split('-')
    onChange(`${day}/${month}/${year}`)
  }

  const openPicker = () => {
    hiddenDateRef.current?.showPicker()
  }

  // Convert current DD/MM/YYYY value to YYYY-MM-DD for the hidden picker
  const toIso = (val: string): string => {
    const match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!match) return ''
    const [, day, month, year] = match
    return `${year}-${month}-${day}`
  }

  const formatDateInput = (raw: string): string => {
    // Strip everything except digits
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInput(e.target.value)
    onChange(formatted)
  }

  return (
    <div className="date-input-wrapper">
      <div className="date-input-row">
        <input
          id={id}
          type="text"
          className="date-input-text"
          value={value}
          onChange={handleTextChange}
          required={required}
          placeholder="31/01/2026"
          inputMode="numeric"
          maxLength={10}
        />
        <button
          type="button"
          className="date-input-picker-btn"
          onClick={openPicker}
          aria-label="בחר תאריך מלוח שנה"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </button>
        <input
          ref={hiddenDateRef}
          type="date"
          className="date-input-hidden"
          value={toIso(value)}
          onChange={handlePickerChange}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      {error && <span className="flow-field-error">{error}</span>}
    </div>
  )
}
