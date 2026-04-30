import { useState, useRef, useEffect } from 'react'
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
      if (ref.current && !ref.current.contains(e.target as Node)) {
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
