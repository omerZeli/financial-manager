import { useState, useRef, useEffect } from 'react'
import './MultiSelect.css'

interface MultiSelectProps {
  options: string[]
  value: string[]
  placeholder: string
  onChange: (value: string[]) => void
}

export function MultiSelect({ options, value, placeholder, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = search
    ? options.filter(o => o.includes(search))
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

  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt))
    } else {
      onChange([...value, opt])
    }
  }

  const removeTag = (e: React.MouseEvent, opt: string) => {
    e.stopPropagation()
    onChange(value.filter(v => v !== opt))
  }

  return (
    <div className={`multi-select${open ? ' open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`multi-select-trigger${value.length === 0 ? ' placeholder' : ''}`}
        onClick={() => setOpen(prev => !prev)}
      >
        {value.length === 0 ? (
          <span>{placeholder}</span>
        ) : (
          <div className="multi-select-tags">
            {value.map(v => (
              <span key={v} className="multi-select-tag">
                {v}
                <button type="button" className="multi-select-tag-remove" onClick={e => removeTag(e, v)}>&times;</button>
              </span>
            ))}
          </div>
        )}
        <svg className="multi-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="multi-select-menu">
          {options.length > 0 && (
            <div className="multi-select-search">
              <input
                ref={searchRef}
                type="text"
                placeholder="חיפוש..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}
          <div className="multi-select-options">
            {filtered.map(opt => (
              <div
                key={opt}
                className={`multi-select-item${value.includes(opt) ? ' selected' : ''}`}
                onClick={() => toggle(opt)}
              >
                <span className="multi-select-check">
                  {value.includes(opt) && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span>{opt}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="multi-select-empty">אין תוצאות</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
