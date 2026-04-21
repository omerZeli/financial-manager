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
  const { options: people, addOption: addPerson, removeOption: removePerson } =
    useDropdownOptions('person_name')
  const { options: categories, addOption: addCategory, removeOption: removeCategory } =
    useDropdownOptions('expense_category')

  const [reason, setReason] = useState('')
  const [category, setCategory] = useState('')
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
      reason,
      category,
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
        summary: `${creditorName} – ₪${parseFloat(amount).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`,
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
          <label htmlFor="outgoing-reason">סיבת ההחזר</label>
          <input
            id="outgoing-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            placeholder="לדוגמה: ארוחת ערב"
          />
        </div>
        <div className="action-field">
          <label htmlFor="outgoing-category">קטגוריה</label>
          <CustomSelect
            id="outgoing-category"
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
          <label htmlFor="creditor-name">למי אני מחזיר</label>
          <CustomSelect
            id="creditor-name"
            value={creditorName}
            onChange={setCreditorName}
            placeholder="בחר שם"
            required
            options={people.map((p) => ({ value: p, label: p }))}
            onAddOption={addPerson}
            onRemoveOption={removePerson}
          />
        </div>
        <div className="action-field">
          <label htmlFor="outgoing-payback-amount">סכום (₪)</label>
          <input
            id="outgoing-payback-amount"
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
