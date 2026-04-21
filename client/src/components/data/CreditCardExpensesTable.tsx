import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './CreditCardExpensesTable.css'

interface Expense {
  id: string
  title: string
  category: string
  expense_date: string
  amount: number
  created_at: string
}

export function CreditCardExpensesTable() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from('credit_card_expenses')
      .select('*')
      .order('expense_date', { ascending: false })

    if (!error && data) {
      setExpenses(data)
    }
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
