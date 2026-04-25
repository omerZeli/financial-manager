import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface InvestmentDeposit {
  id: string
  user_id: string
  channel_id: string
  amount: number
  date: string
  depositor: string
  salary_id: string | null
  is_withdrawal: boolean
  created_at: string
}

interface InvestmentDepositsContextType {
  deposits: InvestmentDeposit[]
  loading: boolean
  fetchDeposits: () => Promise<void>
  addDeposit: (deposit: Pick<InvestmentDeposit, 'channel_id' | 'amount' | 'date' | 'depositor' | 'salary_id'>) => Promise<void>
  addWithdrawal: (withdrawal: Pick<InvestmentDeposit, 'channel_id' | 'amount' | 'date'>) => Promise<void>
  deleteDeposit: (id: string) => Promise<void>
  removeByChannelId: (channelId: string) => void
}

const InvestmentDepositsContext = createContext<InvestmentDepositsContextType | undefined>(undefined)

export function InvestmentDepositsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [deposits, setDeposits] = useState<InvestmentDeposit[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const fetchDeposits = useCallback(async () => {
    if (fetched || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('investment_deposits')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
    if (!error && data) {
      setDeposits(data)
    }
    setFetched(true)
    setLoading(false)
  }, [fetched, user])

  const addDeposit = async (deposit: Pick<InvestmentDeposit, 'channel_id' | 'amount' | 'date' | 'depositor' | 'salary_id'>) => {
    if (!user) return
    const { data, error } = await supabase
      .from('investment_deposits')
      .insert({ ...deposit, user_id: user.id })
      .select()
      .single()
    if (!error && data) {
      setDeposits(prev => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
    }
  }

  const addWithdrawal = async (withdrawal: Pick<InvestmentDeposit, 'channel_id' | 'amount' | 'date'>) => {
    if (!user) return
    const { data, error } = await supabase
      .from('investment_deposits')
      .insert({ ...withdrawal, depositor: 'אני', salary_id: null, is_withdrawal: true, user_id: user.id })
      .select()
      .single()
    if (!error && data) {
      setDeposits(prev => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
    }
  }

  const deleteDeposit = async (id: string) => {
    const { error } = await supabase.from('investment_deposits').delete().eq('id', id)
    if (!error) {
      setDeposits(prev => prev.filter(d => d.id !== id))
    }
  }

  const removeByChannelId = (channelId: string) => {
    setDeposits(prev => prev.filter(d => d.channel_id !== channelId))
  }

  return (
    <InvestmentDepositsContext.Provider value={{ deposits, loading, fetchDeposits, addDeposit, addWithdrawal, deleteDeposit, removeByChannelId }}>
      {children}
    </InvestmentDepositsContext.Provider>
  )
}

export function useInvestmentDeposits() {
  const ctx = useContext(InvestmentDepositsContext)
  if (!ctx) throw new Error('useInvestmentDeposits must be used within InvestmentDepositsProvider')
  return ctx
}
