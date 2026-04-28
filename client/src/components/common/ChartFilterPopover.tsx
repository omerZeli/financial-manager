import { useState, useRef, useEffect, type ReactNode } from 'react'
import './ChartFilterPopover.css'

interface ChartFilterPopoverProps {
  children: ReactNode
  hasActive: boolean
  onClear: () => void
}

export function ChartFilterPopover({ children, hasActive, onClear }: ChartFilterPopoverProps) {
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
        <div className="filter-popover chart-filter-popover">
          <div className="filter-popover-header">
            <span className="filter-popover-title">סינון</span>
            {hasActive && (
              <button type="button" className="filter-popover-clear" onClick={onClear}>נקה הכל</button>
            )}
          </div>
          <div className="filter-popover-fields">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
