import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './AppLayout.css'

export function AppLayout() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName = profile?.display_name || user?.email || ''

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 7 && hour < 12) return 'בוקר טוב'
    if (hour >= 12 && hour < 16) return 'צהריים טובים'
    if (hour >= 16 && hour < 18) return 'אחר הצהריים טובים'
    if (hour >= 18 && hour < 21) return 'ערב טוב'
    return 'לילה טוב'
  }

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Prevent body scroll when mobile nav is open
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileNavOpen])

  return (
    <div className="app-layout">
      <nav className="app-nav">
        <button className="nav-hamburger" onClick={() => setMobileNavOpen(prev => !prev)} aria-label="תפריט ניווט">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {mobileNavOpen
              ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              : <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
            }
          </svg>
        </button>
        <div className={`nav-links${mobileNavOpen ? ' open' : ''}`}>
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
          <NavLink to="/investments" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
            </svg>
            השקעות
          </NavLink>
          <div className="nav-mobile-user">
            <button className="nav-dropdown-item" onClick={() => { setMobileNavOpen(false); navigate('/change-password') }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              שינוי סיסמה
            </button>
            <button className="nav-dropdown-item nav-dropdown-signout" onClick={() => { setMobileNavOpen(false); signOut() }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              התנתקות
            </button>
          </div>
        </div>
        {mobileNavOpen && <div className="nav-overlay" onClick={() => setMobileNavOpen(false)} />}
        <div className="nav-user">
          <span className="nav-username">{getGreeting()}, {displayName}</span>
          <div className="nav-user-menu" ref={menuRef}>
          <button className="nav-avatar" onClick={() => setMenuOpen(prev => !prev)} aria-label="תפריט משתמש">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </button>
          {menuOpen && (
            <div className="nav-dropdown">
              <button className="nav-dropdown-item" onClick={() => { setMenuOpen(false); navigate('/change-password') }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                שינוי סיסמה
              </button>
              <button className="nav-dropdown-item nav-dropdown-signout" onClick={() => { setMenuOpen(false); signOut() }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                התנתקות
              </button>
            </div>
          )}
          </div>
        </div>
      </nav>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
