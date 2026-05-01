import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './DatePicker.css'

interface DatePickerProps {
  value: string           // ISO format: YYYY-MM-DD
  onChange: (iso: string) => void
  required?: boolean
  min?: string            // ISO format
  placeholder?: string
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

// Sunday-first weekday labels (Hebrew)
const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

type View = 'days' | 'months' | 'years'

/** Format ISO date string (YYYY-MM-DD) to DD/MM/YYYY */
function isoToDisplay(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Parse DD/MM/YYYY to ISO YYYY-MM-DD, returns '' if invalid */
function displayToIso(display: string): string {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return ''
  const [, d, m, y] = match
  const day = Number(d), month = Number(m), year = Number(y)
  if (month < 1 || month > 12 || day < 1 || day > 31) return ''
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return ''
  return `${y}-${m}-${d}`
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function isSameDay(iso1: string, iso2: string): boolean {
  return iso1 === iso2
}

export default function DatePicker({ value, onChange, required, min, placeholder }: DatePickerProps) {
  const [text, setText] = useState(isoToDisplay(value))
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('days')
  const anchorRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Position state for the portal-rendered dropdown
  const [pos, setPos] = useState<{ top: number; left: number; width: number; dropUp: boolean }>({
    top: 0, left: 0, width: 0, dropUp: false,
  })

  // The month/year currently displayed in the calendar
  const [viewYear, setViewYear] = useState(() => {
    if (value) { const [y] = value.split('-'); return Number(y) }
    return new Date().getFullYear()
  })
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) { const parts = value.split('-'); return Number(parts[1]) - 1 }
    return new Date().getMonth()
  })

  // For year grid paging
  const [yearRangeStart, setYearRangeStart] = useState(() => {
    const y = value ? Number(value.split('-')[0]) : new Date().getFullYear()
    return y - (y % 12)
  })

  // Sync text when value changes externally
  useEffect(() => {
    setText(isoToDisplay(value))
  }, [value])

  // Sync calendar view when value changes
  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-')
      setViewYear(Number(y))
      setViewMonth(Number(m) - 1)
    }
  }, [value])

  // Compute dropdown position relative to viewport
  const updatePosition = useCallback(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const dropdownHeight = 360
    const gap = 6
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const dropUp = spaceBelow < dropdownHeight + gap && spaceAbove > spaceBelow

    const dropdownWidth = Math.max(rect.width, 280)
    const margin = 8 // minimum distance from viewport edge

    // Clamp horizontal position so the dropdown stays within the viewport
    let left = rect.left
    if (left + dropdownWidth > window.innerWidth - margin) {
      left = window.innerWidth - dropdownWidth - margin
    }
    if (left < margin) {
      left = margin
    }

    // Compute CSS top so the dropdown stays within the viewport
    let top: number
    if (dropUp) {
      top = rect.top - gap - dropdownHeight
      if (top < margin) top = margin
    } else {
      top = rect.bottom + gap
      if (top + dropdownHeight > window.innerHeight - margin) {
        top = window.innerHeight - dropdownHeight - margin
      }
    }

    setPos({
      top,
      left,
      width: dropdownWidth,
      dropUp,
    })
  }, [])

  // Update position when open, on scroll/resize, and on view change
  useEffect(() => {
    if (!open) return
    updatePosition()

    // Listen for scroll on any ancestor (including modal) and window resize
    const handleUpdate = () => updatePosition()
    window.addEventListener('resize', handleUpdate)
    window.addEventListener('scroll', handleUpdate, true) // capture phase for nested scrolls
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
        setView('days')
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
        setView('days')
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/[^\d/]/g, '')
    if (raw.length === 2 && !raw.includes('/')) raw += '/'
    else if (raw.length === 5 && raw.indexOf('/') === 2 && raw.lastIndexOf('/') === 2) raw += '/'
    if (raw.length > 10) raw = raw.slice(0, 10)
    setText(raw)
    const iso = displayToIso(raw)
    if (iso) onChange(iso)
  }

  function handleBlur() {
    const iso = displayToIso(text)
    if (!iso && text !== '') {
      setText(isoToDisplay(value))
    }
  }

  function selectDay(year: number, month: number, day: number) {
    const iso = toIso(year, month, day)
    onChange(iso)
    setOpen(false)
    setView('days')
  }

  function selectMonth(month: number) {
    setViewMonth(month)
    setView('days')
  }

  function selectYear(year: number) {
    setViewYear(year)
    setYearRangeStart(year - (year % 12))
    setView('months')
  }

  const goToPrevMonth = useCallback(() => {
    setViewMonth(prev => {
      if (prev === 0) { setViewYear(y => y - 1); return 11 }
      return prev - 1
    })
  }, [])

  const goToNextMonth = useCallback(() => {
    setViewMonth(prev => {
      if (prev === 11) { setViewYear(y => y + 1); return 0 }
      return prev + 1
    })
  }, [])

  function goToToday() {
    const now = new Date()
    const iso = toIso(now.getFullYear(), now.getMonth(), now.getDate())
    onChange(iso)
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    setOpen(false)
    setView('days')
  }

  function toggleOpen() {
    if (!open) {
      if (value) {
        const [y, m] = value.split('-')
        setViewYear(Number(y))
        setViewMonth(Number(m) - 1)
      } else {
        setViewYear(new Date().getFullYear())
        setViewMonth(new Date().getMonth())
      }
      setView('days')
    }
    setOpen(prev => !prev)
  }

  // Build the day grid for the current view month
  const todayIso = toIso(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  const daySlots: { day: number; month: number; year: number; outside: boolean }[] = []

  // Previous month fill
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const pm = viewMonth === 0 ? 11 : viewMonth - 1
    const py = viewMonth === 0 ? viewYear - 1 : viewYear
    daySlots.push({ day: daysInPrevMonth - i, month: pm, year: py, outside: true })
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    daySlots.push({ day: d, month: viewMonth, year: viewYear, outside: false })
  }

  // Next month fill (up to 42 slots = 6 rows)
  const remaining = 42 - daySlots.length
  for (let d = 1; d <= remaining; d++) {
    const nm = viewMonth === 11 ? 0 : viewMonth + 1
    const ny = viewMonth === 11 ? viewYear + 1 : viewYear
    daySlots.push({ day: d, month: nm, year: ny, outside: true })
  }

  const dropdownStyle: React.CSSProperties = {
    position: 'fixed',
    left: pos.left,
    width: pos.width,
    top: pos.top,
  }

  const dropdown = open && createPortal(
    <div
      ref={dropdownRef}
      className={`date-picker-dropdown${pos.dropUp ? ' drop-up' : ''}`}
      style={dropdownStyle}
      role="dialog"
      aria-label="בחירת תאריך"
    >
      {view === 'days' && (
        <>
          <div className="dp-header">
            <button type="button" className="dp-nav-btn" onClick={goToPrevMonth} aria-label="חודש קודם">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <button type="button" className="dp-title" onClick={() => setView('months')}>
              {HEBREW_MONTHS[viewMonth]} {viewYear}
            </button>
            <button type="button" className="dp-nav-btn" onClick={goToNextMonth} aria-label="חודש הבא">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>

          <div className="dp-weekdays">
            {WEEKDAYS.map(d => <div key={d} className="dp-weekday">{d}</div>)}
          </div>

          <div className="dp-days">
            {daySlots.map((slot, i) => {
              const iso = toIso(slot.year, slot.month, slot.day)
              const isSelected = value && isSameDay(iso, value)
              const isToday = isSameDay(iso, todayIso)
              const isDisabled = min ? iso < min : false
              const cls = [
                'dp-day',
                slot.outside ? 'outside' : '',
                isToday && !isSelected ? 'today' : '',
                isSelected ? 'selected' : '',
                isDisabled && !slot.outside ? 'disabled' : '',
              ].filter(Boolean).join(' ')
              return (
                <button
                  key={i}
                  type="button"
                  className={cls}
                  onClick={() => !isDisabled && selectDay(slot.year, slot.month, slot.day)}
                  tabIndex={-1}
                  disabled={isDisabled || slot.outside}
                >
                  {slot.day}
                </button>
              )
            })}
          </div>

          <div className="dp-footer">
            <button type="button" className="dp-today-btn" onClick={goToToday}>
              היום
            </button>
          </div>
        </>
      )}

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
    <div className="date-picker" ref={anchorRef}>
      <div className="date-picker-anchor">
        <input
          ref={inputRef}
          type="text"
          className="date-picker-display"
          value={text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          placeholder={placeholder || 'DD/MM/YYYY'}
          required={required}
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
        />
        <button
          type="button"
          className="date-picker-icon"
          onClick={toggleOpen}
          tabIndex={-1}
          aria-label="בחר תאריך"
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
