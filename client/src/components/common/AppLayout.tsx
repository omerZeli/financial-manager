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
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            בית
          </NavLink>
          <NavLink to="/salary" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            משכורת
          </NavLink>
          <NavLink to="/expenses" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            הוצאות
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
