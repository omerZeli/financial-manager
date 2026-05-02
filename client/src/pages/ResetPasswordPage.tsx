import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Auth.css'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
        setChecking(false)
      }
    })

    // Also check if we already have a session (user may have already been redirected)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      }
      setChecking(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות')
      return
    }

    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  if (checking) {
    return <div className="auth-loading">טוען...</div>
  }

  if (!sessionReady) {
    return (
      <div className="auth-container">
        <div className="auth-form">
          <h1>קישור לא תקין</h1>
          <p className="auth-subtitle">
            הקישור לאיפוס הסיסמה אינו תקין או שפג תוקפו
          </p>
          <p className="auth-link">
            <Link to="/forgot-password">שלח קישור חדש</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>איפוס סיסמה</h1>

        {error && <div className="auth-error">{error}</div>}

        <label htmlFor="password">סיסמה חדשה</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          dir="ltr"
        />

        <label htmlFor="confirmPassword">אימות סיסמה</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          dir="ltr"
        />

        <button type="submit" disabled={loading}>
          {loading ? 'מעדכן...' : 'עדכן סיסמה'}
        </button>
      </form>
    </div>
  )
}
