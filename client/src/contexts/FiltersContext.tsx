import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

/**
 * Session-level filter persistence context.
 * Stores arbitrary filter state keyed by page/section identifier.
 * Persists across navigation but resets on page refresh or re-login
 * (since it's just React state inside the protected route layout).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FilterStore = Record<string, any>

interface FiltersContextValue {
  get: <T>(key: string) => T | undefined
  set: <T>(key: string, value: T) => void
}

const FiltersContext = createContext<FiltersContextValue | null>(null)

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<FilterStore>({})

  const get = useCallback(<T,>(key: string): T | undefined => {
    return store[key] as T | undefined
  }, [store])

  const set = useCallback(<T,>(key: string, value: T) => {
    setStore(prev => ({ ...prev, [key]: value }))
  }, [])

  return (
    <FiltersContext.Provider value={{ get, set }}>
      {children}
    </FiltersContext.Provider>
  )
}

export function useFilters() {
  const ctx = useContext(FiltersContext)
  if (!ctx) throw new Error('useFilters must be used within FiltersProvider')
  return ctx
}
