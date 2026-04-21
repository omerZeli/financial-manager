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

export function CarExpenseAction() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { options: categories, addOption: addCategory, removeOption: removeCategory } =
    useDropdownOptions('car_expense_category')

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [isFixed, setIsFixed] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [startDateError, setStartDateError] = useState('')
  const [frequencyValue, setFrequencyValue] = useState('')
  const [frequencyUnit, setFrequencyUnit] = useState('')
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

    let isoStartDate: string | null = null
    let isoEndDate: string | null = null

    if (isFixed) {
      isoStartDate = parseDateInput(startDate)
      if (!isoStartDate) {
        setStartDateError('יש להזין תאריך בפורמט DD/MM/YYYY')
        setLoading(false)
        return
      }
      if (hasEndDate) {
        isoEndDate = parseDateInput(endDate)
        if (!isoEndDate) {
          setEndDateError('יש להזין תאריך בפורמט DD/MM/YYYY')
          setLoading(false)
          return
        }
      }
    }

    const { data, error } = await supabase.from('car_expenses').insert({
      user_id: user.id,
      name,
      category,
      amount: parseFloat(amount),
      is_fixed: isFixed,
      start_date: isoStartDate,
      frequency_value: isFixed ? parseInt(frequencyValue, 10) : null,
      frequency_unit: isFixed ? frequencyUnit : null,
      has_end_date: isFixed ? hasEndDate : false,
      end_date: isoEndDate,
    }).select('id').single()

    if (error) {
      setMessage({ type: 'error', text: 'שגיאה בשמירת הוצאת הרכב' })
    } else {
      let summary = `${name} – ₪${parseFloat(amount).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`
      if (isFixed) {
        const unitLabel = frequencyUnitOptions.find(u => u.value === frequencyUnit)?.label ?? frequencyUnit
        summary += ` כל ${frequencyValue} ${unitLabel}`
      }
      await supabase.from('action_logs').insert({
        user_id: user.id,
        action_type: 'car_expense',
        action_label: 'הוצאות רכב',
        status: 'closed',
        reference_id: data?.id,
        summary,
      })
      navigate(-1)
    }

    setLoading(false)
  }

  return (
    <div className="action-card">
      <h3>הוצאות רכב</h3>
      <form onSubmit={handleSubmit} className="action-form">
        <div className="action-field">
          <label htmlFor="car-name">שם ההוצאה</label>
          <input
            id="car-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="הכנס שם הוצאה"
          />
        </div>
        <div className="action-field">
          <label htmlFor="car-category">קטגוריה</label>
          <CustomSelect
            id="car-category"
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
          <label htmlFor="car-amount">סכום (₪)</label>
          <input
            id="car-amount"
            type="number"
            step="1"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0"
          />
        </div>
        <div className="action-field action-toggle">
          <label htmlFor="car-is-fixed">הוצאה קבועה?</label>
          <div className="toggle-switch">
            <input
              id="car-is-fixed"
              type="checkbox"
              checked={isFixed}
              onChange={(e) => setIsFixed(e.target.checked)}
              role="switch"
              aria-checked={isFixed}
            />
            <span className="toggle-slider" onClick={() => setIsFixed(!isFixed)} />
          </div>
        </div>
        {isFixed && (
          <>
            <div className="action-field">
              <label htmlFor="car-start-date">תאריך התחלה (DD/MM/YYYY)</label>
              <DateInput
                id="car-start-date"
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
              <label>תדירות</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-h)' }}>כל</span>
                <input
                  id="car-freq-value"
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
                    id="car-freq-unit"
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
              <label htmlFor="car-has-end-date">יש תאריך סיום?</label>
              <div className="toggle-switch">
                <input
                  id="car-has-end-date"
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
                <label htmlFor="car-end-date">תאריך סיום (DD/MM/YYYY)</label>
                <DateInput
                  id="car-end-date"
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
          </>
        )}
        <button type="submit" className="action-submit" disabled={loading}>
          {loading ? 'שומר...' : 'שמור הוצאת רכב'}
        </button>
        {message && (
          <p className={`action-message action-message--${message.type}`}>{message.text}</p>
        )}
      </form>
    </div>
  )
}
