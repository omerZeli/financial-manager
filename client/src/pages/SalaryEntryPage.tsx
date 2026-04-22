import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useIncomeSources } from '../contexts/IncomeSourcesContext'
import { useFormattedNumber } from '../hooks/useFormattedNumber'
import { Dropdown } from '../components/common/Dropdown'
import './SalaryEntry.css'

const MONTHS = [
  { value: '01', label: 'ינואר' },
  { value: '02', label: 'פברואר' },
  { value: '03', label: 'מרץ' },
  { value: '04', label: 'אפריל' },
  { value: '05', label: 'מאי' },
  { value: '06', label: 'יוני' },
  { value: '07', label: 'יולי' },
  { value: '08', label: 'אוגוסט' },
  { value: '09', label: 'ספטמבר' },
  { value: '10', label: 'אוקטובר' },
  { value: '11', label: 'נובמבר' },
  { value: '12', label: 'דצמבר' },
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 11 }, (_, i) => {
  const y = currentYear - i
  return { value: String(y), label: String(y) }
})

export function SalaryEntryPage() {
  const { sourceId } = useParams<{ sourceId: string }>()
  const { user } = useAuth()
  const { sources, updateLatestMonth } = useIncomeSources()
  const navigate = useNavigate()

  const source = sources.find((s) => s.id === sourceId)

  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const gross = useFormattedNumber()
  const net = useFormattedNumber()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = selectedMonth && selectedYear && gross.raw && net.raw && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !sourceId || !canSubmit) return

    setSubmitting(true)
    setError('')

    const monthDate = `${selectedYear}-${selectedMonth}-01`

    const { error } = await supabase
      .from('salaries')
      .insert({
        user_id: user.id,
        income_source_id: sourceId,
        month: monthDate,
        gross: parseInt(gross.raw, 10),
        net: parseInt(net.raw, 10),
      })

    if (error) {
      if (error.code === '23505') {
        setError('כבר קיימת משכורת לחודש זה עבור מקור הכנסה זה')
      } else {
        setError('שגיאה בשמירת המשכורת')
      }
      setSubmitting(false)
    } else {
      updateLatestMonth(sourceId, monthDate)
      navigate('/entry/income-sources')
    }
  }

  if (!source) {
    return (
      <div className="salary-entry-page">
        <Link to="/entry/income-sources" className="back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
          </svg>
          חזרה למקורות הכנסה
        </Link>
        <div className="sources-error">מקור הכנסה לא נמצא</div>
      </div>
    )
  }

  return (
    <div className="salary-entry-page">
      <Link to="/entry/income-sources" className="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
        </svg>
        חזרה למקורות הכנסה
      </Link>

      <h1>משכורת - {source.name}</h1>

      <form className="salary-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label>חודש</label>
          <div className="month-picker">
            <Dropdown
              options={MONTHS}
              value={selectedMonth}
              placeholder="חודש"
              onChange={setSelectedMonth}
            />
            <Dropdown
              options={YEARS}
              value={selectedYear}
              placeholder="שנה"
              onChange={setSelectedYear}
            />
          </div>
        </div>

        <div className="form-field">
          <label>ברוטו (₪)</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="הכנס ברוטו"
            value={gross.display}
            onChange={gross.onChange}
            required
          />
        </div>

        <div className="form-field">
          <label>נטו (₪)</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="הכנס נטו"
            value={net.display}
            onChange={net.onChange}
            required
          />
        </div>

        {error && <div className="sources-error">{error}</div>}

        <button type="submit" className="submit-btn" disabled={!canSubmit}>
          {submitting ? 'שומר...' : 'שמירה'}
        </button>
      </form>
    </div>
  )
}
