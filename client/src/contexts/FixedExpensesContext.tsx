import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { Expense } from './ExpensesContext'

export interface FixedExpense {
  id: string
  user_id: string
  name: string
  category: string
  amount: number
  start_date: string
  end_date: string | null
  created_at: string
}

interface FixedExpensesContextType {
  fixedExpenses: FixedExpense[]
  inflatedExpenses: Expense[]
  loading: boolean
  fetchFixedExpenses: () => Promise<void>
  addFixedExpense: (expense: Pick<FixedExpense, 'name' | 'category' | 'amount' | 'start_date' | 'end_date'>) => Promise<void>
  updateFixedExpense: (id: string, fields: Partial<Pick<FixedExpense, 'name' | 'category' | 'amount' | 'start_date' | 'end_date'>>) => Promise<void>
  deleteFixedExpense: (id: string) => Promise<void>
}

const FixedExpensesContext = createContext<FixedExpensesContextType | undefined>(undefined)

/** Generate one virtual expense per month from start_date to min(end_date, today) */
function inflateFixed(fe: FixedExpense): Expense[] {
  const results: Expense[] = []
  const start = new Date(fe.start_date + 'T00:00:00')
  const todayStr = new Date().toISOString().slice(0, 10)
  const limitStr = fe.end_date && fe.end_date < todayStr ? fe.end_date : todayStr
  const limit = new Date(limitStr + 'T00:00:00')

  const day = start.getDate()
  let cursor = new Date(start)

  while (cursor <= limit) {
    const yyyy = cursor.getFullYear()
    const mm = String(cursor.getMonth() + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd}`

    results.push({
      id: `${fe.id}_${dateStr}`,
      user_id: fe.user_id,
      name: fe.name,
      category: fe.category,
      amount: fe.amount,
      date: dateStr,
      created_at: fe.created_at,
    })

    // advance to next month
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return results
}

export function FixedExpensesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const fetchFixedExpenses = useCallback(async () => {
    if (fetched || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false })
    if (!error && data) {
      setFixedExpenses(data)
    }
    setFetched(true)
    setLoading(false)
  }, [fetched, user])

  const addFixedExpense = async (expense: Pick<FixedExpense, 'name' | 'category' | 'amount' | 'start_date' | 'end_date'>) => {
    if (!user) return
    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert({ ...expense, user_id: user.id })
      .select()
      .single()
    if (!error && data) {
      setFixedExpenses(prev =>
        [...prev, data].sort((a, b) => b.start_date.localeCompare(a.start_date))
      )
    }
  }

  const updateFixedExpense = async (id: string, fields: Partial<Pick<FixedExpense, 'name' | 'category' | 'amount' | 'start_date' | 'end_date'>>) => {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setFixedExpenses(prev =>
        prev.map(e => e.id === id ? data : e).sort((a, b) => b.start_date.localeCompare(a.start_date))
      )
    }
  }

  const deleteFixedExpense = async (id: string) => {
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id)
    if (!error) {
      setFixedExpenses(prev => prev.filter(e => e.id !== id))
    }
  }

  const inflatedExpenses = useMemo(
    () => fixedExpenses.flatMap(inflateFixed),
    [fixedExpenses]
  )

  return (
    <FixedExpensesContext.Provider value={{ fixedExpenses, inflatedExpenses, loading, fetchFixedExpenses, addFixedExpense, updateFixedExpense, deleteFixedExpense }}>
      {children}
    </FixedExpensesContext.Provider>
  )
}

export function useFixedExpenses() {
  const context = useContext(FixedExpensesContext)
  if (!context) {
    throw new Error('useFixedExpenses must be used within a FixedExpensesProvider')
  }
  return context
}
