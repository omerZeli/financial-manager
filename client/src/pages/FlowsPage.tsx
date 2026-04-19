import { useState } from 'react'
import { CreditCardExpenseFlow } from '../components/flows/CreditCardExpenseFlow'
import './FlowsPage.css'

const flows = [
  { id: 'credit-card-expenses', label: 'הוצאות כרטיס אשראי' },
]

export function FlowsPage() {
  const [openFlow, setOpenFlow] = useState<string | null>(null)

  return (
    <div className="page-content">
      <h2>תהליכים</h2>
      <div className="items-list">
        {flows.map((flow) => (
          <div key={flow.id} className="item-block">
            <button
              className={`item-toggle ${openFlow === flow.id ? 'item-toggle--active' : ''}`}
              onClick={() => setOpenFlow(openFlow === flow.id ? null : flow.id)}
            >
              {flow.label}
              <span className="item-toggle-icon">{openFlow === flow.id ? '−' : '+'}</span>
            </button>
            {openFlow === flow.id && (
              <div className="item-content">
                {flow.id === 'credit-card-expenses' && <CreditCardExpenseFlow />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
