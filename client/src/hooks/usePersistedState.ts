import { useState, useEffect, useRef, useCallback } from 'react'
import { useFilters } from '../contexts/FiltersContext'

/**
 * A useState-like hook that persists the value in the session-level FiltersContext.
 * When the component remounts (e.g. user navigates away and back), the last stored
 * value is used as the initial state instead of `defaultValue`.
 * Resets on page refresh or re-login (since the context is just React state).
 */
export function usePersistedState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const { get, set } = useFilters()

  const persisted = get<T>(key)
  const [state, setState] = useState<T>(persisted !== undefined ? persisted : defaultValue)

  const keyRef = useRef(key)
  keyRef.current = key

  useEffect(() => {
    set<T>(keyRef.current, state)
  }, [state, set])

  const setPersistedState = useCallback((value: T | ((prev: T) => T)) => {
    setState(value)
  }, [])

  return [state, setPersistedState]
}
