import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { DateInput } from '../common/DateInput'
import { CustomSelect } from '../common/CustomSelect'
import { useDropdownOptions } from '../../hooks/useDropdownOptions'
import { useInvestmentChannels } from '../../hooks/useInvestmentChannels'
import './CreditCardExpenseAction.css'

export function InvestmentDepositAction() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { channels } = useInvestmentChannels()
  const { options: depositors, addOption: addDepositor, removeOption: removeDepositor } =
    useDropdownOptions('depositor_name')

  const [channelId, setChannelId] = useState('')
  const [depositDate, setDepositDate] = useState('')
  const [depositDateError, setDepositDateError] = useState('')
  const [amount, setAmount] = useState('')
  const [depositorName, setDepositorName] = useState('')
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
    setDepositDateError('')

    const isoDate = parseDateInput(depositDate)
    if (!isoDate) {
      setDepositDateError('יש להזין תאריך בפורמט DD/MM/YYYY')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.from('investment_deposits').insert({
      user_id: user.id,
      investment_channel_id: channelId,
      deposit_date: isoDate,
      amount: parseFloat(amount),
      depositor_name: depositorName,
    }).select('id').single()

    if (error) {
      setMessage({ type: 'error', text: 'שגיאה בשמירת ההפקדה' })
    } else {
      const channel = channels.find((c) => c.id === channelId)
      const channelLabel = channel?.channel_name ?? ''

      await supabase.from('action_logs').insert({
        user_id: user.id,
        action_type: 'investment_deposit',
        action_label: 'הפקדה לאפיק השקעה',
        status: 'closed',
        reference_id: data?.id,
        summary: `${channelLabel} – ₪${parseFloat(amount).toLocaleString('he-IL', { minimumFractionDigits: 2 })} – ${depositorName}`,
      })

      navigate('/actions')
    }

    setLoading(false)
  }

  return (
    <div className="action-card">
      <h3>הפקדה לאפיק השקעה</h3>
      <form onSubmit={handleSubmit} className="action-form">
        <div className="action-field">
          <label htmlFor="deposit-channel">אפיק השקעה</label>
          <CustomSelect
            id="deposit-channel"
            value={channelId}
            onChange={setChannelId}
            placeholder="בחר אפיק השקעה"
            required
            options={channels.map((c) => ({ value: c.id, label: `${c.channel_name} – ${c.financial_company}` }))}
          />
        </div>
        <div className="action-field">
          <label htmlFor="deposit-date">תאריך (DD/MM/YYYY)</label>
          <DateInput
            id="deposit-date"
            value={depositDate}
            onChange={(val) => {
              setDepositDate(val)
              setDepositDateError('')
            }}
            required
            error={depositDateError}
          />
        </div>
        <div className="action-field">
          <label htmlFor="deposit-amount">סכום (₪)</label>
          <input
            id="deposit-amount"
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
          <label htmlFor="deposit-depositor">מי הפקיד</label>
          <CustomSelect
            id="deposit-depositor"
            value={depositorName}
            onChange={setDepositorName}
            placeholder="בחר שם"
            required
            options={depositors.map((p) => ({ value: p, label: p }))}
            onAddOption={addDepositor}
            onRemoveOption={removeDepositor}
          />
        </div>
        <button type="submit" className="action-submit" disabled={loading}>
          {loading ? 'שומר...' : 'שמור הפקדה'}
        </button>
        {message && (
          <p className={`action-message action-message--${message.type}`}>{message.text}</p>
        )}
      </form>
    </div>
  )
}
