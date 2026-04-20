import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { DateInput } from '../components/common/DateInput'
import { CustomSelect } from '../components/common/CustomSelect'
import './TrackingEditPage.css'

const PAYBACK_METHODS = [
  'העברה בנקאית',
  'מזומן',
  'פייבוקס',
  'ביט',
  'אחר',
]

interface ActionLog {
  id: string
  action_type: string
  action_label: string
  status: 'open' | 'closed'
  reference_id: string | null
  summary: string
  created_at: string
}

export function TrackingEditPage() {
  const { logId } = useParams<{ logId: string }>()
  const navigate = useNavigate()
  const [actionLog, setActionLog] = useState<ActionLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Credit card expense fields
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [expenseDateError, setExpenseDateError] = useState('')
  const [amount, setAmount] = useState('')

  // Payback fields
  const [debtorName, setDebtorName] = useState('')
  const [paybackAmount, setPaybackAmount] = useState('')
  const [paybackMethod, setPaybackMethod] = useState('')
  const [isPaid, setIsPaid] = useState(false)

  useEffect(() => {
    fetchData()
  }, [logId])

  const fetchData = async () => {
    if (!logId) return

    const { data: log, error: logError } = await supabase
      .from('action_logs')
      .select('*')
      .eq('id', logId)
      .single()

    if (logError || !log) {
      setLoading(false)
      return
    }

    setActionLog(log)

    if (log.action_type === 'credit_card_expense' && log.reference_id) {
      const { data } = await supabase
        .from('credit_card_expenses')
        .select('*')
        .eq('id', log.reference_id)
        .single()

      if (data) {
        setTitle(data.title)
        setCategory(data.category)
        setAmount(String(data.amount))
        // Convert ISO date to DD/MM/YYYY
        if (data.expense_date) {
          const [y, m, d] = data.expense_date.split('-')
          setExpenseDate(`${d}/${m}/${y}`)
        }
      }
    } else if (log.action_type === 'payback' && log.reference_id) {
      const { data } = await supabase
        .from('paybacks')
        .select('*')
        .eq('id', log.reference_id)
        .single()

      if (data) {
        setDebtorName(data.debtor_name)
        setPaybackAmount(String(data.amount))
        setPaybackMethod(data.payback_method)
        setIsPaid(data.is_paid)
      }
    }

    setLoading(false)
  }

  const parseDateInput = (value: string): string | null => {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!match) return null
    const [, day, month, year] = match
    const d = parseInt(day, 10)
    const m = parseInt(month, 10)
    if (m < 1 || m > 12 || d < 1 || d > 31) return null
    return `${year}-${month}-${day}`
  }

  const handleSave = async () => {
    if (!actionLog || !actionLog.reference_id) return

    setSaving(true)
    setMessage(null)
    setExpenseDateError('')

    if (actionLog.action_type === 'credit_card_expense') {
      const isoDate = parseDateInput(expenseDate)
      if (!isoDate) {
        setExpenseDateError('יש להזין תאריך בפורמט DD/MM/YYYY')
        setSaving(false)
        return
      }

      const numAmount = parseFloat(amount)
      const { error } = await supabase
        .from('credit_card_expenses')
        .update({ title, category, expense_date: isoDate, amount: numAmount })
        .eq('id', actionLog.reference_id)

      if (error) {
        setMessage({ type: 'error', text: 'שגיאה בשמירה' })
        setSaving(false)
        return
      }

      // Credit card expenses are always closed
      const newSummary = `${title} – ₪${numAmount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`
      await supabase
        .from('action_logs')
        .update({ status: 'closed', summary: newSummary })
        .eq('id', actionLog.id)

      setSaving(false)
      navigate('/tracking')
      return
    } else if (actionLog.action_type === 'payback') {
      const numAmount = parseFloat(paybackAmount)
      const { error } = await supabase
        .from('paybacks')
        .update({
          debtor_name: debtorName,
          amount: numAmount,
          payback_method: paybackMethod,
          is_paid: isPaid,
        })
        .eq('id', actionLog.reference_id)

      if (error) {
        setMessage({ type: 'error', text: 'שגיאה בשמירה' })
        setSaving(false)
        return
      }

      // Payback: closed if paid, open if not
      const newStatus = isPaid ? 'closed' : 'open'
      const newSummary = `${debtorName} – ₪${numAmount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`
      await supabase
        .from('action_logs')
        .update({ status: newStatus, summary: newSummary })
        .eq('id', actionLog.id)

      setSaving(false)
      navigate('/tracking')
      return
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="action-page">
        <div className="action-page-card">
          <p>טוען...</p>
        </div>
      </div>
    )
  }

  if (!actionLog) {
    return (
      <div className="action-page">
        <div className="action-page-card">
          <button className="action-page-close" onClick={() => navigate('/tracking')} aria-label="סגור">
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
        <button className="action-page-close" onClick={() => navigate('/tracking')} aria-label="סגור">
          ✕
        </button>

        <div className="action-card">
          <h3>{actionLog.action_label}</h3>

          {actionLog.action_type === 'credit_card_expense' && (
            <div className="action-form">
              <div className="action-field">
                <label htmlFor="edit-title">שם ההוצאה</label>
                <input
                  id="edit-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-category">קטגוריה</label>
                <input
                  id="edit-category"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-date">תאריך (DD/MM/YYYY)</label>
                <DateInput
                  id="edit-date"
                  value={expenseDate}
                  onChange={(val) => {
                    setExpenseDate(val)
                    setExpenseDateError('')
                  }}
                  required
                  error={expenseDateError}
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-amount">סכום (₪)</label>
                <input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {actionLog.action_type === 'payback' && (
            <div className="action-form">
              <div className="action-field">
                <label htmlFor="edit-debtor">מי צריך להחזיר לי</label>
                <input
                  id="edit-debtor"
                  type="text"
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  required
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-payback-amount">סכום (₪)</label>
                <input
                  id="edit-payback-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paybackAmount}
                  onChange={(e) => setPaybackAmount(e.target.value)}
                  required
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-payback-method">אמצעי החזר</label>
                <CustomSelect
                  id="edit-payback-method"
                  value={paybackMethod}
                  onChange={setPaybackMethod}
                  placeholder="בחר אמצעי החזר"
                  required
                  options={PAYBACK_METHODS.map((m) => ({ value: m, label: m }))}
                />
              </div>
              <div className="action-field action-toggle">
                <label htmlFor="edit-is-paid">האם שילם?</label>
                <div className="toggle-switch">
                  <input
                    id="edit-is-paid"
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    role="switch"
                    aria-checked={isPaid}
                  />
                  <span className="toggle-slider" onClick={() => setIsPaid(!isPaid)} />
                </div>
              </div>
            </div>
          )}

          <button
            className="action-submit tracking-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'שומר...' : 'שמור'}
          </button>

          {message && (
            <p className={`action-message action-message--${message.type}`}>{message.text}</p>
          )}
        </div>
      </div>
    </div>
  )
}
