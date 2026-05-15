import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import './Auth.css'

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

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

    if (!user?.email) {
      setError('לא ניתן לזהות את המשתמש')
      return
    }

    setLoading(true)

    // Verify current password before allowing change
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (signInError) {
      setError('הסיסמה הנוכחית שגויה')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => navigate('/'), 2000)
    }
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-form">
          <h1>הסיסמה עודכנה</h1>
          <p className="auth-success">הסיסמה שונתה בהצלחה. מעביר לדף הבית...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>שינוי סיסמה</h1>

        {error && <div className="auth-error">{error}</div>}

        <label htmlFor="currentPassword">סיסמה נוכחית</label>
        <input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          autoComplete="current-password"
          dir="ltr"
        />

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
