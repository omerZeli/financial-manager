import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './CustomSelect.css'

interface CustomSelectProps {
  id: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  required?: boolean
  onAddOption?: (label: string) => void
  onRemoveOption?: (label: string) => void
}

export function CustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  required,
  onAddOption,
  onRemoveOption,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const [addingNew, setAddingNew] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})

  const filteredOptions = search
    ? options.filter((o) => o.label.includes(search))
    : options

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const viewportWidth = document.documentElement.clientWidth
    const viewportHeight = window.innerHeight
    const spaceBelow = viewportHeight - rect.bottom
    const menuEstimatedHeight = Math.min((options.length + 1) * 46 + 100, 200)
    const openUpward = spaceBelow < menuEstimatedHeight && rect.top > spaceBelow

    const menuWidth = rect.width
    let left = rect.left
    // Prevent overflow on the right
    if (left + menuWidth > viewportWidth - 8) {
      left = viewportWidth - menuWidth - 8
    }
    // Prevent overflow on the left
    if (left < 8) {
      left = 8
    }

    setMenuStyle({
      position: 'fixed',
      ...(openUpward
        ? { bottom: viewportHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
      left,
      width: menuWidth,
      maxHeight: 200,
      overflowY: 'auto',
      zIndex: 9999,
    })
  }, [options.length])

  useEffect(() => {
    if (!open) return
    const rafId = requestAnimationFrame(() => {
      updatePosition()
    })
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, updatePosition])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
      setAddingNew(false)
      setNewValue('')
      setSearch('')
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (addingNew && inputRef.current) {
      inputRef.current.focus()
    }
  }, [addingNew])

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus()
    }
  }, [open])

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      updatePosition()
    }
    setOpen(!open)
    if (open) {
      setAddingNew(false)
      setNewValue('')
      setSearch('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setAddingNew(false)
      setNewValue('')
      setSearch('')
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }

  const handleAddNew = () => {
    const trimmed = newValue.trim()
    if (trimmed && onAddOption) {
      onAddOption(trimmed)
      onChange(trimmed)
      setNewValue('')
      setAddingNew(false)
      setOpen(false)
      setSearch('')
    }
  }

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddNew()
    }
    if (e.key === 'Escape') {
      setAddingNew(false)
      setNewValue('')
    }
  }

  const handleRemove = (e: React.MouseEvent, label: string) => {
    e.stopPropagation()
    if (onRemoveOption) {
      onRemoveOption(label)
      if (value === label) {
        onChange('')
      }
    }
  }

  const selectedLabel = options.find((o) => o.value === value)?.label

  const menu = open
    ? createPortal(
        <ul className="custom-select-menu" role="listbox" ref={menuRef} style={menuStyle}>
          <li className="custom-select-search-row">
            <input
              ref={searchRef}
              type="text"
              className="custom-select-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש..."
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false)
                  setSearch('')
                }
              }}
            />
          </li>
          {filteredOptions.map((option) => (
            <li
              key={option.value}
              className={`custom-select-option ${value === option.value ? 'custom-select-option--selected' : ''}`}
              role="option"
              aria-selected={value === option.value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
                setSearch('')
              }}
            >
              <span className="custom-select-option-label">{option.label}</span>
              {onRemoveOption && (
                <button
                  type="button"
                  className="custom-select-option-remove"
                  onClick={(e) => handleRemove(e, option.value)}
                  aria-label={`הסר ${option.label}`}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
          {search && filteredOptions.length === 0 && (
            <li className="custom-select-no-results">אין תוצאות</li>
          )}
          {onAddOption && !addingNew && (
            <li
              className="custom-select-option custom-select-add-btn"
              onClick={() => setAddingNew(true)}
            >
              + הוסף אפשרות
            </li>
          )}
          {onAddOption && addingNew && (
            <li className="custom-select-add-row">
              <input
                ref={inputRef}
                type="text"
                className="custom-select-add-input"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={handleAddKeyDown}
                placeholder="הקלד אפשרות חדשה"
              />
              <button
                type="button"
                className="custom-select-add-confirm"
                onClick={handleAddNew}
                disabled={!newValue.trim()}
              >
                ✓
              </button>
            </li>
          )}
        </ul>,
        document.body
      )
    : null

  return (
    <div className="custom-select" ref={ref}>
      <input
        tabIndex={-1}
        id={id}
        value={value}
        required={required}
        onChange={() => {}}
        style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      />
      <button
        ref={triggerRef}
        type="button"
        className={`custom-select-trigger ${open ? 'custom-select-trigger--open' : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={id}
      >
        <span className={selectedLabel ? '' : 'custom-select-placeholder'}>
          {selectedLabel || placeholder || 'בחר'}
        </span>
        <svg className={`custom-select-chevron ${open ? 'custom-select-chevron--open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {menu}
    </div>
  )
}
