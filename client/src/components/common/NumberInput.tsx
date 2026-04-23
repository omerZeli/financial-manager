import { useState, useEffect } from 'react'

/** Strip everything except digits and a single decimal point */
function stripNonNumeric(str: string): string {
  let result = ''
  let hasDot = false
  for (const ch of str) {
    if (ch >= '0' && ch <= '9') {
      result += ch
    } else if (ch === '.' && !hasDot) {
      hasDot = true
      result += ch
    }
  }
  return result
}

/** Format a numeric string with commas every 3 digits (integer part only) */
function formatWithCommas(raw: string): string {
  if (!raw) return ''
  const parts = raw.split('.')
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart
}

interface NumberInputProps {
  value: string
  onChange: (raw: string) => void
  placeholder?: string
  required?: boolean
  min?: string
  step?: string
}

export function NumberInput({ value, onChange, placeholder, required, min, step }: NumberInputProps) {
  const [display, setDisplay] = useState(() => formatWithCommas(value))

  // Sync display when value is reset externally (e.g. form reset)
  useEffect(() => {
    setDisplay(formatWithCommas(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = stripNonNumeric(e.target.value)
    onChange(raw)
    setDisplay(formatWithCommas(raw))
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      dir="ltr"
      placeholder={placeholder}
      required={required}
      value={display}
      onChange={handleChange}
      data-min={min}
      data-step={step}
    />
  )
}
