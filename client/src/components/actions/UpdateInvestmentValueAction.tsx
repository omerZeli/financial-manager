import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { CustomSelect } from '../common/CustomSelect'
import { useInvestmentChannels } from '../../hooks/useInvestmentChannels'
import './CreditCardExpenseAction.css'

export function UpdateInvestmentValueAction() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { channels } = useInvestmentChannels()

  const [channelId, setChannelId] = useState('')
  const [currentValue, setCurrentValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage(null)

    const numValue = parseFloat(currentValue)
    const today = new Date().toISOString().split('T')[0]

    const { error } = await supabase
      .from('investment_channels')
      .update({ current_value: numValue, value_updated_at: today })
      .eq('id', channelId)

    if (error) {
      setMessage({ type: 'error', text: 'שגיאה בעדכון שווי האפיק' })
    } else {
      const channel = channels.find((c) => c.id === channelId)
      const channelLabel = channel?.channel_name ?? ''

      await supabase.from('action_logs').insert({
        user_id: user.id,
        action_type: 'update_investment_value',
        action_label: 'עדכון שווי אפיק השקעה',
        status: 'closed',
        reference_id: channelId,
        summary: `${channelLabel} – ₪${numValue.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`,
      })

      navigate(-1)
    }

    setLoading(false)
  }

  return (
    <div className="action-card">
      <h3>עדכון שווי אפיק השקעה</h3>
      <form onSubmit={handleSubmit} className="action-form">
        <div className="action-field">
          <label htmlFor="value-channel">אפיק השקעה</label>
          <CustomSelect
            id="value-channel"
            value={channelId}
            onChange={setChannelId}
            placeholder="בחר אפיק השקעה"
            required
            options={channels.map((c) => ({ value: c.id, label: `${c.channel_name} – ${c.financial_company}` }))}
          />
        </div>
        <div className="action-field">
          <label htmlFor="current-value">שווי נוכחי (₪)</label>
          <input
            id="current-value"
            type="number"
            step="1"
            min="0"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            required
            placeholder="0"
          />
        </div>
        <button type="submit" className="action-submit" disabled={loading}>
          {loading ? 'שומר...' : 'עדכן שווי'}
        </button>
        {message && (
          <p className={`action-message action-message--${message.type}`}>{message.text}</p>
        )}
      </form>
    </div>
  )
}
