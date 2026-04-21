import { NavLink, Outlet, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './HomePage.css'

export function HomePage() {
  const { user, signOut } = useAuth()
  const [searchParams] = useSearchParams()
  const catParam = searchParams.get('cat')
  const catQuery = catParam ? `?cat=${catParam}` : ''

  return (
    <div className="home-layout">
      <header className="home-header">
        <div className="home-header-right">
          <span className="home-greeting">
            שלום, {user?.user_metadata?.display_name || 'משתמש'}
          </span>
        </div>
        <nav className="home-nav">
          <NavLink to={`/actions${catQuery}`} className="nav-tab">
            פעולות
          </NavLink>
          <NavLink to={`/data${catQuery}`} className="nav-tab">
            נתונים
          </NavLink>
          <NavLink to={`/tracking${catQuery}`} className="nav-tab">
            מעקב
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
