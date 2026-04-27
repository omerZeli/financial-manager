import { useRef, useState, useEffect } from 'react';

interface DateInputProps {
  value: string;           // ISO format: YYYY-MM-DD
  onChange: (iso: string) => void;
  required?: boolean;
  min?: string;            // ISO format
  placeholder?: string;
}

/** Format ISO date string (YYYY-MM-DD) to DD/MM/YYYY */
function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Parse DD/MM/YYYY to ISO YYYY-MM-DD, returns '' if invalid */
function displayToIso(display: string): string {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';
  const [, d, m, y] = match;
  const day = Number(d), month = Number(m), year = Number(y);
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  // Basic date validity check
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
  return `${y}-${m}-${d}`;
}

export default function DateInput({ value, onChange, required, min, placeholder }: DateInputProps) {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(isoToDisplay(value));

  // Sync text when value changes externally (e.g. picker or parent reset)
  useEffect(() => {
    setText(isoToDisplay(value));
  }, [value]);

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/[^\d/]/g, '');

    // Auto-insert slashes after DD and MM
    if (raw.length === 2 && !raw.includes('/')) raw += '/';
    else if (raw.length === 5 && raw.indexOf('/') === 2 && raw.lastIndexOf('/') === 2) raw += '/';

    // Cap length at DD/MM/YYYY (10 chars)
    if (raw.length > 10) raw = raw.slice(0, 10);

    setText(raw);

    // Try to parse complete date
    const iso = displayToIso(raw);
    if (iso) {
      onChange(iso);
    }
  }

  function handleBlur() {
    // On blur, if text doesn't form a valid date, revert to last valid value
    const iso = displayToIso(text);
    if (!iso && text !== '') {
      setText(isoToDisplay(value));
    }
  }

  return (
    <div className="date-input-wrap">
      <input
        type="text"
        className="date-input-display"
        value={text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder={placeholder || 'DD/MM/YYYY'}
        required={required}
        dir="ltr"
        inputMode="numeric"
      />
      <input
        ref={hiddenRef}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        min={min}
        tabIndex={-1}
        aria-hidden="true"
        className="date-input-hidden"
      />
      <button
        type="button"
        className="date-input-picker-btn"
        onClick={() => hiddenRef.current?.showPicker()}
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
  );
}
