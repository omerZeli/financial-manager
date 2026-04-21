import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './CreditCardExpensesTable.css'

interface Expense {
  id: string
  title: string
  category: string
  expense_date: string
  amount: number
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

interface Insurance {
  id: string
  insurance_type: string
  insurance_company: string
  first_charge_date: string
  monthly_payment: number
  has_end_date: boolean
  end_date: string | null
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

function inflateInsurances(insurances: Insurance[]): Expense[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const result: Expense[] = []

  for (const ins of insurances) {
    const start = parseLocalDate(ins.first_charge_date)
    const end = ins.has_end_date && ins.end_date
      ? parseLocalDate(ins.end_date)
      : null
    const limit = end && end < today ? end : today

    let current = new Date(start)
    let idx = 0

    while (current <= limit) {
      result.push({
        id: `ins_${ins.id}_${idx}`,
        title: `${ins.insurance_type} – ${ins.insurance_company}`,
        category: 'ביטוח',
        expense_date: formatLocalDate(current),
        amount: ins.monthly_payment,
      })
      idx++
      current = new Date(start)
      current.setMonth(current.getMonth() + idx)
    }
  }

  return result
}

export function CreditCardExpensesTable() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    const [ccResult, fixedResult, insuranceResult, outgoingResult] = await Promise.all([
      supabase
        .from('credit_card_expenses')
        .select('id, title, category, expense_date, amount'),
      supabase
        .from('fixed_expenses')
        .select('id, name, category, start_date, frequency_value, frequency_unit, has_end_date, end_date, amount'),
      supabase
        .from('insurances')
        .select('id, insurance_type, insurance_company, first_charge_date, monthly_payment, has_end_date, end_date'),
      supabase
        .from('outgoing_paybacks')
        .select('id, creditor_name, reason, category, amount, payback_method, created_at'),
    ])

    const ccExpenses: Expense[] = (ccResult.data ?? []).map((e: any) => ({
      ...e,
    }))
    const inflatedFixed = inflateFixedExpenses(fixedResult.data ?? [])
    const inflatedInsurance = inflateInsurances(insuranceResult.data ?? [])
    const outgoingExpenses: Expense[] = (outgoingResult.data ?? []).map((p: any) => ({
      id: `outgoing_${p.id}`,
      title: p.reason || p.creditor_name,
      category: p.category || 'החזר למישהו אחר',
      expense_date: p.created_at.split('T')[0],
      amount: p.amount,
    }))
    const all = [...ccExpenses, ...inflatedFixed, ...inflatedInsurance, ...outgoingExpenses].sort(
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
