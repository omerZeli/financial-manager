import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCreditCards, type CreditCard } from '../contexts/CreditCardsContext'
import { ConfirmModal } from '../components/common/ConfirmModal'
import './CreditCards.css'

export function CreditCardsPage() {
  const { cards, loading, error, deleteCard } = useCreditCards()
  const [deleteTarget, setDeleteTarget] = useState<CreditCard | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteCard(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
  }

  return (
    <div className="credit-cards-page">
      <Link to="/entry/income-sources" className="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
        </svg>
        חזרה למקורות הכנסה
      </Link>

      <div className="credit-cards-header">
        <h1>כרטיסי אשראי</h1>
        <Link to="/entry/credit-cards/new" className="add-card-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" /><path d="M5 12h14" />
          </svg>
          הוספת כרטיס
        </Link>
      </div>

      {error && <div className="sources-error">{error}</div>}

      {loading ? (
        <div className="cards-loading">טוען...</div>
      ) : cards.length === 0 ? (
        <div className="cards-empty">אין כרטיסי אשראי עדיין. לחץ על "הוספת כרטיס" כדי להתחיל.</div>
      ) : (
        <div className="cards-list">
          {cards.map((card) => (
            <div key={card.id} className="card-item">
              <div className="card-info-wrapper">
                <div className="card-info">
                  <span className="card-name">{card.name}</span>
                  <span className="card-details">
                    {card.company} · מסגרת: ₪{card.expense_limit.toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                className="delete-card-btn"
                onClick={() => setDeleteTarget(card)}
                aria-label={`מחיקת ${card.name}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="cards-footer">
        <button className="next-btn">הבא</button>
      </div>

      {deleteTarget && (
        <ConfirmModal
          message={`למחוק את "${deleteTarget.name}"?`}
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
