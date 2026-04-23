import { useRef } from 'react';

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

export default function DateInput({ value, onChange, required, min, placeholder }: DateInputProps) {
  const hiddenRef = useRef<HTMLInputElement>(null);

  return (
    <div className="date-input-wrap">
      <input
        type="text"
        className="date-input-display"
        readOnly
        value={isoToDisplay(value)}
        placeholder={placeholder || 'DD/MM/YYYY'}
        required={required}
        dir="ltr"
        onClick={() => hiddenRef.current?.showPicker()}
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
    </div>
  );
}
