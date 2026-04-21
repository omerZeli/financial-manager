import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './CreditCardExpensesTable.css'

interface CarExpense {
  id: string
  name: string
  category: string
  amount: number
  is_fixed: boolean
  start_date: string | null
  frequency_value: number | null
  frequency_unit: string | null
  has_end_date: boolean
  end_date: string | null
  created_at: string
}

interface Row {
  id: string
  name: string
  category: string
  date: string
  amount: number
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addFrequency(base: Date, amount: number, unit: string): Date {
  const d = new Date(base)
  switch (unit) {
    case 'days': d.setDate(d.getDate() + amount); break
    case 'weeks': d.setDate(d.getDate() + amount * 7); break
    case 'months': d.setMonth(d.getMonth() + amount); break
    case 'years': d.setFullYear(d.getFullYear() + amount); break
  }
  return d
}

function inflateFixed(expenses: CarExpense[]): Row[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const result: Row[] = []

  for (const ce of expenses) {
    if (!ce.is_fixed || !ce.start_date || !ce.frequency_value || !ce.frequency_unit) continue
    const start = parseLocalDate(ce.start_date)
    const end = ce.has_end_date && ce.end_date ? parseLocalDate(ce.end_date) : null
    const limit = end && end < today ? end : today

    let current = new Date(start)
    let idx = 0
    while (current <= limit) {
      result.push({
        id: `${ce.id}_${idx}`,
        name: ce.name,
        category: ce.category,
        date: formatLocalDate(current),
        amount: ce.amount,
      })
      idx++
      current = addFrequency(start, ce.frequency_value * idx, ce.frequency_unit)
    }
  }
  return result
}

export function CarExpensesTable() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data } = await supabase
      .from('car_expenses')
      .select('*')

    if (!data) { setLoading(false); return }

    const oneTime: Row[] = data
      .filter((e: CarExpense) => !e.is_fixed)
      .map((e: CarExpense) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        date: e.created_at.split('T')[0],
        amount: e.amount,
      }))

    const fixed = inflateFixed(data as CarExpense[])
    const all = [...oneTime, ...fixed].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    setRows(all)
    setLoading(false)
  }

  if (loading) return <div className="data-card"><p>טוען...</p></div>

  return (
    <div className="data-card">
      <h3>הוצאות רכב</h3>
      {rows.length === 0 ? (
        <p className="data-empty">אין הוצאות רכב עדיין</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>שם ההוצאה</th>
                <th>קטגוריה</th>
                <th>תאריך</th>
                <th>סכום</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.category}</td>
                  <td>{new Date(row.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  <td>₪{row.amount.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
