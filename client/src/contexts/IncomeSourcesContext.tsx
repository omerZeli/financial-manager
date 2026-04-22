import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface IncomeSource {
  id: string
  name: string
  type: 'employed' | 'self_employed'
  latest_salary_month: string | null
}

interface IncomeSourcesContextType {
  sources: IncomeSource[]
  loading: boolean
  error: string
  addSource: (source: IncomeSource) => void
  deleteSource: (id: string) => Promise<boolean>
  updateLatestMonth: (sourceId: string, month: string) => void
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

      const { data: sourcesData, error: sourcesError } = await supabase
        .from('income_sources')
        .select('id, name, type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (sourcesError) {
        setError('שגיאה בטעינת מקורות הכנסה')
        setFetched(true)
        setLoading(false)
        return
      }

      const items: IncomeSource[] = sourcesData ?? []

      if (items.length > 0) {
        // Fetch latest salary month per source in one query
        const { data: latestData } = await supabase
          .from('salaries')
          .select('income_source_id, month')
          .eq('user_id', user.id)
          .order('month', { ascending: false })

        if (latestData) {
          const latestMap = new Map<string, string>()
          for (const row of latestData) {
            if (!latestMap.has(row.income_source_id)) {
              latestMap.set(row.income_source_id, row.month)
            }
          }
          for (const item of items) {
            item.latest_salary_month = latestMap.get(item.id) ?? null
          }
        }
      }

      setSources(items)
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

  const updateLatestMonth = useCallback((sourceId: string, month: string) => {
    setSources((prev) =>
      prev.map((s) => {
        if (s.id !== sourceId) return s
        if (!s.latest_salary_month || month > s.latest_salary_month) {
          return { ...s, latest_salary_month: month }
        }
        return s
      })
    )
  }, [])

  return (
    <IncomeSourcesContext.Provider value={{ sources, loading, error, addSource, deleteSource, updateLatestMonth }}>
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
