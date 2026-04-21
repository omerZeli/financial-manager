import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './CreditCardExpensesTable.css'

interface Expense {
  id: string
  title: string
  category: string
  expense_date: string
  amount: number
  isFixed?: boolean
}

interface FixedExpense {
  id: string
  name: string
  category: string
  start_date: string
  frequency_value: number
  frequency_unit: string
  has_end_date: boolean
  end_date: string | null
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

function inflateFixedExpenses(fixed: FixedExpense[]): Expense[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const result: Expense[] = []

  for (const fe of fixed) {
    const start = parseLocalDate(fe.start_date)
    const end = fe.has_end_date && fe.end_date
      ? parseLocalDate(fe.end_date)
      : null
    const limit = end && end < today ? end : today

    let current = new Date(start)
    let idx = 0

    while (current <= limit) {
      result.push({
        id: `${fe.id}_${idx}`,
        title: fe.name,
        category: fe.category,
        expense_date: formatLocalDate(current),
        amount: fe.amount,
        isFixed: true,
      })
      idx++
      current = addFrequency(start, fe.frequency_value * idx, fe.frequency_unit)
    }
  }

  return result
}

function addFrequency(base: Date, amount: number, unit: string): Date {
  const d = new Date(base)
  switch (unit) {
    case 'days':
      d.setDate(d.getDate() + amount)
      break
    case 'weeks':
      d.setDate(d.getDate() + amount * 7)
      break
    case 'months':
      d.setMonth(d.getMonth() + amount)
      break
    case 'years':
      d.setFullYear(d.getFullYear() + amount)
      break
  }
  return d
}

export function CreditCardExpensesTable() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    const [ccResult, fixedResult] = await Promise.all([
      supabase
        .from('credit_card_expenses')
        .select('id, title, category, expense_date, amount'),
      supabase
        .from('fixed_expenses')
        .select('id, name, category, start_date, frequency_value, frequency_unit, has_end_date, end_date, amount'),
    ])

    const ccExpenses: Expense[] = (ccResult.data ?? []).map((e: any) => ({
      ...e,
      isFixed: false,
    }))
    const inflated = inflateFixedExpenses(fixedResult.data ?? [])
    const all = [...ccExpenses, ...inflated].sort(
      (a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    )

    setExpenses(all)
    setLoading(false)
  }

  if (loading) {
    return <div className="data-card"><p>טוען...</p></div>
  }

  return (
    <div className="data-card">
      <h3>הוצאות כרטיס אשראי</h3>
      {expenses.length === 0 ? (
        <p className="data-empty">אין הוצאות עדיין</p>
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
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.title}</td>
                  <td>{expense.category}</td>
                  <td>{new Date(expense.expense_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  <td>₪{expense.amount.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
