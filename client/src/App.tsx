import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { IncomeSourcesProvider } from './contexts/IncomeSourcesContext'
import { CreditCardsProvider } from './contexts/CreditCardsContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/common/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { DataEntryPage } from './pages/DataEntryPage'
import { HistoryPage } from './pages/HistoryPage'
import { IncomeSourcesPage } from './pages/IncomeSourcesPage'
import { CreateIncomeSourcePage } from './pages/CreateIncomeSourcePage'
import { SalaryEntryPage } from './pages/SalaryEntryPage'
import { CreditCardsPage } from './pages/CreditCardsPage'
import { CreateCreditCardPage } from './pages/CreateCreditCardPage'
import { CreateExpensePage } from './pages/CreateExpensePage'

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
                  <CreditCardsProvider>
                    <AppLayout />
                  </CreditCardsProvider>
                </IncomeSourcesProvider>
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/entry" element={<DataEntryPage />} />
            <Route path="/entry/income-sources" element={<IncomeSourcesPage />} />
            <Route path="/entry/income-sources/new" element={<CreateIncomeSourcePage />} />
            <Route path="/entry/income-sources/:sourceId/salary" element={<SalaryEntryPage />} />
            <Route path="/entry/credit-cards" element={<CreditCardsPage />} />
            <Route path="/entry/credit-cards/new" element={<CreateCreditCardPage />} />
            <Route path="/entry/credit-cards/:cardId/expense" element={<CreateExpensePage />} />
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
