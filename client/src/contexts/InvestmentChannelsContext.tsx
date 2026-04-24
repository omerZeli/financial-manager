import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface InvestmentChannel {
  id: string
  user_id: string
  name: string
  company: string
  investment_path: string
  is_pension: boolean
  created_at: string
}

interface InvestmentChannelsContextType {
  channels: InvestmentChannel[]
  loading: boolean
  fetchChannels: () => Promise<void>
  addChannel: (channel: Pick<InvestmentChannel, 'name' | 'company' | 'investment_path' | 'is_pension'>) => Promise<void>
  updateChannel: (id: string, updates: Partial<Pick<InvestmentChannel, 'name' | 'company' | 'investment_path' | 'is_pension'>>) => Promise<void>
  deleteChannel: (id: string) => Promise<void>
}

const InvestmentChannelsContext = createContext<InvestmentChannelsContextType | undefined>(undefined)

export function InvestmentChannelsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [channels, setChannels] = useState<InvestmentChannel[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const fetchChannels = useCallback(async () => {
    if (fetched || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('investment_channels')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error && data) {
      setChannels(data)
    }
    setFetched(true)
    setLoading(false)
  }, [fetched, user])

  const addChannel = async (channel: Pick<InvestmentChannel, 'name' | 'company' | 'investment_path' | 'is_pension'>) => {
    if (!user) return
    const { data, error } = await supabase
      .from('investment_channels')
      .insert({ ...channel, user_id: user.id })
      .select()
      .single()
    if (!error && data) {
      setChannels(prev => [data, ...prev])
    }
  }

  const updateChannel = async (id: string, updates: Partial<Pick<InvestmentChannel, 'name' | 'company' | 'investment_path' | 'is_pension'>>) => {
    const { data, error } = await supabase
      .from('investment_channels')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setChannels(prev => prev.map(c => c.id === id ? data : c))
    }
  }

  const deleteChannel = async (id: string) => {
    const { error } = await supabase.from('investment_channels').delete().eq('id', id)
    if (!error) {
      setChannels(prev => prev.filter(c => c.id !== id))
    }
  }

  return (
    <InvestmentChannelsContext.Provider value={{ channels, loading, fetchChannels, addChannel, updateChannel, deleteChannel }}>
      {children}
    </InvestmentChannelsContext.Provider>
  )
}

export function useInvestmentChannels() {
  const ctx = useContext(InvestmentChannelsContext)
  if (!ctx) throw new Error('useInvestmentChannels must be used within InvestmentChannelsProvider')
  return ctx
}
