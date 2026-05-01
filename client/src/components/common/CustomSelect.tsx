import { useState, useRef, useEffect } from 'react'
import type { DropdownOption } from '../../hooks/useDropdownOptions'
import './CustomSelect.css'

interface CustomSelectProps {
  options: DropdownOption[]
  pinnedOptions?: string[]
  value: string
  placeholder: string
  onChange: (value: string) => void
  onAddOption: (label: string) => Promise<DropdownOption | null>
  onRemoveOption: (id: string) => Promise<boolean>
  loading?: boolean
}

export function CustomSelect({
  options,
  pinnedOptions = [],
  value,
  placeholder,
  onChange,
  onAddOption,
  onRemoveOption,
  loading = false,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  const pinnedSet = new Set(pinnedOptions)
  const allOptions: (DropdownOption & { pinned?: boolean })[] = [
    // Keep options in their original (sorted) order, marking pinned ones
    ...options.map(o => pinnedSet.has(o.label) ? { ...o, pinned: true } : o),
    // Append pinned labels that don't exist in options (at the end)
    ...pinnedOptions
      .filter(label => !options.some(o => o.label === label))
      .map(label => ({ id: `__pinned__${label}`, label, pinned: true })),
  ]
  const selected = allOptions.find((o) => o.label === value)
  const filtered = search
    ? allOptions.filter((o) => o.label.includes(search))
    : allOptions

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
        setAdding(false)
        setNewLabel('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open && !adding) searchRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (adding) addInputRef.current?.focus()
  }, [adding])

  const handleAdd = async () => {
    const label = newLabel.trim()
    if (!label) return
    const added = await onAddOption(label)
    if (added) {
      onChange(added.label)
      setNewLabel('')
      setAdding(false)
      setSearch('')
      setOpen(false)
    }
  }

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const removed = await onRemoveOption(id)
    if (removed) {
      const opt = options.find((o) => o.id === id)
      if (opt && opt.label === value) {
        onChange('')
      }
    }
  }

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

          {loading ? (
            <div className="custom-select-loading">טוען...</div>
          ) : (
            <div className="custom-select-options">
              {filtered.map((option) => (
                <div
                  key={option.id}
                  className={`custom-select-item${option.label === value ? ' selected' : ''}`}
                  onClick={() => { onChange(option.label); setSearch(''); setOpen(false) }}
                >
                  <span>{option.label}</span>
                  {!('pinned' in option && option.pinned) && (
                    <button
                      type="button"
                      className="custom-select-remove"
                      onClick={(e) => handleRemove(e, option.id)}
                      aria-label={`הסרת ${option.label}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="custom-select-empty">אין תוצאות</div>
              )}
            </div>
          )}

          <div className="custom-select-footer">
            {adding ? (
              <div className="custom-select-add-form">
                <input
                  ref={addInputRef}
                  type="text"
                  placeholder="הכנס שם חדש"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
                    if (e.key === 'Escape') { setAdding(false); setNewLabel('') }
                  }}
                />
                <button type="button" className="custom-select-add-submit" onClick={handleAdd} disabled={!newLabel.trim()}>
                  הוספה
                </button>
              </div>
            ) : (
              <button type="button" className="custom-select-add-btn" onClick={() => setAdding(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14" /><path d="M5 12h14" />
                </svg>
                הוספת אפשרות
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
