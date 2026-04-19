import { useAuth } from '../contexts/AuthContext'

export function HomePage() {
  const { user, signOut } = useAuth()

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>שלום, {user?.user_metadata?.display_name || 'משתמש'}!</h1>
      <p>ברוך הבא למנהל הפיננסי</p>
      <button
        onClick={signOut}
        style={{
          marginTop: '24px',
          padding: '10px 24px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          background: 'transparent',
          color: 'var(--text-h)',
          cursor: 'pointer',
          fontSize: '16px',
        }}
      >
        התנתק
      </button>
    </div>
  )
}
