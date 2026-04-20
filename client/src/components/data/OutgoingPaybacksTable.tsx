import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './OutgoingPaybacksTable.css'

interface OutgoingPayback {
  id: string
  creditor_name: string
  amount: number
  payback_method: string
  created_at: string
}

export function OutgoingPaybacksTable() {
  const [paybacks, setPaybacks] = useState<OutgoingPayback[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPaybacks()
  }, [])

  const fetchPaybacks = async () => {
    const { data, error } = await supabase
      .from('outgoing_paybacks')
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
      <h3>החזר למישהו אחר</h3>
      {paybacks.length === 0 ? (
        <p className="data-empty">אין החזרים עדיין</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>למי</th>
                <th>סכום</th>
                <th>אמצעי החזר</th>
              </tr>
            </thead>
            <tbody>
              {paybacks.map((payback) => (
                <tr key={payback.id}>
                  <td>{payback.creditor_name}</td>
                  <td>₪{payback.amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</td>
                  <td>{payback.payback_method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
