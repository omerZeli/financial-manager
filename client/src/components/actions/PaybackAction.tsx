import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { CustomSelect } from '../common/CustomSelect'
import { useDropdownOptions } from '../../hooks/useDropdownOptions'
import './PaybackAction.css'

interface PaybackLocationState {
  triggeredBy?: string
  prefillAmount?: string
}

export function PaybackAction() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state as PaybackLocationState) || {}

  const { options: paybackMethods, addOption: addPaybackMethod, removeOption: removePaybackMethod } =
    useDropdownOptions('payback_method')
  const { options: people, addOption: addPerson, removeOption: removePerson } =
    useDropdownOptions('person_name')

  const [debtorName, setDebtorName] = useState('')
  const [amount, setAmount] = useState(locationState.prefillAmount || '')
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
      await supabase.from('action_logs').insert({
        user_id: user.id,
        action_type: 'payback',
        action_label: 'קבלת החזר',
        status: isPaid ? 'closed' : 'open',
        reference_id: data?.id,
        summary: `${debtorName} – ₪${parseFloat(amount).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`,
        ...(locationState.triggeredBy ? { triggered_by: locationState.triggeredBy } : {}),
      })
      navigate(-1)
    }

    setLoading(false)
  }

  return (
    <div className="action-card">
      <h3>קבלת החזר</h3>
      <form onSubmit={handleSubmit} className="action-form">
        <div className="action-field">
          <label htmlFor="debtor-name">מי צריך להחזיר לי</label>
          <CustomSelect
            id="debtor-name"
            value={debtorName}
            onChange={setDebtorName}
            placeholder="בחר שם"
            required
            options={people.map((p) => ({ value: p, label: p }))}
            onAddOption={addPerson}
            onRemoveOption={removePerson}
          />
        </div>
        <div className="action-field">
          <label htmlFor="payback-amount">סכום (₪)</label>
          <input
            id="payback-amount"
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
          <label htmlFor="payback-method">אמצעי החזר</label>
          <CustomSelect
            id="payback-method"
            value={paybackMethod}
            onChange={setPaybackMethod}
            placeholder="בחר אמצעי החזר"
            required
            options={paybackMethods.map((m) => ({ value: m, label: m }))}
            onAddOption={addPaybackMethod}
            onRemoveOption={removePaybackMethod}
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
