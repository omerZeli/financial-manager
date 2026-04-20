import { useState } from 'react'
import { CreditCardExpenseAction } from '../components/actions/CreditCardExpenseAction'
import './ActionsPage.css'

const actions = [
  { id: 'credit-card-expenses', label: 'הוצאות כרטיס אשראי' },
]

export function ActionsPage() {
  const [openAction, setOpenAction] = useState<string | null>(null)

  return (
    <div className="page-content">
      <h2>פעולות</h2>
      <div className="items-list">
        {actions.map((action) => (
          <div key={action.id} className="item-block">
            <button
              className={`item-toggle ${openAction === action.id ? 'item-toggle--active' : ''}`}
              onClick={() => setOpenAction(openAction === action.id ? null : action.id)}
            >
              {action.label}
              <span className="item-toggle-icon">{openAction === action.id ? '−' : '+'}</span>
            </button>
            {openAction === action.id && (
              <div className="item-content">
                {action.id === 'credit-card-expenses' && <CreditCardExpenseAction />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
