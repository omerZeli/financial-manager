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
  total_deposits: number
}

export function InvestmentChannelsTable() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChannels()
  }, [])

  const fetchChannels = async () => {
    const { data: channelsData, error: chErr } = await supabase
      .from('investment_channels')
      .select('id, channel_name, financial_company, investment_track, current_value, value_updated_at')
      .order('channel_name', { ascending: true })

    if (chErr || !channelsData) {
      setLoading(false)
      return
    }

    const { data: deposits } = await supabase
      .from('investment_deposits')
      .select('investment_channel_id, amount')

    const depositSums: Record<string, number> = {}
    if (deposits) {
      for (const d of deposits) {
        depositSums[d.investment_channel_id] = (depositSums[d.investment_channel_id] ?? 0) + Number(d.amount)
      }
    }

    setChannels(
      channelsData.map((c) => ({
        ...c,
        total_deposits: depositSums[c.id] ?? 0,
      }))
    )
    setLoading(false)
  }

  const fmt = (n: number) => `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`

  const calcReturn = (c: Channel) => {
    if (c.current_value == null || c.total_deposits === 0) return null
    const diff = c.current_value - c.total_deposits
    const pct = (diff / c.total_deposits) * 100
    const sign = diff >= 0 ? '+' : '-'
    const absDiff = Math.abs(diff)
    return { diff, pct, diffStr: `${sign}₪${absDiff.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`, pctStr: `${sign}${Math.abs(pct).toFixed(1)}%` }
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
                <th>סה״כ הפקדות</th>
                <th>שווי נוכחי</th>
                <th>תשואה (₪)</th>
                <th>תשואה (%)</th>
                <th>עדכון אחרון</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => {
                const ret = calcReturn(c)
                const isPositive = c.current_value != null && c.current_value >= c.total_deposits
                return (
                  <tr key={c.id}>
                    <td>{c.channel_name}</td>
                    <td>{c.financial_company}</td>
                    <td>{c.investment_track}</td>
                    <td>{c.total_deposits > 0 ? fmt(c.total_deposits) : '—'}</td>
                    <td>{c.current_value != null ? fmt(c.current_value) : '—'}</td>
                    <td className="return-cell" style={ret ? { color: isPositive ? '#16a34a' : '#dc2626' } : undefined}>
                      {ret ? ret.diffStr : '—'}
                    </td>
                    <td className="return-cell" style={ret ? { color: isPositive ? '#16a34a' : '#dc2626' } : undefined}>
                      {ret ? ret.pctStr : '—'}
                    </td>
                    <td>{c.value_updated_at ? new Date(c.value_updated_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
