import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface FixedExpense {
  id: string
  user_id: string
  name: string
  category: string
  amount: number
  day_of_month: number
  created_at: string
}

interface FixedExpensesContextType {
  fixedExpenses: FixedExpense[]
  loading: boolean
  fetchFixedExpenses: () => Promise<void>
  addFixedExpense: (expense: Pick<FixedExpense, 'name' | 'category' | 'amount' | 'day_of_month'>) => Promise<void>
  deleteFixedExpense: (id: string) => Promise<void>
}

const FixedExpensesContext = createContext<FixedExpensesContextType | undefined>(undefined)

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
      .order('day_of_month', { ascending: true })
    if (!error && data) {
      setFixedExpenses(data)
    }
    setFetched(true)
    setLoading(false)
  }, [fetched, user])

  const addFixedExpense = async (expense: Pick<FixedExpense, 'name' | 'category' | 'amount' | 'day_of_month'>) => {
    if (!user) return
    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert({ ...expense, user_id: user.id })
      .select()
      .single()
    if (!error && data) {
      setFixedExpenses(prev =>
        [...prev, data].sort((a, b) => a.day_of_month - b.day_of_month)
      )
    }
  }

  const deleteFixedExpense = async (id: string) => {
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id)
    if (!error) {
      setFixedExpenses(prev => prev.filter(e => e.id !== id))
    }
  }

  return (
    <FixedExpensesContext.Provider value={{ fixedExpenses, loading, fetchFixedExpenses, addFixedExpense, deleteFixedExpense }}>
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
