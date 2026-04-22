import { useState, useCallback } from 'react'

function formatWithCommas(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('en-US')
}

function stripCommas(value: string): string {
  return value.replace(/,/g, '')
}

export function useFormattedNumber(initial = '') {
  const [raw, setRaw] = useState(initial)

  const display = formatWithCommas(raw)

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const stripped = stripCommas(e.target.value)
    // allow only digits
    if (/^\d*$/.test(stripped)) {
      setRaw(stripped)
    }
  }, [])

  return { display, raw, onChange, setRaw }
}
