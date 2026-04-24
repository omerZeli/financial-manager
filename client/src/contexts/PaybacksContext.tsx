import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface Payback {
  id: string
  user_id: string
  direction: 'by_me' | 'to_me'
  name: string | null
  category: string | null
  amount: number
  date: string
  person: string
  expense_id: string | null
  created_at: string
}

interface PaybacksContextType {
  paybacks: Payback[]
  loading: boolean
  fetchPaybacks: () => Promise<void>
  addPayback: (payback: Omit<Payback, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  deletePayback: (id: string) => Promise<void>
  removeByExpenseId: (expenseId: string) => void
}

const PaybacksContext = createContext<PaybacksContextType | undefined>(undefined)

export function PaybacksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [paybacks, setPaybacks] = useState<Payback[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const fetchPaybacks = useCallback(async () => {
    if (fetched || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('paybacks')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
    if (!error && data) {
      setPaybacks(data)
    }
    setFetched(true)
    setLoading(false)
  }, [fetched, user])

  const addPayback = async (payback: Omit<Payback, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return
    const { data, error } = await supabase
      .from('paybacks')
      .insert({ ...payback, user_id: user.id })
      .select()
      .single()
    if (!error && data) {
      setPaybacks(prev => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
    }
  }

  const deletePayback = async (id: string) => {
    const { error } = await supabase.from('paybacks').delete().eq('id', id)
    if (!error) {
      setPaybacks(prev => prev.filter(p => p.id !== id))
    }
  }

  const removeByExpenseId = (expenseId: string) => {
    setPaybacks(prev => prev.filter(p => p.expense_id !== expenseId))
  }

  return (
    <PaybacksContext.Provider value={{ paybacks, loading, fetchPaybacks, addPayback, deletePayback, removeByExpenseId }}>
      {children}
    </PaybacksContext.Provider>
  )
}

export function usePaybacks() {
  const context = useContext(PaybacksContext)
  if (!context) {
    throw new Error('usePaybacks must be used within a PaybacksProvider')
  }
  return context
}
