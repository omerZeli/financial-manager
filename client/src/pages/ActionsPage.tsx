import { Link } from 'react-router-dom'
import './ActionsPage.css'

const actions = [
  { id: 'credit-card-expenses', label: 'הוצאות כרטיס אשראי' },
  { id: 'paybacks', label: 'קבלת החזר' },
  { id: 'outgoing-paybacks', label: 'החזר למישהו אחר' },
  { id: 'investment-channels', label: 'יצירת אפיק השקעה' },
  { id: 'investment-deposits', label: 'הפקדה לאפיק השקעה' },
  { id: 'update-investment-value', label: 'עדכון שווי אפיק השקעה' },
  { id: 'fixed-expenses', label: 'הוצאה קבועה' },
  { id: 'insurance', label: 'ביטוח חיים ובריאות' },
]

export function ActionsPage() {
  return (
    <div className="page-content">
      <h2>פעולות</h2>
      <div className="items-list">
        {actions.map((action) => (
          <Link key={action.id} to={`/actions/${action.id}`} className="item-block action-link">
            <span className="action-link-label">{action.label}</span>
            <span className="action-link-arrow">←</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
