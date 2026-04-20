import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './PaybacksTable.css'

interface Payback {
  id: string
  debtor_name: string
  amount: number
  payback_method: string
  is_paid: boolean
  created_at: string
}

export function PaybacksTable() {
  const [paybacks, setPaybacks] = useState<Payback[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPaybacks()
  }, [])

  const fetchPaybacks = async () => {
    const { data, error } = await supabase
      .from('paybacks')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setPaybacks(data)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="data-card"><p>טוען...</p></div>
  }

  return (
    <div className="data-card">
      <h3>קבלת החזר</h3>
      {paybacks.length === 0 ? (
        <p className="data-empty">אין החזרים עדיין</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>מי חייב</th>
                <th>סכום</th>
                <th>אמצעי החזר</th>
                <th>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {paybacks.map((payback) => (
                <tr key={payback.id}>
                  <td>{payback.debtor_name}</td>
                  <td>₪{payback.amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</td>
                  <td>{payback.payback_method}</td>
                  <td>
                    <span className={`payback-status payback-status--${payback.is_paid ? 'paid' : 'unpaid'}`}>
                      {payback.is_paid ? 'שולם' : 'לא שולם'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
