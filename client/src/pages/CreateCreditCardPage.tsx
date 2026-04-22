import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCreditCards } from '../contexts/CreditCardsContext'
import { useDropdownOptions } from '../hooks/useDropdownOptions'
import { useFormattedNumber } from '../hooks/useFormattedNumber'
import { CustomSelect } from '../components/common/CustomSelect'
import './CreateCreditCard.css'

export function CreateCreditCardPage() {
  const { user } = useAuth()
  const { addCard } = useCreditCards()
  const navigate = useNavigate()
  const { options: companyOptions, loading: companiesLoading, addOption, removeOption } = useDropdownOptions('credit_card_company')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const expenseLimit = useFormattedNumber()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = name.trim() && company.trim() && expenseLimit.raw && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !canSubmit) return

    setSubmitting(true)
    setError('')

    const { data, error } = await supabase
      .from('credit_cards')
      .insert({
        user_id: user.id,
        name: name.trim(),
        company: company.trim(),
        expense_limit: parseInt(expenseLimit.raw, 10),
      })
      .select('id, name, company, expense_limit')
      .single()

    if (error || !data) {
      setError('שגיאה ביצירת כרטיס אשראי')
      setSubmitting(false)
    } else {
      addCard(data)
      navigate('/entry/credit-cards')
    }
  }

  return (
    <div className="create-card-page">
      <Link to="/entry/credit-cards" className="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
        </svg>
        חזרה לכרטיסי אשראי
      </Link>

      <h1>כרטיס אשראי חדש</h1>

      <form className="create-card-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label>שם הכרטיס</label>
          <input
            type="text"
            placeholder="הכנס שם הכרטיס"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label>חברה</label>
          <CustomSelect
            options={companyOptions}
            value={company}
            placeholder="בחר חברה"
            onChange={setCompany}
            onAddOption={addOption}
            onRemoveOption={removeOption}
            loading={companiesLoading}
          />
        </div>

        <div className="form-field">
          <label>מסגרת הוצאות (₪)</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="הכנס מסגרת הוצאות"
            value={expenseLimit.display}
            onChange={expenseLimit.onChange}
            required
          />
        </div>

        {error && <div className="sources-error">{error}</div>}

        <button type="submit" className="submit-btn" disabled={!canSubmit}>
          {submitting ? 'שומר...' : 'שמירה'}
        </button>
      </form>
    </div>
  )
}
