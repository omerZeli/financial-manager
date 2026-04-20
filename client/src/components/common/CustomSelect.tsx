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
}

export function CustomSelect({ id, value, onChange, options, placeholder, required }: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const viewportWidth = document.documentElement.clientWidth
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      right: viewportWidth - rect.right,
      width: rect.width,
      zIndex: 9999,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    // Use requestAnimationFrame to ensure we measure after any layout shifts
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
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      // Capture position before opening so the menu is placed correctly on first render
      const rect = triggerRef.current.getBoundingClientRect()
      const viewportWidth = document.documentElement.clientWidth
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        right: viewportWidth - rect.right,
        width: rect.width,
        zIndex: 9999,
      })
    }
    setOpen(!open)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false)
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }

  const selectedLabel = options.find((o) => o.value === value)?.label

  const menu = open
    ? createPortal(
        <ul className="custom-select-menu" role="listbox" ref={menuRef} style={menuStyle}>
          {options.map((option) => (
            <li
              key={option.value}
              className={`custom-select-option ${value === option.value ? 'custom-select-option--selected' : ''}`}
              role="option"
              aria-selected={value === option.value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
            >
              {option.label}
            </li>
          ))}
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
