import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './CreditCardExpensesTable.css'

interface Insurance {
  id: string
  insurance_type: string
  insurance_company: string
  first_charge_date: string
  monthly_payment: number
  has_end_date: boolean
  end_date: string | null
}

export function InsurancesTable() {
  const [insurances, setInsurances] = useState<Insurance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInsurances()
  }, [])

  const fetchInsurances = async () => {
    const { data, error } = await supabase
      .from('insurances')
      .select('*')
      .order('first_charge_date', { ascending: false })

    if (!error && data) {
      setInsurances(data)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="data-card"><p>טוען...</p></div>
  }

  return (
    <div className="data-card">
      <h3>ביטוחים</h3>
      {insurances.length === 0 ? (
        <p className="data-empty">אין ביטוחים עדיין</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>סוג ביטוח</th>
                <th>חברה</th>
                <th>תאריך התחלה</th>
                <th>תשלום חודשי</th>
                <th>תאריך סיום</th>
              </tr>
            </thead>
            <tbody>
              {insurances.map((ins) => (
                <tr key={ins.id}>
                  <td>{ins.insurance_type}</td>
                  <td>{ins.insurance_company}</td>
                  <td>{new Date(ins.first_charge_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  <td>₪{ins.monthly_payment.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</td>
                  <td>{ins.has_end_date && ins.end_date ? new Date(ins.end_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
