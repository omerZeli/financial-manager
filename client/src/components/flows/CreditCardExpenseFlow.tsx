import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import './CreditCardExpenseFlow.css'

export function CreditCardExpenseFlow() {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage(null)

    const { error } = await supabase.from('credit_card_expenses').insert({
      user_id: user.id,
      title,
      category,
      expense_date: expenseDate,
      amount: parseFloat(amount),
    })

    if (error) {
      setMessage({ type: 'error', text: 'שגיאה בשמירת ההוצאה' })
    } else {
      setMessage({ type: 'success', text: 'ההוצאה נשמרה בהצלחה' })
      setTitle('')
      setCategory('')
      setExpenseDate('')
      setAmount('')
    }

    setLoading(false)
  }

  return (
    <div className="flow-card">
      <h3>הוצאות כרטיס אשראי</h3>
      <form onSubmit={handleSubmit} className="flow-form">
        <div className="flow-field">
          <label htmlFor="expense-title">שם ההוצאה</label>
          <input
            id="expense-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="לדוגמה: סופר"
          />
        </div>
        <div className="flow-field">
          <label htmlFor="expense-category">קטגוריה</label>
          <input
            id="expense-category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            placeholder="לדוגמה: מזון"
          />
        </div>
        <div className="flow-field">
          <label htmlFor="expense-date">תאריך</label>
          <input
            id="expense-date"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
          />
        </div>
        <div className="flow-field">
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
        <button type="submit" className="flow-submit" disabled={loading}>
          {loading ? 'שומר...' : 'שמור הוצאה'}
        </button>
        {message && (
          <p className={`flow-message flow-message--${message.type}`}>{message.text}</p>
        )}
      </form>
    </div>
  )
}
