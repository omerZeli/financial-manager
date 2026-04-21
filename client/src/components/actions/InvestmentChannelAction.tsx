import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { CustomSelect } from '../common/CustomSelect'
import { useDropdownOptions } from '../../hooks/useDropdownOptions'
import './CreditCardExpenseAction.css'

export function InvestmentChannelAction() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { options: companies, addOption: addCompany, removeOption: removeCompany } =
    useDropdownOptions('financial_company')

  const [channelName, setChannelName] = useState('')
  const [financialCompany, setFinancialCompany] = useState('')
  const [investmentTrack, setInvestmentTrack] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage(null)

    const { data, error } = await supabase.from('investment_channels').insert({
      user_id: user.id,
      channel_name: channelName,
      financial_company: financialCompany,
      investment_track: investmentTrack,
    }).select('id').single()

    if (error) {
      setMessage({ type: 'error', text: 'שגיאה בשמירת אפיק ההשקעה' })
    } else {
      await supabase.from('action_logs').insert({
        user_id: user.id,
        action_type: 'investment_channel',
        action_label: 'יצירת אפיק השקעה',
        status: 'closed',
        reference_id: data?.id,
        summary: `${channelName} – ${financialCompany} – ${investmentTrack}`,
      })

      navigate('/actions')
    }

    setLoading(false)
  }

  return (
    <div className="action-card">
      <h3>יצירת אפיק השקעה</h3>
      <form onSubmit={handleSubmit} className="action-form">
        <div className="action-field">
          <label htmlFor="channel-name">שם אפיק השקעה</label>
          <input
            id="channel-name"
            type="text"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            required
            placeholder="לדוגמה: קרן פנסיה"
          />
        </div>
        <div className="action-field">
          <label htmlFor="financial-company">חברה מנהלת</label>
          <CustomSelect
            id="financial-company"
            value={financialCompany}
            onChange={setFinancialCompany}
            placeholder="בחר חברה"
            required
            options={companies.map((c) => ({ value: c, label: c }))}
            onAddOption={addCompany}
            onRemoveOption={removeCompany}
          />
        </div>
        <div className="action-field">
          <label htmlFor="investment-track">מסלול השקעה</label>
          <input
            id="investment-track"
            type="text"
            value={investmentTrack}
            onChange={(e) => setInvestmentTrack(e.target.value)}
            required
            placeholder="לדוגמה: מניות"
          />
        </div>
        <button type="submit" className="action-submit" disabled={loading}>
          {loading ? 'שומר...' : 'שמור אפיק השקעה'}
        </button>
        {message && (
          <p className={`action-message action-message--${message.type}`}>{message.text}</p>
        )}
      </form>
    </div>
  )
}
