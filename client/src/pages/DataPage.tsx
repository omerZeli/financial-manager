import { useState } from 'react'
import { CreditCardExpensesTable } from '../components/data/CreditCardExpensesTable'
import './DataPage.css'

const dataItems = [
  { id: 'credit-card-expenses', label: 'הוצאות כרטיס אשראי' },
]

export function DataPage() {
  const [openItem, setOpenItem] = useState<string | null>(null)

  return (
    <div className="page-content">
      <h2>נתונים</h2>
      <div className="items-list">
        {dataItems.map((item) => (
          <div key={item.id} className="item-block">
            <button
              className={`item-toggle ${openItem === item.id ? 'item-toggle--active' : ''}`}
              onClick={() => setOpenItem(openItem === item.id ? null : item.id)}
            >
              {item.label}
              <span className="item-toggle-icon">{openItem === item.id ? '−' : '+'}</span>
            </button>
            {openItem === item.id && (
              <div className="item-content">
                {item.id === 'credit-card-expenses' && <CreditCardExpensesTable />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
