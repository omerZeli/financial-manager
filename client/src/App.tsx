import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SalaryProvider } from './contexts/SalaryContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/common/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { HomePage } from './pages/HomePage'
import { SalaryTablePage } from './pages/SalaryTablePage'
import { SalaryChartsPage } from './pages/SalaryChartsPage'
import { ExpensesProvider } from './contexts/ExpensesContext'
import { FixedExpensesProvider } from './contexts/FixedExpensesContext'
import { ExpensesTablePage } from './pages/ExpensesTablePage'
import { ExpensesChartsPage } from './pages/ExpensesChartsPage'

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
                <SalaryProvider>
                  <ExpensesProvider>
                    <FixedExpensesProvider>
                      <AppLayout />
                    </FixedExpensesProvider>
                  </ExpensesProvider>
                </SalaryProvider>
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/salary" element={<SalaryTablePage />} />
            <Route path="/salary/charts" element={<SalaryChartsPage />} />
            <Route path="/expenses" element={<ExpensesTablePage />} />
            <Route path="/expenses/charts" element={<ExpensesChartsPage />} />
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
