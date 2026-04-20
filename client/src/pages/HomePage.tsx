import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './HomePage.css'

export function HomePage() {
  const { user, signOut } = useAuth()

  return (
    <div className="home-layout">
      <header className="home-header">
        <div className="home-header-right">
          <span className="home-greeting">
            שלום, {user?.user_metadata?.display_name || 'משתמש'}
          </span>
        </div>
        <nav className="home-nav">
          <NavLink to="/actions" className="nav-tab">
            פעולות
          </NavLink>
          <NavLink to="/data" className="nav-tab">
            נתונים
          </NavLink>
        </nav>
        <div className="home-header-left">
          <button onClick={signOut} className="logout-btn">
            התנתק
          </button>
        </div>
      </header>
      <main className="home-main">
        <Outlet />
      </main>
    </div>
  )
}
