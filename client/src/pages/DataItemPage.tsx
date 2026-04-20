import { useNavigate, useParams } from 'react-router-dom'
import { CreditCardExpensesTable } from '../components/data/CreditCardExpensesTable'
import { PaybacksTable } from '../components/data/PaybacksTable'
import { OutgoingPaybacksTable } from '../components/data/OutgoingPaybacksTable'
import './DataItemPage.css'

const dataItems: Record<string, { label: string; component: React.FC }> = {
  'credit-card-expenses': { label: 'הוצאות כרטיס אשראי', component: CreditCardExpensesTable },
  'paybacks': { label: 'קבלת החזר', component: PaybacksTable },
  'outgoing-paybacks': { label: 'החזר למישהו אחר', component: OutgoingPaybacksTable },
}

export function DataItemPage() {
  const { dataId } = useParams<{ dataId: string }>()
  const navigate = useNavigate()

  const item = dataId ? dataItems[dataId] : null

  if (!item) {
    return (
      <div className="data-item-page">
        <div className="data-item-page-card">
          <button className="data-item-page-close" onClick={() => navigate('/data')} aria-label="סגור">
            ✕
          </button>
          <p className="page-empty-state">נתון לא נמצא</p>
        </div>
      </div>
    )
  }

  const DataComponent = item.component

  return (
    <div className="data-item-page">
      <div className="data-item-page-card">
        <button className="data-item-page-close" onClick={() => navigate('/data')} aria-label="סגור">
          ✕
        </button>
        <h2 className="data-item-page-title">{item.label}</h2>
        <DataComponent />
      </div>
    </div>
  )
}
