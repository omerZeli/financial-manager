import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { inflateFixedExpense } from '@financial-manager/shared'
import { useAuth } from './AuthContext'
import type { Expense, FixedExpense } from '@financial-manager/shared'

export type { FixedExpense }

interface FixedExpensesContextType {
  fixedExpenses: FixedExpense[]
  inflatedExpenses: Expense[]
  loading: boolean
  fetchFixedExpenses: () => Promise<void>
  addFixedExpense: (expense: Pick<FixedExpense, 'name' | 'category' | 'amount' | 'start_date' | 'end_date' | 'salary_employer'>) => Promise<void>
  updateFixedExpense: (id: string, fields: Partial<Pick<FixedExpense, 'name' | 'category' | 'amount' | 'start_date' | 'end_date'>>) => Promise<void>
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
      .order('start_date', { ascending: false })
    if (!error && data) {
      setFixedExpenses(data)
    }
    setFetched(true)
    setLoading(false)
  }, [fetched, user])

  const addFixedExpense = async (expense: Pick<FixedExpense, 'name' | 'category' | 'amount' | 'start_date' | 'end_date' | 'salary_employer'>) => {
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
    () => fixedExpenses.flatMap(fe => inflateFixedExpense(fe)),
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
