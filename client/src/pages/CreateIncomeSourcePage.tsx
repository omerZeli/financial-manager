import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useIncomeSources } from '../contexts/IncomeSourcesContext'
import './CreateIncomeSource.css'

export function CreateIncomeSourcePage() {
  const { user } = useAuth()
  const { addSource } = useIncomeSources()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [type, setType] = useState<'employed' | 'self_employed'>('employed')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !name.trim()) return

    setSubmitting(true)
    setError('')

    const { data, error } = await supabase
      .from('income_sources')
      .insert({ user_id: user.id, name: name.trim(), type })
      .select('id, name, type')
      .single()

    if (error || !data) {
      setError('שגיאה ביצירת מקור הכנסה')
      setSubmitting(false)
    } else {
      addSource(data)
      navigate('/entry/income-sources')
    }
  }

  return (
    <div className="create-source-page">
      <Link to="/entry/income-sources" className="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
        </svg>
        חזרה למקורות הכנסה
      </Link>

      <h1>מקור הכנסה חדש</h1>

      <form className="create-source-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label>שם מקור הכנסה</label>
          <input
            type="text"
            placeholder="הכנס שם מקור הכנסה"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label>סוג</label>
          <div className="toggle-bar">
            <button
              type="button"
              className={`toggle-option${type === 'employed' ? ' active' : ''}`}
              onClick={() => setType('employed')}
            >
              שכיר
            </button>
            <button
              type="button"
              className={`toggle-option${type === 'self_employed' ? ' active' : ''}`}
              onClick={() => setType('self_employed')}
            >
              עצמאי
            </button>
          </div>
        </div>

        {error && <div className="sources-error">{error}</div>}

        <button type="submit" className="submit-btn" disabled={submitting || !name.trim()}>
          {submitting ? 'שומר...' : 'שמירה'}
        </button>
      </form>
    </div>
  )
}
