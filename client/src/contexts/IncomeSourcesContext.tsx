import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface IncomeSource {
  id: string
  name: string
  type: 'employed' | 'self_employed'
}

interface IncomeSourcesContextType {
  sources: IncomeSource[]
  loading: boolean
  error: string
  addSource: (source: IncomeSource) => void
  deleteSource: (id: string) => Promise<boolean>
}

const IncomeSourcesContext = createContext<IncomeSourcesContextType | undefined>(undefined)

export function IncomeSourcesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    if (!user) {
      setSources([])
      setFetched(false)
      setLoading(false)
      return
    }

    if (fetched) return

    const fetchSources = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('income_sources')
        .select('id, name, type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) {
        setError('שגיאה בטעינת מקורות הכנסה')
      } else {
        setSources(data ?? [])
      }
      setFetched(true)
      setLoading(false)
    }

    fetchSources()
  }, [user, fetched])

  const addSource = useCallback((source: IncomeSource) => {
    setSources((prev) => [...prev, source])
  }, [])

  const deleteSource = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('income_sources')
      .delete()
      .eq('id', id)

    if (error) {
      setError('שגיאה במחיקת מקור הכנסה')
      return false
    }

    setSources((prev) => prev.filter((s) => s.id !== id))
    return true
  }, [])

  return (
    <IncomeSourcesContext.Provider value={{ sources, loading, error, addSource, deleteSource }}>
      {children}
    </IncomeSourcesContext.Provider>
  )
}

export function useIncomeSources() {
  const context = useContext(IncomeSourcesContext)
  if (context === undefined) {
    throw new Error('useIncomeSources must be used within an IncomeSourcesProvider')
  }
  return context
}
