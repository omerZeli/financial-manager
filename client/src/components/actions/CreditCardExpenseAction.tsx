import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { DateInput } from '../common/DateInput'
import { CustomSelect } from '../common/CustomSelect'
import { useDropdownOptions } from '../../hooks/useDropdownOptions'
import './CreditCardExpenseAction.css'

export function CreditCardExpenseAction() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { options: categories, addOption: addCategory, removeOption: removeCategory } =
    useDropdownOptions('expense_category')

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [expenseDateError, setExpenseDateError] = useState('')
  const [amount, setAmount] = useState('')
  const [requiresPayback, setRequiresPayback] = useState(false)
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
    setExpenseDateError('')

    const isoDate = parseDateInput(expenseDate)
    if (!isoDate) {
      setExpenseDateError('יש להזין תאריך בפורמט DD/MM/YYYY')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.from('credit_card_expenses').insert({
      user_id: user.id,
      title,
      category,
      expense_date: isoDate,
      amount: parseFloat(amount),
      requires_payback: requiresPayback,
    }).select('id').single()

    if (error) {
      setMessage({ type: 'error', text: 'שגיאה בשמירת ההוצאה' })
    } else {
      const { data: logData } = await supabase.from('action_logs').insert({
        user_id: user.id,
        action_type: 'credit_card_expense',
        action_label: 'הוצאות כרטיס אשראי',
        status: 'closed',
        reference_id: data?.id,
        summary: `${title} – ₪${parseFloat(amount).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`,
      }).select('id').single()

      if (requiresPayback && logData) {
        navigate('/actions/paybacks', {
          state: {
            triggeredBy: logData.id,
            prefillAmount: amount,
          },
        })
      } else {
        navigate(-1)
      }
    }

    setLoading(false)
  }

  return (
    <div className="action-card">
      <h3>הוצאות כרטיס אשראי</h3>
      <form onSubmit={handleSubmit} className="action-form">
        <div className="action-field">
          <label htmlFor="expense-title">שם ההוצאה</label>
          <input
            id="expense-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="הכנס שם הוצאה"
          />
        </div>
        <div className="action-field">
          <label htmlFor="expense-category">קטגוריה</label>
          <CustomSelect
            id="expense-category"
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
          <label htmlFor="expense-date">תאריך (DD/MM/YYYY)</label>
          <DateInput
            id="expense-date"
            value={expenseDate}
            onChange={(val) => {
              setExpenseDate(val)
              setExpenseDateError('')
            }}
            required
            error={expenseDateError}
          />
        </div>
        <div className="action-field">
          <label htmlFor="expense-amount">סכום (₪)</label>
          <input
            id="expense-amount"
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
          <label htmlFor="requires-payback">מישהו צריך להחזיר לי?</label>
          <div className="toggle-switch">
            <input
              id="requires-payback"
              type="checkbox"
              checked={requiresPayback}
              onChange={(e) => setRequiresPayback(e.target.checked)}
              role="switch"
              aria-checked={requiresPayback}
            />
            <span className="toggle-slider" onClick={() => setRequiresPayback(!requiresPayback)} />
          </div>
        </div>
        <button type="submit" className="action-submit" disabled={loading}>
          {loading ? 'שומר...' : 'שמור הוצאה'}
        </button>
        {message && (
          <p className={`action-message action-message--${message.type}`}>{message.text}</p>
        )}
      </form>
    </div>
  )
}
