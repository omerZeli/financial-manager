import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface Expense {
  id: string
  user_id: string
  name: string
  category: string
  amount: number
  date: string
  created_at: string
}

interface ExpensesContextType {
  expenses: Expense[]
  loading: boolean
  fetchExpenses: () => Promise<void>
  addExpense: (expense: Pick<Expense, 'name' | 'category' | 'amount' | 'date'>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
}

const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined)

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const fetchExpenses = useCallback(async () => {
    if (fetched || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
    if (!error && data) {
      setExpenses(data)
    }
    setFetched(true)
    setLoading(false)
  }, [fetched, user])

  const addExpense = async (expense: Pick<Expense, 'name' | 'category' | 'amount' | 'date'>) => {
    if (!user) return
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...expense, user_id: user.id })
      .select()
      .single()
    if (!error && data) {
      setExpenses(prev => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
    }
  }

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (!error) {
      setExpenses(prev => prev.filter(e => e.id !== id))
    }
  }

  return (
    <ExpensesContext.Provider value={{ expenses, loading, fetchExpenses, addExpense, deleteExpense }}>
      {children}
    </ExpensesContext.Provider>
  )
}

export function useExpenses() {
  const context = useContext(ExpensesContext)
  if (!context) {
    throw new Error('useExpenses must be used within an ExpensesProvider')
  }
  return context
}
