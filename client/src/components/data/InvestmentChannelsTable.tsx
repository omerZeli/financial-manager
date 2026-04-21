import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './CreditCardExpensesTable.css'

interface Channel {
  id: string
  channel_name: string
  financial_company: string
  investment_track: string
  current_value: number | null
  value_updated_at: string | null
}

export function InvestmentChannelsTable() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChannels()
  }, [])

  const fetchChannels = async () => {
    const { data, error } = await supabase
      .from('investment_channels')
      .select('id, channel_name, financial_company, investment_track, current_value, value_updated_at')
      .order('channel_name', { ascending: true })

    if (!error && data) {
      setChannels(data)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="data-card"><p>טוען...</p></div>
  }

  return (
    <div className="data-card">
      <h3>אפיקי השקעה</h3>
      {channels.length === 0 ? (
        <p className="data-empty">אין אפיקי השקעה עדיין</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>שם אפיק</th>
                <th>חברה מנהלת</th>
                <th>מסלול</th>
                <th>שווי נוכחי</th>
                <th>עדכון אחרון</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.id}>
                  <td>{c.channel_name}</td>
                  <td>{c.financial_company}</td>
                  <td>{c.investment_track}</td>
                  <td>{c.current_value != null ? `₪${c.current_value.toLocaleString('he-IL', { maximumFractionDigits: 0 })}` : '—'}</td>
                  <td>{c.value_updated_at ? new Date(c.value_updated_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
