import { useState, useRef, useEffect } from 'react'
import './CustomSelect.css'

interface Option {
  value: string
  label: string
}

interface ReadOnlySelectProps {
  options: Option[]
  value: string
  placeholder: string
  onChange: (value: string) => void
}

export function ReadOnlySelect({ options, value, placeholder, onChange }: ReadOnlySelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)
  const filtered = search
    ? options.filter((o) => o.label.includes(search))
    : options

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

  return (
    <div className={`custom-select${open ? ' open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`custom-select-trigger${selected ? '' : ' placeholder'}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <svg className="custom-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="custom-select-menu">
          {options.length > 0 && (
            <div className="custom-select-search">
              <input
                ref={searchRef}
                type="text"
                placeholder="חיפוש..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          <div className="custom-select-options">
            {filtered.map((option) => (
              <div
                key={option.value}
                className={`custom-select-item${option.value === value ? ' selected' : ''}`}
                onClick={() => { onChange(option.value); setSearch(''); setOpen(false) }}
              >
                <span>{option.label}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="custom-select-empty">אין תוצאות</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
