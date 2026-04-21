import { Link } from 'react-router-dom'
import './DataPage.css'

const dataItems = [
  { id: 'credit-card-expenses', label: 'הוצאות כרטיס אשראי' },
  { id: 'paybacks', label: 'קבלת החזר' },
  { id: 'outgoing-paybacks', label: 'החזר למישהו אחר' },
  { id: 'investment-deposits', label: 'הפקדות לאפיקי השקעה' },
  { id: 'investment-channels', label: 'אפיקי השקעה' },
  { id: 'insurances', label: 'ביטוחים' },
]

export function DataPage() {
  return (
    <div className="page-content">
      <h2>נתונים</h2>
      <div className="items-list">
        {dataItems.map((item) => (
          <Link key={item.id} to={`/data/${item.id}`} className="item-block action-link">
            <span className="action-link-label">{item.label}</span>
            <span className="action-link-arrow">←</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
