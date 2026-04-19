import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Auth.css'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>התחברות</h1>

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

        <label htmlFor="password">סיסמה</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          dir="ltr"
        />

        <button type="submit" disabled={loading}>
          {loading ? 'מתחבר...' : 'התחבר'}
        </button>

        <p className="auth-link">
          אין לך חשבון? <Link to="/register">הרשמה</Link>
        </p>
      </form>
    </div>
  )
}
