import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { type SortDir, type ColumnDef, type FilterState } from '../../hooks/useTableControls'
import { FilterMultiSelect } from './FilterMultiSelect'
import { NumberInput } from './NumberInput'
import DateInput from './DatePicker'
import './TableControls.css'

interface SortableThProps {
  label: string
  colKey: string
  sortKey: string
  sortDir: SortDir
  onSort: (key: string) => void
  className?: string
}

export function SortableTh({ label, colKey, sortKey, sortDir, onSort, className }: SortableThProps) {
  const active = sortKey === colKey
  return (
    <th className={`sortable-th${active ? ' active' : ''}${className ? ' ' + className : ''}`} onClick={() => onSort(colKey)}>
      <span className="sortable-th-content">
        {label}
        <span className="sort-icon">
          {active ? (
            sortDir === 'asc' ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
            )
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></svg>
          )}
        </span>
      </span>
    </th>
  )
}

/* ── Per-column filter header ── */

interface ColumnHeaderProps {
  col: ColumnDef
  sortKey: string
  sortDir: SortDir
  onSort: (key: string) => void
  filters: FilterState
  stringOptions: string[]
  onStringFilter: (key: string, values: string[]) => void
  onNumberFilter: (key: string, min: string, max: string) => void
  onDateFilter: (key: string, from: string, to: string) => void
  className?: string
}

export function ColumnHeader({
  col,
  sortKey,
  sortDir,
  onSort,
  filters,
  stringOptions,
  onStringFilter,
  onNumberFilter,
  onDateFilter,
  className,
}: ColumnHeaderProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const label = col.label || col.key
  const sortActive = sortKey === col.key

  // Determine if this column has an active filter
  let hasFilter = false
  if (col.type === 'string') {
    const sel = filters.stringFilters[col.key]
    if (sel && sel.length > 0) hasFilter = true
  } else if (col.type === 'number') {
    const range = filters.numberFilters[col.key]
    if (range && (range.min || range.max)) hasFilter = true
  } else if (col.type === 'date') {
    const range = filters.dateFilters[col.key]
    if (range && (range.from || range.to)) hasFilter = true
  }

  // Popover position state
  const [pos, setPos] = useState({ top: 0, right: 0 })

  const updatePos = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePos()
    window.addEventListener('resize', updatePos)
    window.addEventListener('scroll', updatePos, true)
    return () => {
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('scroll', updatePos, true)
    }
  }, [open, updatePos])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (btnRef.current && btnRef.current.contains(target)) return
      if (popoverRef.current && popoverRef.current.contains(target)) return
      const dpDropdown = (target as Element).closest?.('.date-picker-dropdown')
      if (dpDropdown) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const popover = open && createPortal(
    <div
      ref={popoverRef}
      className="col-filter-popover"
      style={{ position: 'fixed', top: pos.top, right: pos.right }}
      onClick={(e) => e.stopPropagation()}
    >
      {col.type === 'string' && (() => {
        const opts = stringOptions.map(v => ({ value: v, label: v }))
        const selected = filters.stringFilters[col.key] || []
        return (
          <FilterMultiSelect
            options={opts}
            value={selected}
            placeholder={label}
            onChange={(vals) => onStringFilter(col.key, vals)}
          />
        )
      })()}
      {col.type === 'number' && (() => {
        const range = filters.numberFilters[col.key] || { min: '', max: '' }
        return (
          <div className="col-filter-range">
            <NumberInput placeholder="מינימום" value={range.min} onChange={(v) => onNumberFilter(col.key, v, range.max)} />
            <span className="range-sep">-</span>
            <NumberInput placeholder="מקסימום" value={range.max} onChange={(v) => onNumberFilter(col.key, range.min, v)} />
          </div>
        )
      })()}
      {col.type === 'date' && (() => {
        const range = filters.dateFilters[col.key] || { from: '', to: '' }
        return (
          <div className="col-filter-range">
            <DateInput value={range.from} onChange={(v) => onDateFilter(col.key, v, range.to)} placeholder="מתאריך" />
            <span className="range-sep">-</span>
            <DateInput value={range.to} onChange={(v) => onDateFilter(col.key, range.from, v)} placeholder="עד תאריך" />
          </div>
        )
      })()}
    </div>,
    document.body,
  )

  return (
    <th className={`col-header${sortActive ? ' active' : ''}${hasFilter ? ' has-col-filter' : ''}${className ? ' ' + className : ''}`}>
      <span className="sortable-th-content">
        <span className="col-header-sort" onClick={() => onSort(col.key)}>{label}</span>
        <span className="col-header-icons">
          <span className="sort-icon" onClick={() => onSort(col.key)}>
            {sortActive ? (
              sortDir === 'asc' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
              )
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></svg>
            )}
          </span>
          <button
            ref={btnRef}
            type="button"
            className={`col-filter-btn${open ? ' open' : ''}${hasFilter ? ' has-filter' : ''}`}
            onClick={(e) => { e.stopPropagation(); setOpen(prev => !prev) }}
            title="סינון"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
        </span>
      </span>
      {popover}
    </th>
  )
}

/* ── Active filters bar ── */

interface ActiveFiltersBarProps {
  columns: ColumnDef[]
  filters: FilterState
  onStringFilter: (key: string, values: string[]) => void
  onNumberFilter: (key: string, min: string, max: string) => void
  onDateFilter: (key: string, from: string, to: string) => void
  onClear: () => void
  hasActive: boolean
}

export function ActiveFiltersBar({
  columns,
  filters,
  onStringFilter,
  onNumberFilter,
  onDateFilter,
  onClear,
  hasActive,
}: ActiveFiltersBarProps) {
  if (!hasActive) return null

  const chips: { key: string; label: string; text: string }[] = []

  for (const col of columns) {
    const colLabel = col.label || col.key
    if (col.type === 'string') {
      const sel = filters.stringFilters[col.key]
      if (sel && sel.length > 0) {
        const text = sel.length === 1 ? sel[0] : `${sel.length} נבחרו`
        chips.push({ key: col.key, label: colLabel, text })
      }
    } else if (col.type === 'number') {
      const range = filters.numberFilters[col.key]
      if (range && (range.min || range.max)) {
        const parts: string[] = []
        if (range.min) parts.push(`מ-${Number(range.min).toLocaleString()}`)
        if (range.max) parts.push(`עד ${Number(range.max).toLocaleString()}`)
        chips.push({ key: col.key, label: colLabel, text: parts.join(' ') })
      }
    } else if (col.type === 'date') {
      const range = filters.dateFilters[col.key]
      if (range && (range.from || range.to)) {
        const fmt = (d: string) => {
          if (!d) return ''
          const [y, m, day] = d.split('-')
          return `${day}/${m}/${y}`
        }
        const parts: string[] = []
        if (range.from) parts.push(`מ-${fmt(range.from)}`)
        if (range.to) parts.push(`עד ${fmt(range.to)}`)
        chips.push({ key: col.key, label: colLabel, text: parts.join(' ') })
      }
    }
  }

  const removeChip = (key: string) => {
    const col = columns.find(c => c.key === key)
    if (!col) return
    if (col.type === 'string') onStringFilter(key, [])
    else if (col.type === 'number') onNumberFilter(key, '', '')
    else if (col.type === 'date') onDateFilter(key, '', '')
  }

  return (
    <div className="active-filters-bar">
      <span className="active-filters-label">סינון פעיל:</span>
      {chips.map(chip => (
        <span key={chip.key} className="active-filter-chip">
          <span className="chip-label">{chip.label}:</span> {chip.text}
          <button type="button" className="chip-remove" onClick={() => removeChip(chip.key)} title="הסר סינון">×</button>
        </span>
      ))}
      <button type="button" className="active-filters-clear" onClick={onClear}>נקה הכל</button>
    </div>
  )
}

/* ── Legacy FilterPopover (kept for chart pages) ── */

interface FilterPopoverProps {
  columns: ColumnDef[]
  filters: FilterState
  stringOptions: Record<string, string[]>
  onStringFilter: (key: string, values: string[]) => void
  onNumberFilter: (key: string, min: string, max: string) => void
  onDateFilter: (key: string, from: string, to: string) => void
  onClear: () => void
  hasActive: boolean
}

export function FilterPopover({
  columns,
  filters,
  stringOptions,
  onStringFilter,
  onNumberFilter,
  onDateFilter,
  onClear,
  hasActive,
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current && !ref.current.contains(target)) {
        const dpDropdown = (target as Element).closest?.('.date-picker-dropdown')
        if (dpDropdown) return
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="filter-popover-wrap" ref={ref}>
      <button
        type="button"
        className={`filter-toggle-btn${open ? ' active' : ''}${hasActive ? ' has-filters' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        title="סינון"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      </button>

      {open && (
        <div className="filter-popover">
          <div className="filter-popover-header">
            <span className="filter-popover-title">סינון</span>
            {hasActive && (
              <button type="button" className="filter-popover-clear" onClick={onClear}>נקה הכל</button>
            )}
          </div>
          <div className="filter-popover-fields">
            {columns.map(col => {
              const label = col.label || col.key
              if (col.type === 'string') {
                const opts = (stringOptions[col.key] || []).map(v => ({ value: v, label: v }))
                const selected = filters.stringFilters[col.key] || []
                return (
                  <div className="filter-popover-field" key={col.key}>
                    <div className="filter-popover-label">{label}</div>
                    <FilterMultiSelect
                      options={opts}
                      value={selected}
                      placeholder={label}
                      onChange={(vals) => onStringFilter(col.key, vals)}
                    />
                  </div>
                )
              }
              if (col.type === 'number') {
                const range = filters.numberFilters[col.key] || { min: '', max: '' }
                return (
                  <div className="filter-popover-field" key={col.key}>
                    <div className="filter-popover-label">{label}</div>
                    <div className="filter-popover-range">
                      <NumberInput placeholder="מינימום" value={range.min} onChange={(v) => onNumberFilter(col.key, v, range.max)} />
                      <span className="range-sep">-</span>
                      <NumberInput placeholder="מקסימום" value={range.max} onChange={(v) => onNumberFilter(col.key, range.min, v)} />
                    </div>
                  </div>
                )
              }
              if (col.type === 'date') {
                const range = filters.dateFilters[col.key] || { from: '', to: '' }
                return (
                  <div className="filter-popover-field" key={col.key}>
                    <div className="filter-popover-label">{label}</div>
                    <div className="filter-popover-range">
                      <DateInput value={range.from} onChange={(v) => onDateFilter(col.key, v, range.to)} placeholder="מתאריך" />
                      <span className="range-sep">-</span>
                      <DateInput value={range.to} onChange={(v) => onDateFilter(col.key, range.from, v)} placeholder="עד תאריך" />
                    </div>
                  </div>
                )
              }
              return null
            })}
          </div>
        </div>
      )}
    </div>
  )
}
