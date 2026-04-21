import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './CreditCardExpensesTable.css'

interface Deposit {
  id: string
  deposit_date: string
  amount: number
  depositor_name: string
  investment_channels: {
    channel_name: string
    financial_company: string
    investment_track: string
  }
}

export function InvestmentDepositsTable() {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDeposits()
  }, [])

  const fetchDeposits = async () => {
    const { data, error } = await supabase
      .from('investment_deposits')
      .select('id, deposit_date, amount, depositor_name, investment_channels(channel_name, financial_company, investment_track)')
      .order('deposit_date', { ascending: false })

    if (!error && data) {
      setDeposits(data as unknown as Deposit[])
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="data-card"><p>טוען...</p></div>
  }

  return (
    <div className="data-card">
      <h3>הפקדות לאפיקי השקעה</h3>
      {deposits.length === 0 ? (
        <p className="data-empty">אין הפקדות עדיין</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>אפיק השקעה</th>
                <th>חברה</th>
                <th>מסלול</th>
                <th>תאריך</th>
                <th>סכום</th>
                <th>מי הפקיד</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((d) => (
                <tr key={d.id}>
                  <td>{d.investment_channels?.channel_name}</td>
                  <td>{d.investment_channels?.financial_company}</td>
                  <td>{d.investment_channels?.investment_track}</td>
                  <td>{new Date(d.deposit_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  <td>₪{d.amount.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</td>
                  <td>{d.depositor_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
