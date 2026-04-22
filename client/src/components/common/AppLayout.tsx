import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './AppLayout.css'

export function AppLayout() {
  const { user, profile, signOut } = useAuth()

  const displayName = profile?.display_name || user?.email || ''

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 7 && hour < 12) return 'בוקר טוב'
    if (hour >= 12 && hour < 16) return 'צהריים טובים'
    if (hour >= 16 && hour < 18) return 'אחר הצהריים טובים'
    if (hour >= 18 && hour < 21) return 'ערב טוב'
    return 'לילה טוב'
  }

  return (
    <div className="app-layout">
      <nav className="app-nav">
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-6" />
            </svg>
            דשבורד
          </NavLink>
          <NavLink to="/entry" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" /><path d="M5 12h14" />
            </svg>
            הזנת נתונים
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            היסטוריה
          </NavLink>
        </div>
        <div className="nav-user">
          <span className="nav-username">{getGreeting()}, {displayName}</span>
          <button className="nav-signout" onClick={signOut}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          יציאה
        </button>
        </div>
      </nav>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
