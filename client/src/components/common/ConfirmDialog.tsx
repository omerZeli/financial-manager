import './ConfirmDialog.css'

interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-box" onClick={e => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-yes" onClick={onConfirm}>מחק</button>
          <button className="confirm-btn confirm-no" onClick={onCancel}>ביטול</button>
        </div>
      </div>
    </div>
  )
}
