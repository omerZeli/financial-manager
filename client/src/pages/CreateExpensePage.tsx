import { useState, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCreditCards } from '../contexts/CreditCardsContext'
import { useDropdownOptions } from '../hooks/useDropdownOptions'
import { useFormattedNumber } from '../hooks/useFormattedNumber'
import { CustomSelect } from '../components/common/CustomSelect'
import { Dropdown } from '../components/common/Dropdown'
import { getLatestFixedOccurrence } from '../lib/fixedExpenseUtils'
import './CreateExpense.css'

const FREQUENCY_PERIODS = [
  { value: 'days', label: 'ימים' },
  { value: 'weeks', label: 'שבועות' },
  { value: 'months', label: 'חודשים' },
  { value: 'years', label: 'שנים' },
]

function DatePickerField({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (iso: string) => void
  placeholder: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const formatDisplay = (iso: string) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }
  return (
    <div className="form-field">
      <label>{label}</label>
      <div className="date-picker-wrapper" onClick={() => ref.current?.showPicker()}>
        <span className={`date-picker-display${value ? '' : ' placeholder'}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <svg className="date-picker-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <input
          ref={ref}
          type="date"
          className="date-picker-hidden"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
        />
      </div>
    </div>
  )
}

export function CreateExpensePage() {
  const { cardId } = useParams<{ cardId: string }>()
  const { user } = useAuth()
  const { cards, updateLatestExpenseDate } = useCreditCards()
  const navigate = useNavigate()
  const { options: categoryOptions, loading: categoriesLoading, addOption, removeOption } = useDropdownOptions('expense_category')

  const card = cards.find((c) => c.id === cardId)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const amount = useFormattedNumber()
  const [isFixed, setIsFixed] = useState(false)

  // One-time expense fields
  const [dateISO, setDateISO] = useState('')

  // Fixed expense fields
  const [startDateISO, setStartDateISO] = useState('')
  const [frequencyValue, setFrequencyValue] = useState('')
  const [frequencyPeriod, setFrequencyPeriod] = useState('')
  const [hasEndDate, setHasEndDate] = useState(false)
  const [endDateISO, setEndDateISO] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const canSubmitBase = name.trim() && category.trim() && amount.raw && !submitting
  const canSubmitOneTime = canSubmitBase && !isFixed && !!dateISO
  const canSubmitFixed = canSubmitBase && isFixed && !!startDateISO && !!frequencyValue && !!frequencyPeriod && (!hasEndDate || !!endDateISO)
  const canSubmit = canSubmitOneTime || canSubmitFixed

  const resetForm = () => {
    setName('')
    setCategory('')
    amount.setRaw('')
    setIsFixed(false)
    setDateISO('')
    setStartDateISO('')
    setFrequencyValue('')
    setFrequencyPeriod('')
    setHasEndDate(false)
    setEndDateISO('')
    setError('')
  }

  const saveExpense = async () => {
    if (!user || !cardId || !canSubmit) return false

    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    if (isFixed) {
      const { error } = await supabase
        .from('fixed_expenses')
        .insert({
          user_id: user.id,
          credit_card_id: cardId,
          name: name.trim(),
          category: category.trim(),
          amount: parseInt(amount.raw, 10),
          start_date: startDateISO,
          frequency_value: parseInt(frequencyValue, 10),
          frequency_period: frequencyPeriod,
          end_date: hasEndDate ? endDateISO : null,
        })

      if (error) {
        setError('שגיאה בשמירת ההוצאה הקבועה')
        setSubmitting(false)
        return false
      }

      updateLatestExpenseDate(cardId, getLatestFixedOccurrence(
        startDateISO,
        parseInt(frequencyValue, 10),
        frequencyPeriod,
        hasEndDate ? endDateISO : null
      ))
    } else {
      const { error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          credit_card_id: cardId,
          name: name.trim(),
          category: category.trim(),
          amount: parseInt(amount.raw, 10),
          date: dateISO,
        })

      if (error) {
        setError('שגיאה בשמירת ההוצאה')
        setSubmitting(false)
        return false
      }

      updateLatestExpenseDate(cardId, dateISO)
    }

    setSubmitting(false)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await saveExpense()
    if (ok) navigate('/entry/credit-cards')
  }

  const handleAddAnother = async () => {
    const ok = await saveExpense()
    if (ok) {
      resetForm()
      setSuccessMsg('ההוצאה נשמרה בהצלחה')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  if (!card) {
    return (
      <div className="create-expense-page">
        <Link to="/entry/credit-cards" className="back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
          </svg>
          חזרה לכרטיסי אשראי
        </Link>
        <div className="sources-error">כרטיס אשראי לא נמצא</div>
      </div>
    )
  }

  return (
    <div className="create-expense-page">
      <Link to="/entry/credit-cards" className="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
        </svg>
        חזרה לכרטיסי אשראי
      </Link>

      <h1>הוצאה חדשה - {card.name}</h1>

      {successMsg && <div className="expense-success">{successMsg}</div>}

      <form className="create-expense-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label>שם ההוצאה</label>
          <input
            type="text"
            placeholder="הכנס שם ההוצאה"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label>קטגוריה</label>
          <CustomSelect
            options={categoryOptions}
            value={category}
            placeholder="בחר קטגוריה"
            onChange={setCategory}
            onAddOption={addOption}
            onRemoveOption={removeOption}
            loading={categoriesLoading}
          />
        </div>

        <div className="form-field">
          <label>סכום (₪)</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="הכנס סכום"
            value={amount.display}
            onChange={amount.onChange}
            required
          />
        </div>

        <div className="form-field">
          <label>סוג הוצאה</label>
          <div className="toggle-bar">
            <button
              type="button"
              className={`toggle-option${!isFixed ? ' active' : ''}`}
              onClick={() => setIsFixed(false)}
            >
              רגילה
            </button>
            <button
              type="button"
              className={`toggle-option${isFixed ? ' active' : ''}`}
              onClick={() => setIsFixed(true)}
            >
              קבועה
            </button>
          </div>
        </div>

        {!isFixed ? (
          <DatePickerField
            label="תאריך"
            value={dateISO}
            onChange={setDateISO}
            placeholder="בחר תאריך"
          />
        ) : (
          <>
            <DatePickerField
              label="תאריך התחלה"
              value={startDateISO}
              onChange={setStartDateISO}
              placeholder="בחר תאריך התחלה"
            />

            <div className="form-field">
              <label>תדירות</label>
              <div className="frequency-row">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="הכנס ערך"
                  className="frequency-value"
                  value={frequencyValue}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '')
                    setFrequencyValue(v)
                  }}
                />
                <Dropdown
                  options={FREQUENCY_PERIODS}
                  value={frequencyPeriod}
                  placeholder="תקופה"
                  onChange={setFrequencyPeriod}
                />
              </div>
            </div>

            <div className="form-field">
              <label>יש תאריך סיום?</label>
              <div className="toggle-bar">
                <button
                  type="button"
                  className={`toggle-option${!hasEndDate ? ' active' : ''}`}
                  onClick={() => { setHasEndDate(false); setEndDateISO('') }}
                >
                  לא
                </button>
                <button
                  type="button"
                  className={`toggle-option${hasEndDate ? ' active' : ''}`}
                  onClick={() => setHasEndDate(true)}
                >
                  כן
                </button>
              </div>
            </div>

            {hasEndDate && (
              <DatePickerField
                label="תאריך סיום"
                value={endDateISO}
                onChange={setEndDateISO}
                placeholder="בחר תאריך סיום"
              />
            )}
          </>
        )}

        {error && <div className="sources-error">{error}</div>}

        <div className="form-buttons">
          <button type="submit" className="submit-btn" disabled={!canSubmit}>
            {submitting ? 'שומר...' : 'שמירה'}
          </button>
          <button type="button" className="add-another-btn" disabled={!canSubmit} onClick={handleAddAnother}>
            שמירה והוספת הוצאה
          </button>
        </div>
      </form>
    </div>
  )
}
