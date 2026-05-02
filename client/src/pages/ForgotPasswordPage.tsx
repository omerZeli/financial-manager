import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Auth.css'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-form">
          <h1>בדוק את האימייל</h1>
          <p className="auth-success">
            שלחנו לך קישור לאיפוס סיסמה לכתובת {email}
          </p>
          <p className="auth-link">
            <Link to="/login">חזרה להתחברות</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>שכחתי סיסמה</h1>
        <p className="auth-subtitle">הכנס את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה</p>

        {error && <div className="auth-error">{error}</div>}

        <label htmlFor="email">אימייל</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          dir="ltr"
        />

        <button type="submit" disabled={loading}>
          {loading ? 'שולח...' : 'שלח קישור איפוס'}
        </button>

        <p className="auth-link">
          נזכרת בסיסמה? <Link to="/login">התחברות</Link>
        </p>
      </form>
    </div>
  )
}
