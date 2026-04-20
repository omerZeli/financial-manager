import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { DateInput } from '../components/common/DateInput'
import { CustomSelect } from '../components/common/CustomSelect'
import { useDropdownOptions } from '../hooks/useDropdownOptions'
import './TrackingEditPage.css'

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
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { options: paybackMethods, addOption: addPaybackMethod, removeOption: removePaybackMethod } =
    useDropdownOptions('payback_method')
  const { options: categories, addOption: addCategory, removeOption: removeCategory } =
    useDropdownOptions('expense_category')
  const { options: people, addOption: addPerson, removeOption: removePerson } =
    useDropdownOptions('person_name')

  // Credit card expense fields
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [expenseDateError, setExpenseDateError] = useState('')
  const [amount, setAmount] = useState('')
  const [requiresPayback, setRequiresPayback] = useState(false)

  // Payback fields
  const [debtorName, setDebtorName] = useState('')
  const [paybackAmount, setPaybackAmount] = useState('')
  const [paybackMethod, setPaybackMethod] = useState('')
  const [isPaid, setIsPaid] = useState(false)

  // Outgoing payback fields
  const [creditorName, setCreditorName] = useState('')
  const [outgoingAmount, setOutgoingAmount] = useState('')
  const [outgoingMethod, setOutgoingMethod] = useState('')

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
        setRequiresPayback(data.requires_payback ?? false)
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
    } else if (log.action_type === 'outgoing_payback' && log.reference_id) {
      const { data } = await supabase
        .from('outgoing_paybacks')
        .select('*')
        .eq('id', log.reference_id)
        .single()

      if (data) {
        setCreditorName(data.creditor_name)
        setOutgoingAmount(String(data.amount))
        setOutgoingMethod(data.payback_method)
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

  const handleDelete = async () => {
    if (!actionLog) return

    setDeleting(true)
    setMessage(null)
    setShowDeleteConfirm(false)

    // Delete the referenced record
    if (actionLog.reference_id) {
      if (actionLog.action_type === 'credit_card_expense') {
        const { error: refErr } = await supabase
          .from('credit_card_expenses')
          .delete()
          .eq('id', actionLog.reference_id)
          .select()
        if (refErr) console.error('Failed to delete credit_card_expense:', refErr)
      } else if (actionLog.action_type === 'payback') {
        const { error: refErr } = await supabase
          .from('paybacks')
          .delete()
          .eq('id', actionLog.reference_id)
          .select()
        if (refErr) console.error('Failed to delete payback:', refErr)
      } else if (actionLog.action_type === 'outgoing_payback') {
        const { error: refErr } = await supabase
          .from('outgoing_paybacks')
          .delete()
          .eq('id', actionLog.reference_id)
          .select()
        if (refErr) console.error('Failed to delete outgoing_payback:', refErr)
      }
    }

    // Delete any chained action logs and their references
    const { data: chainedLogs } = await supabase
      .from('action_logs')
      .select('id, action_type, reference_id')
      .eq('triggered_by', actionLog.id)

    if (chainedLogs) {
      for (const chained of chainedLogs) {
        if (chained.reference_id) {
          if (chained.action_type === 'payback') {
            await supabase.from('paybacks').delete().eq('id', chained.reference_id).select()
          } else if (chained.action_type === 'outgoing_payback') {
            await supabase.from('outgoing_paybacks').delete().eq('id', chained.reference_id).select()
          } else if (chained.action_type === 'credit_card_expense') {
            await supabase.from('credit_card_expenses').delete().eq('id', chained.reference_id).select()
          }
        }
        await supabase.from('action_logs').delete().eq('id', chained.id).select()
      }
    }

    // Delete the action log itself
    const { error } = await supabase.from('action_logs').delete().eq('id', actionLog.id).select()

    if (error) {
      setMessage({ type: 'error', text: 'שגיאה במחיקה' })
      setDeleting(false)
      return
    }

    navigate('/tracking')
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
        .update({ title, category, expense_date: isoDate, amount: numAmount, requires_payback: requiresPayback })
        .eq('id', actionLog.reference_id)

      if (error) {
        setMessage({ type: 'error', text: 'שגיאה בשמירה' })
        setSaving(false)
        return
      }

      const newSummary = `${title} – ₪${numAmount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`
      await supabase
        .from('action_logs')
        .update({ status: 'closed', summary: newSummary })
        .eq('id', actionLog.id)

      if (requiresPayback) {
        const { data: existingChained } = await supabase
          .from('action_logs')
          .select('id')
          .eq('triggered_by', actionLog.id)
          .limit(1)

        if (!existingChained || existingChained.length === 0) {
          setSaving(false)
          navigate('/actions/paybacks', {
            state: {
              triggeredBy: actionLog.id,
              prefillAmount: String(numAmount),
            },
          })
          return
        }
      }

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

      const newStatus = isPaid ? 'closed' : 'open'
      const newSummary = `${debtorName} – ₪${numAmount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`
      await supabase
        .from('action_logs')
        .update({ status: newStatus, summary: newSummary })
        .eq('id', actionLog.id)

      setSaving(false)
      navigate('/tracking')
      return
    } else if (actionLog.action_type === 'outgoing_payback') {
      const numAmount = parseFloat(outgoingAmount)
      const { error } = await supabase
        .from('outgoing_paybacks')
        .update({
          creditor_name: creditorName,
          amount: numAmount,
          payback_method: outgoingMethod,
        })
        .eq('id', actionLog.reference_id)

      if (error) {
        setMessage({ type: 'error', text: 'שגיאה בשמירה' })
        setSaving(false)
        return
      }

      const newSummary = `${creditorName} – ₪${numAmount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`
      await supabase
        .from('action_logs')
        .update({ status: 'closed', summary: newSummary })
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
        <button
          className="tracking-delete-btn"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={deleting}
          aria-label="מחק"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
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
                <CustomSelect
                  id="edit-category"
                  value={category}
                  onChange={setCategory}
                  placeholder="בחר קטגוריה"
                  required
                  options={categories.map((c) => ({ value: c, label: c }))}
                  onAddOption={addCategory}
                  onRemoveOption={removeCategory}
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
              <div className="action-field action-toggle">
                <label htmlFor="edit-requires-payback">מישהו צריך להחזיר לי?</label>
                <div className="toggle-switch">
                  <input
                    id="edit-requires-payback"
                    type="checkbox"
                    checked={requiresPayback}
                    onChange={(e) => setRequiresPayback(e.target.checked)}
                    role="switch"
                    aria-checked={requiresPayback}
                  />
                  <span className="toggle-slider" onClick={() => setRequiresPayback(!requiresPayback)} />
                </div>
              </div>
            </div>
          )}

          {actionLog.action_type === 'payback' && (
            <div className="action-form">
              <div className="action-field">
                <label htmlFor="edit-debtor">מי צריך להחזיר לי</label>
                <CustomSelect
                  id="edit-debtor"
                  value={debtorName}
                  onChange={setDebtorName}
                  placeholder="בחר שם"
                  required
                  options={people.map((p) => ({ value: p, label: p }))}
                  onAddOption={addPerson}
                  onRemoveOption={removePerson}
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
                  options={paybackMethods.map((m) => ({ value: m, label: m }))}
                  onAddOption={addPaybackMethod}
                  onRemoveOption={removePaybackMethod}
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

          {actionLog.action_type === 'outgoing_payback' && (
            <div className="action-form">
              <div className="action-field">
                <label htmlFor="edit-creditor">למי אני מחזיר</label>
                <CustomSelect
                  id="edit-creditor"
                  value={creditorName}
                  onChange={setCreditorName}
                  placeholder="בחר שם"
                  required
                  options={people.map((p) => ({ value: p, label: p }))}
                  onAddOption={addPerson}
                  onRemoveOption={removePerson}
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-outgoing-amount">סכום (₪)</label>
                <input
                  id="edit-outgoing-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={outgoingAmount}
                  onChange={(e) => setOutgoingAmount(e.target.value)}
                  required
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-outgoing-method">אמצעי החזר</label>
                <CustomSelect
                  id="edit-outgoing-method"
                  value={outgoingMethod}
                  onChange={setOutgoingMethod}
                  placeholder="בחר אמצעי החזר"
                  required
                  options={paybackMethods.map((m) => ({ value: m, label: m }))}
                  onAddOption={addPaybackMethod}
                  onRemoveOption={removePaybackMethod}
                />
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

      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p className="delete-confirm-text">האם למחוק את הפעולה?</p>
            <div className="delete-confirm-actions">
              <button className="delete-confirm-cancel" onClick={() => setShowDeleteConfirm(false)}>
                ביטול
              </button>
              <button className="delete-confirm-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'מוחק...' : 'מחק'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
