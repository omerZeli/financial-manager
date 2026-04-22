import { useState, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCreditCards } from '../contexts/CreditCardsContext'
import { useDropdownOptions } from '../hooks/useDropdownOptions'
import { useFormattedNumber } from '../hooks/useFormattedNumber'
import { CustomSelect } from '../components/common/CustomSelect'
import './CreateExpense.css'

export function CreateExpensePage() {
  const { cardId } = useParams<{ cardId: string }>()
  const { user } = useAuth()
  const { cards } = useCreditCards()
  const navigate = useNavigate()
  const { options: categoryOptions, loading: categoriesLoading, addOption, removeOption } = useDropdownOptions('expense_category')

  const card = cards.find((c) => c.id === cardId)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const amount = useFormattedNumber()
  const [dateISO, setDateISO] = useState('')
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const formatDateDisplay = (iso: string) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  const canSubmit = name.trim() && category.trim() && amount.raw && dateISO && !submitting

  const resetForm = () => {
    setName('')
    setCategory('')
    amount.setRaw('')
    setDateISO('')
    setError('')
  }

  const saveExpense = async () => {
    if (!user || !cardId || !canSubmit) return false

    setSubmitting(true)
    setError('')
    setSuccessMsg('')

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
          <label>תאריך</label>
          <div className="date-picker-wrapper" onClick={() => dateInputRef.current?.showPicker()}>
            <span className={`date-picker-display${dateISO ? '' : ' placeholder'}`}>
              {dateISO ? formatDateDisplay(dateISO) : 'בחר תאריך'}
            </span>
            <svg className="date-picker-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <input
              ref={dateInputRef}
              type="date"
              className="date-picker-hidden"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              required
            />
          </div>
        </div>

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
