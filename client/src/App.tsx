import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { IncomeSourcesProvider } from './contexts/IncomeSourcesContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/common/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { DataEntryPage } from './pages/DataEntryPage'
import { HistoryPage } from './pages/HistoryPage'
import { IncomeSourcesPage } from './pages/IncomeSourcesPage'
import { CreateIncomeSourcePage } from './pages/CreateIncomeSourcePage'

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="auth-loading">טוען...</div>
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            element={
              <ProtectedRoute>
                <IncomeSourcesProvider>
                  <AppLayout />
                </IncomeSourcesProvider>
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/entry" element={<DataEntryPage />} />
            <Route path="/entry/income-sources" element={<IncomeSourcesPage />} />
            <Route path="/entry/income-sources/new" element={<CreateIncomeSourcePage />} />
            <Route path="/history" element={<HistoryPage />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
