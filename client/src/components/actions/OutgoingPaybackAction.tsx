import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { CustomSelect } from '../common/CustomSelect'
import { useDropdownOptions } from '../../hooks/useDropdownOptions'
import './OutgoingPaybackAction.css'

export function OutgoingPaybackAction() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { options: paybackMethods, addOption: addPaybackMethod, removeOption: removePaybackMethod } =
    useDropdownOptions('payback_method')

  const [creditorName, setCreditorName] = useState('')
  const [amount, setAmount] = useState('')
  const [paybackMethod, setPaybackMethod] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage(null)

    const { data, error } = await supabase.from('outgoing_paybacks').insert({
      user_id: user.id,
      creditor_name: creditorName,
      amount: parseFloat(amount),
      payback_method: paybackMethod,
    }).select('id').single()

    if (error) {
      setMessage({ type: 'error', text: 'שגיאה בשמירת ההחזר' })
    } else {
      await supabase.from('action_logs').insert({
        user_id: user.id,
        action_type: 'outgoing_payback',
        action_label: 'החזר למישהו אחר',
        status: 'closed',
        reference_id: data?.id,
        summary: `${creditorName} – ₪${parseFloat(amount).toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
      })
      navigate('/actions')
    }

    setLoading(false)
  }

  return (
    <div className="action-card">
      <h3>החזר למישהו אחר</h3>
      <form onSubmit={handleSubmit} className="action-form">
        <div className="action-field">
          <label htmlFor="creditor-name">למי אני מחזיר</label>
          <input
            id="creditor-name"
            type="text"
            value={creditorName}
            onChange={(e) => setCreditorName(e.target.value)}
            required
            placeholder="לדוגמה: יוסי"
          />
        </div>
        <div className="action-field">
          <label htmlFor="outgoing-payback-amount">סכום (₪)</label>
          <input
            id="outgoing-payback-amount"
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
          <label htmlFor="outgoing-payback-method">אמצעי החזר</label>
          <CustomSelect
            id="outgoing-payback-method"
            value={paybackMethod}
            onChange={setPaybackMethod}
            placeholder="בחר אמצעי החזר"
            required
            options={paybackMethods.map((m) => ({ value: m, label: m }))}
            onAddOption={addPaybackMethod}
            onRemoveOption={removePaybackMethod}
          />
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
