import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface ExpenseType {
  id: string
  user_id: string
  type_name: string
  categories: string[]
  created_at: string
}

interface ExpenseTypesContextType {
  expenseTypes: ExpenseType[]
  loading: boolean
  fetchExpenseTypes: () => Promise<void>
  addExpenseType: (typeName: string, categories: string[]) => Promise<void>
  updateExpenseType: (id: string, categories: string[]) => Promise<void>
  deleteExpenseType: (id: string) => Promise<void>
}

const ExpenseTypesContext = createContext<ExpenseTypesContextType | undefined>(undefined)

export function ExpenseTypesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const fetchExpenseTypes = useCallback(async () => {
    if (fetched || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('expense_types')
      .select('*')
      .eq('user_id', user.id)
      .order('type_name')
    if (!error && data) {
      setExpenseTypes(data)
    }
    setFetched(true)
    setLoading(false)
  }, [fetched, user])

  const addExpenseType = async (typeName: string, categories: string[]) => {
    if (!user) return
    const { data, error } = await supabase
      .from('expense_types')
      .insert({ user_id: user.id, type_name: typeName, categories })
      .select()
      .single()
    if (!error && data) {
      setExpenseTypes(prev => [...prev, data].sort((a, b) => a.type_name.localeCompare(b.type_name)))
    }
  }

  const updateExpenseType = async (id: string, categories: string[]) => {
    const { data, error } = await supabase
      .from('expense_types')
      .update({ categories })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setExpenseTypes(prev => prev.map(et => et.id === id ? data : et))
    }
  }

  const deleteExpenseType = async (id: string) => {
    const { error } = await supabase.from('expense_types').delete().eq('id', id)
    if (!error) {
      setExpenseTypes(prev => prev.filter(et => et.id !== id))
    }
  }

  return (
    <ExpenseTypesContext.Provider value={{ expenseTypes, loading, fetchExpenseTypes, addExpenseType, updateExpenseType, deleteExpenseType }}>
      {children}
    </ExpenseTypesContext.Provider>
  )
}

export function useExpenseTypes() {
  const ctx = useContext(ExpenseTypesContext)
  if (!ctx) throw new Error('useExpenseTypes must be used within ExpenseTypesProvider')
  return ctx
}
