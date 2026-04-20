import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { HomePage } from './pages/HomePage'
import { ActionsPage } from './pages/ActionsPage'
import { ActionPage } from './pages/ActionPage'
import { DataPage } from './pages/DataPage'
import { TrackingPage } from './pages/TrackingPage'

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="auth-loading">טוען...</div>
  }

  if (user) {
    return <Navigate to="/actions" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/actions" replace />} />
            <Route path="actions" element={<ActionsPage />} />
            <Route path="actions/:actionId" element={<ActionPage />} />
            <Route path="data" element={<DataPage />} />
            <Route path="tracking" element={<TrackingPage />} />
          </Route>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
