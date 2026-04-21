import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { CreditCardExpenseAction } from '../components/actions/CreditCardExpenseAction'
import { PaybackAction } from '../components/actions/PaybackAction'
import { OutgoingPaybackAction } from '../components/actions/OutgoingPaybackAction'
import { InvestmentChannelAction } from '../components/actions/InvestmentChannelAction'
import { InvestmentDepositAction } from '../components/actions/InvestmentDepositAction'
import { UpdateInvestmentValueAction } from '../components/actions/UpdateInvestmentValueAction'
import './ActionPage.css'

const actionComponents: Record<string, React.FC> = {
  'credit-card-expenses': CreditCardExpenseAction,
  'paybacks': PaybackAction,
  'outgoing-paybacks': OutgoingPaybackAction,
  'investment-channels': InvestmentChannelAction,
  'investment-deposits': InvestmentDepositAction,
  'update-investment-value': UpdateInvestmentValueAction,
}

export function ActionPage() {
  const { actionId } = useParams<{ actionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const triggeredBy = (location.state as { triggeredBy?: string } | null)?.triggeredBy

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
        {triggeredBy && (
          <button
            className="action-page-back"
            onClick={() => navigate(`/tracking/${triggeredBy}`)}
            aria-label="חזרה לפעולה המקורית"
          >
            →
          </button>
        )}
        <button className="action-page-close" onClick={() => navigate('/actions')} aria-label="סגור">
          ✕
        </button>
        <ActionComponent />
      </div>
    </div>
  )
}
