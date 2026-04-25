import { useState, useRef, useEffect } from 'react'
import './FilterMultiSelect.css'

interface Option {
  value: string
  label: string
}

interface FilterMultiSelectProps {
  options: Option[]
  value: string[]
  placeholder: string
  onChange: (value: string[]) => void
}

export function FilterMultiSelect({ options, value, placeholder, onChange }: FilterMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = search
    ? options.filter(o => o.label.includes(search))
    : options

  const allSelected = options.length > 0 && value.length === options.length

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  const toggle = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter(v => v !== val))
    } else {
      onChange([...value, val])
    }
  }

  const selectAll = () => onChange(options.map(o => o.value))
  const clearAll = () => onChange([])

  const triggerLabel = allSelected || value.length === 0
    ? placeholder
    : value.length === 1
      ? options.find(o => o.value === value[0])?.label || value[0]
      : `${value.length} נבחרו`

  return (
    <div className={`filter-multi-select${open ? ' open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`filter-multi-trigger${allSelected || value.length === 0 ? ' placeholder' : ''}`}
        onClick={() => setOpen(prev => !prev)}
      >
        <span className="filter-multi-trigger-text">{triggerLabel}</span>
        <svg className="filter-multi-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="filter-multi-menu">
          <div className="filter-multi-actions">
            <button type="button" className="filter-multi-action-btn" onClick={selectAll}>בחר הכל</button>
            <button type="button" className="filter-multi-action-btn" onClick={clearAll}>נקה הכל</button>
          </div>
          {options.length > 5 && (
            <div className="filter-multi-search">
              <input
                ref={searchRef}
                type="text"
                placeholder="חיפוש..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}
          <div className="filter-multi-options">
            {filtered.map(opt => (
              <div
                key={opt.value}
                className={`filter-multi-item${value.includes(opt.value) ? ' selected' : ''}`}
                onClick={() => toggle(opt.value)}
              >
                <span className="filter-multi-check">
                  {value.includes(opt.value) && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span>{opt.label}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="filter-multi-empty">אין תוצאות</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
