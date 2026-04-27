import { useState, useRef, useEffect } from 'react'
import './AutocompleteInput.css'

interface AutocompleteInputProps {
  suggestions: string[]
  value: string
  onChange: (value: string) => void
  onSelect?: (value: string) => void
  placeholder?: string
  required?: boolean
}

export function AutocompleteInput({
  suggestions,
  value,
  onChange,
  onSelect,
  placeholder,
  required,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = value
    ? suggestions.filter(s => s !== value && s.includes(value))
    : []

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    setActiveIndex(-1)
  }, [value])

  const pick = (val: string) => {
    onChange(val)
    onSelect?.(val)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => (prev + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev <= 0 ? filtered.length - 1 : prev - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      pick(filtered[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showMenu = open && filtered.length > 0

  return (
    <div className="autocomplete" ref={ref}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {showMenu && (
        <div className="autocomplete-menu" ref={listRef}>
          {filtered.map((s, i) => (
            <div
              key={s}
              className={`autocomplete-item${i === activeIndex ? ' active' : ''}`}
              onMouseDown={() => pick(s)}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
