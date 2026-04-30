import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './MonthPicker.css'
import './DatePicker.css' // reuse dp-header, dp-nav-btn, dp-title, dp-months, dp-years styles

interface MonthPickerProps {
  value: string           // YYYY-MM format
  onChange: (val: string) => void
  required?: boolean
  placeholder?: string
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

type View = 'months' | 'years'

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/** Format YYYY-MM to MM/YYYY for display */
function toDisplay(val: string): string {
  if (!val) return ''
  const [y, m] = val.split('-')
  return `${m}/${y}`
}

/** Parse MM/YYYY to YYYY-MM, returns '' if invalid */
function fromDisplay(display: string): string {
  const match = display.match(/^(\d{2})\/(\d{4})$/)
  if (!match) return ''
  const [, m, y] = match
  const month = Number(m)
  if (month < 1 || month > 12) return ''
  return `${y}-${m}`
}

export default function MonthPicker({ value, onChange, required, placeholder }: MonthPickerProps) {
  const [text, setText] = useState(toDisplay(value))
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('months')
  const anchorRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [pos, setPos] = useState<{ top: number; left: number; width: number; dropUp: boolean }>({
    top: 0, left: 0, width: 0, dropUp: false,
  })

  const [viewYear, setViewYear] = useState(() => {
    if (value) return Number(value.split('-')[0])
    return new Date().getFullYear()
  })

  const [yearRangeStart, setYearRangeStart] = useState(() => {
    const y = value ? Number(value.split('-')[0]) : new Date().getFullYear()
    return y - (y % 12)
  })

  // Sync text when value changes externally
  useEffect(() => {
    setText(toDisplay(value))
  }, [value])

  // Sync view year when value changes
  useEffect(() => {
    if (value) {
      setViewYear(Number(value.split('-')[0]))
    }
  }, [value])

  // Compute dropdown position
  const updatePosition = useCallback(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const dropdownHeight = 260
    const gap = 6
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const dropUp = spaceBelow < dropdownHeight + gap && spaceAbove > spaceBelow

    setPos({
      top: dropUp ? rect.top - gap : rect.bottom + gap,
      left: rect.left,
      width: Math.max(rect.width, 280),
      dropUp,
    })
  }, [])

  // Update position when open
  useEffect(() => {
    if (!open) return
    updatePosition()
    const handleUpdate = () => updatePosition()
    window.addEventListener('resize', handleUpdate)
    window.addEventListener('scroll', handleUpdate, true)
    return () => {
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('scroll', handleUpdate, true)
    }
  }, [open, view, updatePosition])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        anchorRef.current && !anchorRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false)
        setView('months')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setView('months')
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/[^\d/]/g, '')
    // Auto-insert slash after MM
    if (raw.length === 2 && !raw.includes('/')) raw += '/'
    // Cap at MM/YYYY (7 chars)
    if (raw.length > 7) raw = raw.slice(0, 7)
    setText(raw)
    const parsed = fromDisplay(raw)
    if (parsed) onChange(parsed)
  }

  function handleBlur() {
    const parsed = fromDisplay(text)
    if (!parsed && text !== '') {
      setText(toDisplay(value))
    }
  }

  function selectMonth(month: number) {
    const val = `${viewYear}-${pad(month + 1)}`
    onChange(val)
    setOpen(false)
    setView('months')
  }

  function selectYear(year: number) {
    setViewYear(year)
    setYearRangeStart(year - (year % 12))
    setView('months')
  }

  function toggleOpen() {
    if (!open) {
      if (value) {
        setViewYear(Number(value.split('-')[0]))
      } else {
        setViewYear(new Date().getFullYear())
      }
      setView('months')
    }
    setOpen(prev => !prev)
  }

  const dropdownStyle: React.CSSProperties = {
    position: 'fixed',
    left: pos.left,
    width: pos.width,
    ...(pos.dropUp
      ? { bottom: window.innerHeight - pos.top }
      : { top: pos.top }),
  }

  const dropdown = open && createPortal(
    <div
      ref={dropdownRef}
      className={`month-picker-dropdown${pos.dropUp ? ' drop-up' : ''}`}
      style={dropdownStyle}
      role="dialog"
      aria-label="בחירת חודש"
    >
      {view === 'months' && (
        <>
          <div className="dp-header">
            <button type="button" className="dp-nav-btn" onClick={() => setViewYear(y => y - 1)} aria-label="שנה קודמת">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <button type="button" className="dp-title" onClick={() => { setYearRangeStart(viewYear - (viewYear % 12)); setView('years') }}>
              {viewYear}
            </button>
            <button type="button" className="dp-nav-btn" onClick={() => setViewYear(y => y + 1)} aria-label="שנה הבאה">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>

          <div className="dp-months">
            {HEBREW_MONTHS.map((name, i) => {
              const isCurrent = value && Number(value.split('-')[0]) === viewYear && Number(value.split('-')[1]) - 1 === i
              return (
                <button
                  key={i}
                  type="button"
                  className={`dp-month-btn${isCurrent ? ' current' : ''}`}
                  onClick={() => selectMonth(i)}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </>
      )}

      {view === 'years' && (
        <>
          <div className="dp-header">
            <button type="button" className="dp-nav-btn" onClick={() => setYearRangeStart(s => s - 12)} aria-label="טווח קודם">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <span className="dp-title" style={{ cursor: 'default' }}>
              {yearRangeStart} - {yearRangeStart + 11}
            </span>
            <button type="button" className="dp-nav-btn" onClick={() => setYearRangeStart(s => s + 12)} aria-label="טווח הבא">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>

          <div className="dp-years">
            {Array.from({ length: 12 }, (_, i) => {
              const y = yearRangeStart + i
              const isCurrent = value && Number(value.split('-')[0]) === y
              return (
                <button
                  key={y}
                  type="button"
                  className={`dp-year-btn${isCurrent ? ' current' : ''}`}
                  onClick={() => selectYear(y)}
                >
                  {y}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>,
    document.body,
  )

  return (
    <div className="month-picker" ref={anchorRef}>
      <div className="month-picker-anchor">
        <input
          ref={inputRef}
          type="text"
          className="month-picker-display"
          value={text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          placeholder={placeholder || 'MM/YYYY'}
          required={required}
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
        />
        <button
          type="button"
          className="month-picker-icon"
          onClick={toggleOpen}
          tabIndex={-1}
          aria-label="בחר חודש"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="currentColor" />
            <path d="M1.5 5.5h13" stroke="currentColor" />
            <path d="M5 1v3M11 1v3" stroke="currentColor" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {dropdown}
    </div>
  )
}
