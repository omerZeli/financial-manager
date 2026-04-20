import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { CustomSelect } from '../common/CustomSelect'
import './PaybackAction.css'

const PAYBACK_METHODS = [
  'העברה בנקאית',
  'מזומן',
  'פייבוקס',
  'ביט',
  'אחר',
]

export function PaybackAction() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [debtorName, setDebtorName] = useState('')
  const [amount, setAmount] = useState('')
  const [paybackMethod, setPaybackMethod] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage(null)

    const { data, error } = await supabase.from('paybacks').insert({
      user_id: user.id,
      debtor_name: debtorName,
      amount: parseFloat(amount),
      payback_method: paybackMethod,
      is_paid: isPaid,
    }).select('id').single()

    if (error) {
      setMessage({ type: 'error', text: 'שגיאה בשמירת ההחזר' })
    } else {
      // Log the action: open if not paid yet, closed if already paid
      await supabase.from('action_logs').insert({
        user_id: user.id,
        action_type: 'payback',
        action_label: 'קבלת החזר',
        status: isPaid ? 'closed' : 'open',
        reference_id: data?.id,
        summary: `${debtorName} – ₪${parseFloat(amount).toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
      })
      navigate('/actions')
    }

    setLoading(false)
  }

  return (
    <div className="action-card">
      <h3>קבלת החזר</h3>
      <form onSubmit={handleSubmit} className="action-form">
        <div className="action-field">
          <label htmlFor="debtor-name">מי צריך להחזיר לי</label>
          <input
            id="debtor-name"
            type="text"
            value={debtorName}
            onChange={(e) => setDebtorName(e.target.value)}
            required
            placeholder="לדוגמה: יוסי"
          />
        </div>
        <div className="action-field">
          <label htmlFor="payback-amount">סכום (₪)</label>
          <input
            id="payback-amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0.00"
          />
        </div>
        <div className="action-field">
          <label htmlFor="payback-method">אמצעי החזר</label>
          <CustomSelect
            id="payback-method"
            value={paybackMethod}
            onChange={setPaybackMethod}
            placeholder="בחר אמצעי החזר"
            required
            options={PAYBACK_METHODS.map((m) => ({ value: m, label: m }))}
          />
        </div>
        <div className="action-field action-toggle">
          <label htmlFor="is-paid">האם שילם?</label>
          <div className="toggle-switch">
            <input
              id="is-paid"
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              role="switch"
              aria-checked={isPaid}
            />
            <span className="toggle-slider" onClick={() => setIsPaid(!isPaid)} />
          </div>
        </div>
        <button type="submit" className="action-submit" disabled={loading}>
          {loading ? 'שומר...' : 'שמור החזר'}
        </button>
        {message && (
          <p className={`action-message action-message--${message.type}`}>{message.text}</p>
        )}
      </form>
    </div>
  )
}
