import './ConfirmDialog.css'

interface ConfirmDialogProps {
  message: string
  itemName?: string
  details?: string[]
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ message, itemName, details, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-box" onClick={e => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        {itemName && <p className="confirm-item-name">{itemName}</p>}
        {details && details.length > 0 && (
          <>
            <p className="confirm-cascade-label">פריטים נוספים שיימחקו:</p>
            <ul className="confirm-details">
              {details.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </>
        )}
        <div className="confirm-actions">
          <button className="confirm-btn confirm-yes" onClick={onConfirm}>מחק</button>
          <button className="confirm-btn confirm-no" onClick={onCancel}>ביטול</button>
        </div>
      </div>
    </div>
  )
}
