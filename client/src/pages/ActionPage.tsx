import { useNavigate, useParams } from 'react-router-dom'
import { CreditCardExpenseAction } from '../components/actions/CreditCardExpenseAction'
import { PaybackAction } from '../components/actions/PaybackAction'
import './ActionPage.css'

const actionComponents: Record<string, React.FC> = {
  'credit-card-expenses': CreditCardExpenseAction,
  'paybacks': PaybackAction,
}

export function ActionPage() {
  const { actionId } = useParams<{ actionId: string }>()
  const navigate = useNavigate()

  const ActionComponent = actionId ? actionComponents[actionId] : null

  if (!ActionComponent) {
    return (
      <div className="action-page">
        <div className="action-page-card">
          <button className="action-page-close" onClick={() => navigate('/actions')} aria-label="סגור">
            ✕
          </button>
          <p className="page-empty-state">פעולה לא נמצאה</p>
        </div>
      </div>
    )
  }

  return (
    <div className="action-page">
      <div className="action-page-card">
        <button className="action-page-close" onClick={() => navigate('/actions')} aria-label="סגור">
          ✕
        </button>
        <ActionComponent />
      </div>
    </div>
  )
}
