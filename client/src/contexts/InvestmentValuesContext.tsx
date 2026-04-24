import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface InvestmentValueUpdate {
  id: string
  user_id: string
  channel_id: string
  value: number
  date: string
  created_at: string
}

interface InvestmentValuesContextType {
  valueUpdates: InvestmentValueUpdate[]
  loading: boolean
  fetchValueUpdates: () => Promise<void>
  addValueUpdate: (update: Pick<InvestmentValueUpdate, 'channel_id' | 'value' | 'date'>) => Promise<void>
  updateValueUpdate: (id: string, updates: Pick<InvestmentValueUpdate, 'value' | 'date'>) => Promise<void>
  deleteValueUpdate: (id: string) => Promise<void>
  removeByChannelId: (channelId: string) => void
}

const InvestmentValuesContext = createContext<InvestmentValuesContextType | undefined>(undefined)

export function InvestmentValuesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [valueUpdates, setValueUpdates] = useState<InvestmentValueUpdate[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const fetchValueUpdates = useCallback(async () => {
    if (fetched || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('investment_value_updates')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
    if (!error && data) {
      setValueUpdates(data)
    }
    setFetched(true)
    setLoading(false)
  }, [fetched, user])

  const addValueUpdate = async (update: Pick<InvestmentValueUpdate, 'channel_id' | 'value' | 'date'>) => {
    if (!user) return
    const { data, error } = await supabase
      .from('investment_value_updates')
      .insert({ ...update, user_id: user.id })
      .select()
      .single()
    if (!error && data) {
      setValueUpdates(prev => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
    }
  }

  const updateValueUpdate = async (id: string, updates: Pick<InvestmentValueUpdate, 'value' | 'date'>) => {
    const { data, error } = await supabase
      .from('investment_value_updates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setValueUpdates(prev => prev.map(v => v.id === id ? data : v).sort((a, b) => b.date.localeCompare(a.date)))
    }
  }

  const deleteValueUpdate = async (id: string) => {
    const { error } = await supabase.from('investment_value_updates').delete().eq('id', id)
    if (!error) {
      setValueUpdates(prev => prev.filter(v => v.id !== id))
    }
  }

  const removeByChannelId = (channelId: string) => {
    setValueUpdates(prev => prev.filter(v => v.channel_id !== channelId))
  }

  return (
    <InvestmentValuesContext.Provider value={{ valueUpdates, loading, fetchValueUpdates, addValueUpdate, updateValueUpdate, deleteValueUpdate, removeByChannelId }}>
      {children}
    </InvestmentValuesContext.Provider>
  )
}

export function useInvestmentValues() {
  const ctx = useContext(InvestmentValuesContext)
  if (!ctx) throw new Error('useInvestmentValues must be used within InvestmentValuesProvider')
  return ctx
}
