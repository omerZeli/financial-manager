import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { DateInput } from '../common/DateInput'
import { CustomSelect } from '../common/CustomSelect'
import { useDropdownOptions } from '../../hooks/useDropdownOptions'
import './CreditCardExpenseAction.css'

export function InsuranceAction() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { options: insuranceTypes, addOption: addType, removeOption: removeType } =
    useDropdownOptions('insurance_type')
  const { options: insuranceCompanies, addOption: addCompany, removeOption: removeCompany } =
    useDropdownOptions('insurance_company')

  const [insuranceType, setInsuranceType] = useState('')
  const [insuranceCompany, setInsuranceCompany] = useState('')
  const [firstChargeDate, setFirstChargeDate] = useState('')
  const [firstChargeDateError, setFirstChargeDateError] = useState('')
  const [monthlyPayment, setMonthlyPayment] = useState('')
  const [hasEndDate, setHasEndDate] = useState(false)
  const [endDate, setEndDate] = useState('')
  const [endDateError, setEndDateError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const parseDateInput = (value: string): string | null => {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!match) return null
    const [, day, month, year] = match
    const d = parseInt(day, 10)
    const m = parseInt(month, 10)
    if (m < 1 || m > 12 || d < 1 || d > 31) return null
    return `${year}-${month}-${day}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage(null)
    setFirstChargeDateError('')
    setEndDateError('')

    const isoFirstCharge = parseDateInput(firstChargeDate)
    if (!isoFirstCharge) {
      setFirstChargeDateError('יש להזין תאריך בפורמט DD/MM/YYYY')
      setLoading(false)
      return
    }

    let isoEndDate: string | null = null
    if (hasEndDate) {
      isoEndDate = parseDateInput(endDate)
      if (!isoEndDate) {
        setEndDateError('יש להזין תאריך בפורמט DD/MM/YYYY')
        setLoading(false)
        return
      }
    }

    const payment = parseFloat(monthlyPayment)
    const { data, error } = await supabase.from('insurances').insert({
      user_id: user.id,
      insurance_type: insuranceType,
      insurance_company: insuranceCompany,
      first_charge_date: isoFirstCharge,
      monthly_payment: payment,
      has_end_date: hasEndDate,
      end_date: isoEndDate,
    }).select('id').single()

    if (error) {
      setMessage({ type: 'error', text: 'שגיאה בשמירת הביטוח' })
    } else {
      await supabase.from('action_logs').insert({
        user_id: user.id,
        action_type: 'insurance',
        action_label: 'ביטוח חיים ובריאות',
        status: 'closed',
        reference_id: data?.id,
        summary: `${insuranceType} – ${insuranceCompany} – ₪${payment.toLocaleString('he-IL', { maximumFractionDigits: 0 })}/חודש`,
      })
      navigate(-1)
    }

    setLoading(false)
  }

  return (
    <div className="action-card">
      <h3>ביטוח חיים ובריאות</h3>
      <form onSubmit={handleSubmit} className="action-form">
        <div className="action-field">
          <label htmlFor="insurance-type">סוג ביטוח</label>
          <CustomSelect
            id="insurance-type"
            value={insuranceType}
            onChange={setInsuranceType}
            placeholder="בחר סוג ביטוח"
            required
            options={insuranceTypes.map((t) => ({ value: t, label: t }))}
            onAddOption={addType}
            onRemoveOption={removeType}
          />
        </div>
        <div className="action-field">
          <label htmlFor="insurance-company">חברת ביטוח</label>
          <CustomSelect
            id="insurance-company"
            value={insuranceCompany}
            onChange={setInsuranceCompany}
            placeholder="בחר חברת ביטוח"
            required
            options={insuranceCompanies.map((c) => ({ value: c, label: c }))}
            onAddOption={addCompany}
            onRemoveOption={removeCompany}
          />
        </div>
        <div className="action-field">
          <label htmlFor="insurance-first-charge">חיוב ראשון (DD/MM/YYYY)</label>
          <DateInput
            id="insurance-first-charge"
            value={firstChargeDate}
            onChange={(val) => {
              setFirstChargeDate(val)
              setFirstChargeDateError('')
            }}
            required
            error={firstChargeDateError}
          />
        </div>
        <div className="action-field">
          <label htmlFor="insurance-monthly">תשלום חודשי (₪)</label>
          <input
            id="insurance-monthly"
            type="number"
            step="1"
            min="0"
            value={monthlyPayment}
            onChange={(e) => setMonthlyPayment(e.target.value)}
            required
            placeholder="0"
          />
        </div>
        <div className="action-field action-toggle">
          <label htmlFor="insurance-has-end-date">יש תאריך סיום?</label>
          <div className="toggle-switch">
            <input
              id="insurance-has-end-date"
              type="checkbox"
              checked={hasEndDate}
              onChange={(e) => setHasEndDate(e.target.checked)}
              role="switch"
              aria-checked={hasEndDate}
            />
            <span className="toggle-slider" onClick={() => setHasEndDate(!hasEndDate)} />
          </div>
        </div>
        {hasEndDate && (
          <div className="action-field">
            <label htmlFor="insurance-end-date">תאריך סיום (DD/MM/YYYY)</label>
            <DateInput
              id="insurance-end-date"
              value={endDate}
              onChange={(val) => {
                setEndDate(val)
                setEndDateError('')
              }}
              required
              error={endDateError}
            />
          </div>
        )}
        <button type="submit" className="action-submit" disabled={loading}>
          {loading ? 'שומר...' : 'שמור ביטוח'}
        </button>
        {message && (
          <p className={`action-message action-message--${message.type}`}>{message.text}</p>
        )}
      </form>
    </div>
  )
}
