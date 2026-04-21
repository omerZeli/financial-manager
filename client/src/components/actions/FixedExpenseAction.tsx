import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { DateInput } from '../common/DateInput'
import { CustomSelect } from '../common/CustomSelect'
import { useDropdownOptions } from '../../hooks/useDropdownOptions'
import './CreditCardExpenseAction.css'

const frequencyUnitOptions = [
  { value: 'days', label: 'ימים' },
  { value: 'weeks', label: 'שבועות' },
  { value: 'months', label: 'חודשים' },
  { value: 'years', label: 'שנים' },
]

export function FixedExpenseAction() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { options: categories, addOption: addCategory, removeOption: removeCategory } =
    useDropdownOptions('expense_category')

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startDateError, setStartDateError] = useState('')
  const [frequencyValue, setFrequencyValue] = useState('')
  const [frequencyUnit, setFrequencyUnit] = useState('')
  const [amount, setAmount] = useState('')
  const [hasEndDate, setHasEndDate] = useState(false)
  const [endDate, setEndDate] = useState('')
  const [endDateError, setEndDateError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const parseDateInput = (value: string): string | null => {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!match) return null
    const [, day, month, year] = match
    const d = parseInt(day, 10)
    const m = parseInt(month, 10)
    if (m < 1 || m > 12 || d < 1 || d > 31) return null
    return `${year}-${month}-${day}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage(null)
    setStartDateError('')
    setEndDateError('')

    const isoStartDate = parseDateInput(startDate)
    if (!isoStartDate) {
      setStartDateError('יש להזין תאריך בפורמט DD/MM/YYYY')
      setLoading(false)
      return
    }

    let isoEndDate: string | null = null
    if (hasEndDate) {
      isoEndDate = parseDateInput(endDate)
      if (!isoEndDate) {
        setEndDateError('יש להזין תאריך בפורמט DD/MM/YYYY')
        setLoading(false)
        return
      }
    }

    const { data, error } = await supabase.from('fixed_expenses').insert({
      user_id: user.id,
      name,
      category,
      start_date: isoStartDate,
      frequency_value: parseInt(frequencyValue, 10),
      frequency_unit: frequencyUnit,
      has_end_date: hasEndDate,
      end_date: isoEndDate,
      amount: parseFloat(amount),
    }).select('id').single()

    if (error) {
      setMessage({ type: 'error', text: 'שגיאה בשמירת ההוצאה הקבועה' })
    } else {
      const unitLabel = frequencyUnitOptions.find(u => u.value === frequencyUnit)?.label ?? frequencyUnit
      await supabase.from('action_logs').insert({
        user_id: user.id,
        action_type: 'fixed_expense',
        action_label: 'הוצאה קבועה',
        status: 'closed',
        reference_id: data?.id,
        summary: `${name} – ₪${parseFloat(amount).toLocaleString('he-IL', { maximumFractionDigits: 0 })} כל ${frequencyValue} ${unitLabel}`,
      })
      navigate('/actions')
    }

    setLoading(false)
  }

  return (
    <div className="action-card">
      <h3>הוצאה קבועה</h3>
      <form onSubmit={handleSubmit} className="action-form">
        <div className="action-field">
          <label htmlFor="fixed-name">שם ההוצאה</label>
          <input
            id="fixed-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="לדוגמה: ביטוח דירה"
          />
        </div>
        <div className="action-field">
          <label htmlFor="fixed-category">קטגוריה</label>
          <CustomSelect
            id="fixed-category"
            value={category}
            onChange={setCategory}
            placeholder="בחר קטגוריה"
            required
            options={categories.map((c) => ({ value: c, label: c }))}
            onAddOption={addCategory}
            onRemoveOption={removeCategory}
          />
        </div>
        <div className="action-field">
          <label htmlFor="fixed-start-date">תאריך התחלה (DD/MM/YYYY)</label>
          <DateInput
            id="fixed-start-date"
            value={startDate}
            onChange={(val) => {
              setStartDate(val)
              setStartDateError('')
            }}
            required
            error={startDateError}
          />
        </div>
        <div className="action-field">
          <label htmlFor="fixed-amount">סכום (₪)</label>
          <input
            id="fixed-amount"
            type="number"
            step="1"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0"
          />
        </div>
        <div className="action-field">
          <label>תדירות</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-h)' }}>כל</span>
            <input
              id="fixed-freq-value"
              type="number"
              step="1"
              min="1"
              value={frequencyValue}
              onChange={(e) => setFrequencyValue(e.target.value)}
              required
              placeholder="1"
              style={{ flex: '0 0 70px' }}
            />
            <div style={{ flex: 1 }}>
              <CustomSelect
                id="fixed-freq-unit"
                value={frequencyUnit}
                onChange={setFrequencyUnit}
                placeholder="בחר"
                required
                options={frequencyUnitOptions}
              />
            </div>
          </div>
        </div>
        <div className="action-field action-toggle">
          <label htmlFor="fixed-has-end-date">יש תאריך סיום?</label>
          <div className="toggle-switch">
            <input
              id="fixed-has-end-date"
              type="checkbox"
              checked={hasEndDate}
              onChange={(e) => setHasEndDate(e.target.checked)}
              role="switch"
              aria-checked={hasEndDate}
            />
            <span className="toggle-slider" onClick={() => setHasEndDate(!hasEndDate)} />
          </div>
        </div>
        {hasEndDate && (
          <div className="action-field">
            <label htmlFor="fixed-end-date">תאריך סיום (DD/MM/YYYY)</label>
            <DateInput
              id="fixed-end-date"
              value={endDate}
              onChange={(val) => {
                setEndDate(val)
                setEndDateError('')
              }}
              required
              error={endDateError}
            />
          </div>
        )}
        <button type="submit" className="action-submit" disabled={loading}>
          {loading ? 'שומר...' : 'שמור הוצאה קבועה'}
        </button>
        {message && (
          <p className={`action-message action-message--${message.type}`}>{message.text}</p>
        )}
      </form>
    </div>
  )
}
