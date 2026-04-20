import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { DateInput } from '../common/DateInput'
import './CreditCardExpenseAction.css'

export function CreditCardExpenseAction() {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [expenseDateError, setExpenseDateError] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const parseDateInput = (value: string): string | null => {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!match) return null
    const [, day, month, year] = match
    const d = parseInt(day, 10)
    const m = parseInt(month, 10)
    const y = parseInt(year, 10)
    if (m < 1 || m > 12 || d < 1 || d > 31) return null
    return `${y}-${month}-${day}`
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
    }).select('id').single()

    if (error) {
      setMessage({ type: 'error', text: 'שגיאה בשמירת ההוצאה' })
    } else {
      // Log the action as closed (credit card expense is always a done action)
      await supabase.from('action_logs').insert({
        user_id: user.id,
        action_type: 'credit_card_expense',
        action_label: 'הוצאות כרטיס אשראי',
        status: 'closed',
        reference_id: data?.id,
        summary: `${title} – ₪${parseFloat(amount).toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
      })
      setMessage({ type: 'success', text: 'ההוצאה נשמרה בהצלחה' })
      setTitle('')
      setCategory('')
      setExpenseDate('')
      setAmount('')
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
            placeholder="לדוגמה: כרטיסים לסרט"
          />
        </div>
        <div className="action-field">
          <label htmlFor="expense-category">קטגוריה</label>
          <input
            id="expense-category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            placeholder="לדוגמה: בילויים"
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
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0.00"
          />
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
