import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface Salary {
  id: string
  user_id: string
  month: string
  bruto: number
  neto: number
  created_at: string
}

interface SalaryContextType {
  salaries: Salary[]
  loading: boolean
  fetchSalaries: () => Promise<void>
  addSalary: (salary: Pick<Salary, 'month' | 'bruto' | 'neto'>) => Promise<void>
  deleteSalary: (id: string) => Promise<void>
}

const SalaryContext = createContext<SalaryContextType | undefined>(undefined)

export function SalaryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [salaries, setSalaries] = useState<Salary[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const fetchSalaries = useCallback(async () => {
    if (fetched || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('salaries')
      .select('*')
      .eq('user_id', user.id)
      .order('month', { ascending: false })
    if (!error && data) {
      setSalaries(data)
    }
    setFetched(true)
    setLoading(false)
  }, [fetched, user])

  const addSalary = async (salary: Pick<Salary, 'month' | 'bruto' | 'neto'>) => {
    if (!user) return
    const { data, error } = await supabase
      .from('salaries')
      .insert({ ...salary, user_id: user.id })
      .select()
      .single()
    if (!error && data) {
      setSalaries(prev => [data, ...prev].sort((a, b) => b.month.localeCompare(a.month)))
    }
  }

  const deleteSalary = async (id: string) => {
    const { error } = await supabase.from('salaries').delete().eq('id', id)
    if (!error) {
      setSalaries(prev => prev.filter(s => s.id !== id))
    }
  }

  return (
    <SalaryContext.Provider value={{ salaries, loading, fetchSalaries, addSalary, deleteSalary }}>
      {children}
    </SalaryContext.Provider>
  )
}

export function useSalary() {
  const context = useContext(SalaryContext)
  if (!context) {
    throw new Error('useSalary must be used within a SalaryProvider')
  }
  return context
}
