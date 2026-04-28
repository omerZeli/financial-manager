import { useState, useMemo, useCallback } from 'react'

export type SortDir = 'asc' | 'desc'
export type ColumnType = 'string' | 'number' | 'date'

export interface ColumnDef {
  key: string
  type: ColumnType
  label?: string
}

export interface FilterState {
  // string columns: selected values (empty = no filter)
  stringFilters: Record<string, string[]>
  // number columns: [min, max] (empty string = no bound)
  numberFilters: Record<string, { min: string; max: string }>
  // date columns: [from, to] (empty string = no bound)
  dateFilters: Record<string, { from: string; to: string }>
}

export function useTableControls<T>(
  data: T[],
  columns: ColumnDef[],
  defaultSortKey: string,
  defaultSortDir: SortDir = 'desc',
  getValue: (item: T, key: string) => string | number | null,
) {
  const [sortKey, setSortKey] = useState(defaultSortKey)
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir)
  const [filters, setFilters] = useState<FilterState>({
    stringFilters: {},
    numberFilters: {},
    dateFilters: {},
  })

  const toggleSort = useCallback((key: string) => {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }, [sortKey])

  const setStringFilter = useCallback((key: string, values: string[]) => {
    setFilters(prev => ({
      ...prev,
      stringFilters: { ...prev.stringFilters, [key]: values },
    }))
  }, [])

  const setNumberFilter = useCallback((key: string, min: string, max: string) => {
    setFilters(prev => ({
      ...prev,
      numberFilters: { ...prev.numberFilters, [key]: { min, max } },
    }))
  }, [])

  const setDateFilter = useCallback((key: string, from: string, to: string) => {
    setFilters(prev => ({
      ...prev,
      dateFilters: { ...prev.dateFilters, [key]: { from, to } },
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({ stringFilters: {}, numberFilters: {}, dateFilters: {} })
  }, [])

  const hasActiveFilters = useMemo(() => {
    for (const vals of Object.values(filters.stringFilters)) {
      if (vals.length > 0) return true
    }
    for (const { min, max } of Object.values(filters.numberFilters)) {
      if (min || max) return true
    }
    for (const { from, to } of Object.values(filters.dateFilters)) {
      if (from || to) return true
    }
    return false
  }, [filters])

  // Unique string values per column (for filter dropdowns)
  const stringOptions = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const col of columns) {
      if (col.type === 'string') {
        const set = new Set<string>()
        for (const item of data) {
          const v = getValue(item, col.key)
          if (v != null && v !== '') set.add(String(v))
        }
        map[col.key] = Array.from(set).sort((a, b) => a.localeCompare(b))
      }
    }
    return map
  }, [data, columns, getValue])

  const processed = useMemo(() => {
    // Filter
    let result = data.filter(item => {
      for (const col of columns) {
        const v = getValue(item, col.key)
        if (col.type === 'string') {
          const selected = filters.stringFilters[col.key]
          if (selected && selected.length > 0) {
            if (!selected.includes(String(v ?? ''))) return false
          }
        } else if (col.type === 'number') {
          const range = filters.numberFilters[col.key]
          if (range) {
            const num = Number(v)
            if (range.min && num < Number(range.min)) return false
            if (range.max && num > Number(range.max)) return false
          }
        } else if (col.type === 'date') {
          const range = filters.dateFilters[col.key]
          if (range) {
            const dateStr = String(v ?? '')
            if (range.from && dateStr < range.from) return false
            if (range.to && dateStr > range.to) return false
          }
        }
      }
      return true
    })

    // Sort
    result = [...result].sort((a, b) => {
      const col = columns.find(c => c.key === sortKey)
      const va = getValue(a, sortKey)
      const vb = getValue(b, sortKey)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1

      let cmp = 0
      if (col?.type === 'number') {
        cmp = Number(va) - Number(vb)
      } else if (col?.type === 'date') {
        cmp = String(va).localeCompare(String(vb))
      } else {
        cmp = String(va).localeCompare(String(vb))
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [data, columns, filters, sortKey, sortDir, getValue])

  return {
    sortKey,
    sortDir,
    toggleSort,
    filters,
    setStringFilter,
    setNumberFilter,
    setDateFilter,
    clearFilters,
    hasActiveFilters,
    stringOptions,
    processed,
  }
}
