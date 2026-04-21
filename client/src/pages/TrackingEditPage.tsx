import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { DateInput } from '../components/common/DateInput'
import { CustomSelect } from '../components/common/CustomSelect'
import { useDropdownOptions } from '../hooks/useDropdownOptions'
import { useInvestmentChannels } from '../hooks/useInvestmentChannels'
import { actionTypeCategoryMap } from '../lib/categories'
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
  const { options: companies, addOption: addCompany, removeOption: removeCompany } =
    useDropdownOptions('financial_company')
  const { channels } = useInvestmentChannels()
  const { options: depositors, addOption: addDepositor, removeOption: removeDepositor } =
    useDropdownOptions('depositor_name')
  const { options: insuranceTypes, addOption: addInsType, removeOption: removeInsType } =
    useDropdownOptions('insurance_type')
  const { options: insuranceCompanies, addOption: addInsCompany, removeOption: removeInsCompany } =
    useDropdownOptions('insurance_company')
  const { options: carCategories, addOption: addCarCategory, removeOption: removeCarCategory } =
    useDropdownOptions('car_expense_category')

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
  const [outgoingReason, setOutgoingReason] = useState('')
  const [outgoingCategory, setOutgoingCategory] = useState('')
  const [creditorName, setCreditorName] = useState('')
  const [outgoingAmount, setOutgoingAmount] = useState('')
  const [outgoingMethod, setOutgoingMethod] = useState('')

  // Investment channel fields
  const [channelName, setChannelName] = useState('')
  const [financialCompany, setFinancialCompany] = useState('')
  const [investmentTrack, setInvestmentTrack] = useState('')

  // Investment deposit fields
  const [depositChannelId, setDepositChannelId] = useState('')
  const [depositDate, setDepositDate] = useState('')
  const [depositDateError, setDepositDateError] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [depositorName, setDepositorName] = useState('')

  // Update investment value fields
  const [valueChannelId, setValueChannelId] = useState('')
  const [currentValue, setCurrentValue] = useState('')

  // Fixed expense fields
  const [fixedName, setFixedName] = useState('')
  const [fixedCategory, setFixedCategory] = useState('')
  const [fixedStartDate, setFixedStartDate] = useState('')
  const [fixedStartDateError, setFixedStartDateError] = useState('')
  const [fixedFrequencyValue, setFixedFrequencyValue] = useState('')
  const [fixedFrequencyUnit, setFixedFrequencyUnit] = useState('')
  const [fixedAmount, setFixedAmount] = useState('')
  const [fixedHasEndDate, setFixedHasEndDate] = useState(false)
  const [fixedEndDate, setFixedEndDate] = useState('')
  const [fixedEndDateError, setFixedEndDateError] = useState('')

  // Insurance fields
  const [insType, setInsType] = useState('')
  const [insCompany, setInsCompany] = useState('')
  const [insFirstCharge, setInsFirstCharge] = useState('')
  const [insFirstChargeError, setInsFirstChargeError] = useState('')
  const [insMonthlyPayment, setInsMonthlyPayment] = useState('')
  const [insHasEndDate, setInsHasEndDate] = useState(false)
  const [insEndDate, setInsEndDate] = useState('')
  const [insEndDateError, setInsEndDateError] = useState('')

  // Car expense fields
  const [carName, setCarName] = useState('')
  const [carCategory, setCarCategory] = useState('')
  const [carAmount, setCarAmount] = useState('')
  const [carIsFixed, setCarIsFixed] = useState(false)
  const [carStartDate, setCarStartDate] = useState('')
  const [carStartDateError, setCarStartDateError] = useState('')
  const [carFrequencyValue, setCarFrequencyValue] = useState('')
  const [carFrequencyUnit, setCarFrequencyUnit] = useState('')
  const [carHasEndDate, setCarHasEndDate] = useState(false)
  const [carEndDate, setCarEndDate] = useState('')
  const [carEndDateError, setCarEndDateError] = useState('')

  const getTrackingUrl = () => {
    if (!actionLog) return '/tracking'
    const cat = actionTypeCategoryMap[actionLog.action_type]
    return cat ? `/tracking?cat=${cat}` : '/tracking'
  }

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
        setOutgoingReason(data.reason ?? '')
        setOutgoingCategory(data.category ?? '')
        setCreditorName(data.creditor_name)
        setOutgoingAmount(String(data.amount))
        setOutgoingMethod(data.payback_method)
      }
    } else if (log.action_type === 'investment_channel' && log.reference_id) {
      const { data } = await supabase
        .from('investment_channels')
        .select('*')
        .eq('id', log.reference_id)
        .single()

      if (data) {
        setChannelName(data.channel_name)
        setFinancialCompany(data.financial_company)
        setInvestmentTrack(data.investment_track)
      }
    } else if (log.action_type === 'investment_deposit' && log.reference_id) {
      const { data } = await supabase
        .from('investment_deposits')
        .select('*')
        .eq('id', log.reference_id)
        .single()

      if (data) {
        setDepositChannelId(data.investment_channel_id)
        setDepositAmount(String(data.amount))
        setDepositorName(data.depositor_name)
        if (data.deposit_date) {
          const [y, m, d] = data.deposit_date.split('-')
          setDepositDate(`${d}/${m}/${y}`)
        }
      }
    } else if (log.action_type === 'update_investment_value' && log.reference_id) {
      const { data } = await supabase
        .from('investment_channels')
        .select('*')
        .eq('id', log.reference_id)
        .single()

      if (data) {
        setValueChannelId(data.id)
        setCurrentValue(data.current_value != null ? String(data.current_value) : '')
      }
    } else if (log.action_type === 'fixed_expense' && log.reference_id) {
      const { data } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('id', log.reference_id)
        .single()

      if (data) {
        setFixedName(data.name)
        setFixedCategory(data.category)
        setFixedAmount(String(data.amount))
        setFixedFrequencyValue(String(data.frequency_value))
        setFixedFrequencyUnit(data.frequency_unit)
        setFixedHasEndDate(data.has_end_date)
        if (data.start_date) {
          const [y, m, d] = data.start_date.split('-')
          setFixedStartDate(`${d}/${m}/${y}`)
        }
        if (data.end_date) {
          const [y, m, d] = data.end_date.split('-')
          setFixedEndDate(`${d}/${m}/${y}`)
        }
      }
    } else if (log.action_type === 'insurance' && log.reference_id) {
      const { data } = await supabase
        .from('insurances')
        .select('*')
        .eq('id', log.reference_id)
        .single()

      if (data) {
        setInsType(data.insurance_type)
        setInsCompany(data.insurance_company)
        setInsMonthlyPayment(String(data.monthly_payment))
        setInsHasEndDate(data.has_end_date)
        if (data.first_charge_date) {
          const [y, m, d] = data.first_charge_date.split('-')
          setInsFirstCharge(`${d}/${m}/${y}`)
        }
        if (data.end_date) {
          const [y, m, d] = data.end_date.split('-')
          setInsEndDate(`${d}/${m}/${y}`)
        }
      }
    } else if (log.action_type === 'car_expense' && log.reference_id) {
      const { data } = await supabase
        .from('car_expenses')
        .select('*')
        .eq('id', log.reference_id)
        .single()

      if (data) {
        setCarName(data.name)
        setCarCategory(data.category)
        setCarAmount(String(data.amount))
        setCarIsFixed(data.is_fixed)
        setCarHasEndDate(data.has_end_date)
        if (data.start_date) {
          const [y, m, d] = data.start_date.split('-')
          setCarStartDate(`${d}/${m}/${y}`)
        }
        if (data.frequency_value) setCarFrequencyValue(String(data.frequency_value))
        if (data.frequency_unit) setCarFrequencyUnit(data.frequency_unit)
        if (data.end_date) {
          const [y, m, d] = data.end_date.split('-')
          setCarEndDate(`${d}/${m}/${y}`)
        }
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
      } else if (actionLog.action_type === 'investment_channel') {
        const { error: refErr } = await supabase
          .from('investment_channels')
          .delete()
          .eq('id', actionLog.reference_id)
          .select()
        if (refErr) console.error('Failed to delete investment_channel:', refErr)
      } else if (actionLog.action_type === 'investment_deposit') {
        const { error: refErr } = await supabase
          .from('investment_deposits')
          .delete()
          .eq('id', actionLog.reference_id)
          .select()
        if (refErr) console.error('Failed to delete investment_deposit:', refErr)
      } else if (actionLog.action_type === 'update_investment_value') {
        // No record to delete — this action updates an existing channel
      } else if (actionLog.action_type === 'fixed_expense') {
        const { error: refErr } = await supabase
          .from('fixed_expenses')
          .delete()
          .eq('id', actionLog.reference_id)
          .select()
        if (refErr) console.error('Failed to delete fixed_expense:', refErr)
      } else if (actionLog.action_type === 'insurance') {
        const { error: refErr } = await supabase
          .from('insurances')
          .delete()
          .eq('id', actionLog.reference_id)
          .select()
        if (refErr) console.error('Failed to delete insurance:', refErr)
      } else if (actionLog.action_type === 'car_expense') {
        const { error: refErr } = await supabase
          .from('car_expenses')
          .delete()
          .eq('id', actionLog.reference_id)
          .select()
        if (refErr) console.error('Failed to delete car_expense:', refErr)
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
          } else if (chained.action_type === 'investment_channel') {
            await supabase.from('investment_channels').delete().eq('id', chained.reference_id).select()
          } else if (chained.action_type === 'investment_deposit') {
            await supabase.from('investment_deposits').delete().eq('id', chained.reference_id).select()
          } else if (chained.action_type === 'update_investment_value') {
            // No record to delete — this action updates an existing channel
          } else if (chained.action_type === 'fixed_expense') {
            await supabase.from('fixed_expenses').delete().eq('id', chained.reference_id).select()
          } else if (chained.action_type === 'insurance') {
            await supabase.from('insurances').delete().eq('id', chained.reference_id).select()
          } else if (chained.action_type === 'car_expense') {
            await supabase.from('car_expenses').delete().eq('id', chained.reference_id).select()
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

    navigate(getTrackingUrl())
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

      const newSummary = `${title} – ₪${numAmount.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`
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
      navigate(getTrackingUrl())
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
      const newSummary = `${debtorName} – ₪${numAmount.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`
      await supabase
        .from('action_logs')
        .update({ status: newStatus, summary: newSummary })
        .eq('id', actionLog.id)

      setSaving(false)
      navigate(getTrackingUrl())
      return
    } else if (actionLog.action_type === 'outgoing_payback') {
      const numAmount = parseFloat(outgoingAmount)
      const { error } = await supabase
        .from('outgoing_paybacks')
        .update({
          reason: outgoingReason,
          category: outgoingCategory,
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

      const newSummary = `${creditorName} – ₪${numAmount.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`
      await supabase
        .from('action_logs')
        .update({ status: 'closed', summary: newSummary })
        .eq('id', actionLog.id)

      setSaving(false)
      navigate(getTrackingUrl())
      return
    } else if (actionLog.action_type === 'investment_channel') {
      const { error } = await supabase
        .from('investment_channels')
        .update({
          channel_name: channelName,
          financial_company: financialCompany,
          investment_track: investmentTrack,
        })
        .eq('id', actionLog.reference_id)

      if (error) {
        setMessage({ type: 'error', text: 'שגיאה בשמירה' })
        setSaving(false)
        return
      }

      const newSummary = `${channelName} – ${financialCompany} – ${investmentTrack}`
      await supabase
        .from('action_logs')
        .update({ status: 'closed', summary: newSummary })
        .eq('id', actionLog.id)

      // Chain to deposit action if no chained deposit already exists
      const { data: existingChained } = await supabase
        .from('action_logs')
        .select('id')
        .eq('triggered_by', actionLog.id)
        .limit(1)

      if (!existingChained || existingChained.length === 0) {
        setSaving(false)
        navigate('/actions/investment-deposits', {
          state: {
            triggeredBy: actionLog.id,
            prefillChannelId: actionLog.reference_id,
          },
        })
        return
      }

      setSaving(false)
      navigate(getTrackingUrl())
      return
    } else if (actionLog.action_type === 'investment_deposit') {
      const isoDate = parseDateInput(depositDate)
      if (!isoDate) {
        setDepositDateError('יש להזין תאריך בפורמט DD/MM/YYYY')
        setSaving(false)
        return
      }

      const numAmount = parseFloat(depositAmount)
      const { error } = await supabase
        .from('investment_deposits')
        .update({
          investment_channel_id: depositChannelId,
          deposit_date: isoDate,
          amount: numAmount,
          depositor_name: depositorName,
        })
        .eq('id', actionLog.reference_id)

      if (error) {
        setMessage({ type: 'error', text: 'שגיאה בשמירה' })
        setSaving(false)
        return
      }

      const channel = channels.find((c) => c.id === depositChannelId)
      const channelLabel = channel?.channel_name ?? ''
      const newSummary = `${channelLabel} – ₪${numAmount.toLocaleString('he-IL', { maximumFractionDigits: 0 })} – ${depositorName}`
      await supabase
        .from('action_logs')
        .update({ status: 'closed', summary: newSummary })
        .eq('id', actionLog.id)

      setSaving(false)
      navigate(getTrackingUrl())
      return
    } else if (actionLog.action_type === 'update_investment_value') {
      const numValue = parseFloat(currentValue)
      const today = new Date().toISOString().split('T')[0]

      const { error } = await supabase
        .from('investment_channels')
        .update({ current_value: numValue, value_updated_at: today })
        .eq('id', actionLog.reference_id)

      if (error) {
        setMessage({ type: 'error', text: 'שגיאה בשמירה' })
        setSaving(false)
        return
      }

      const channel = channels.find((c) => c.id === actionLog.reference_id)
      const channelLabel = channel?.channel_name ?? ''
      const newSummary = `${channelLabel} – ₪${numValue.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`
      await supabase
        .from('action_logs')
        .update({ status: 'closed', summary: newSummary })
        .eq('id', actionLog.id)

      setSaving(false)
      navigate(getTrackingUrl())
      return
    } else if (actionLog.action_type === 'fixed_expense') {
      const isoStartDate = parseDateInput(fixedStartDate)
      if (!isoStartDate) {
        setFixedStartDateError('יש להזין תאריך בפורמט DD/MM/YYYY')
        setSaving(false)
        return
      }

      let isoEndDate: string | null = null
      if (fixedHasEndDate) {
        isoEndDate = parseDateInput(fixedEndDate)
        if (!isoEndDate) {
          setFixedEndDateError('יש להזין תאריך בפורמט DD/MM/YYYY')
          setSaving(false)
          return
        }
      }

      const numAmount = parseFloat(fixedAmount)
      const freqVal = parseInt(fixedFrequencyValue, 10)
      const { error } = await supabase
        .from('fixed_expenses')
        .update({
          name: fixedName,
          category: fixedCategory,
          start_date: isoStartDate,
          frequency_value: freqVal,
          frequency_unit: fixedFrequencyUnit,
          has_end_date: fixedHasEndDate,
          end_date: isoEndDate,
          amount: numAmount,
        })
        .eq('id', actionLog.reference_id)

      if (error) {
        setMessage({ type: 'error', text: 'שגיאה בשמירה' })
        setSaving(false)
        return
      }

      const unitLabels: Record<string, string> = { days: 'ימים', weeks: 'שבועות', months: 'חודשים', years: 'שנים' }
      const unitLabel = unitLabels[fixedFrequencyUnit] ?? fixedFrequencyUnit
      const newSummary = `${fixedName} – ₪${numAmount.toLocaleString('he-IL', { maximumFractionDigits: 0 })} כל ${freqVal} ${unitLabel}`
      await supabase
        .from('action_logs')
        .update({ status: 'closed', summary: newSummary })
        .eq('id', actionLog.id)

      setSaving(false)
      navigate(getTrackingUrl())
      return
    } else if (actionLog.action_type === 'insurance') {
      const isoFirstCharge = parseDateInput(insFirstCharge)
      if (!isoFirstCharge) {
        setInsFirstChargeError('יש להזין תאריך בפורמט DD/MM/YYYY')
        setSaving(false)
        return
      }

      let isoEndDate: string | null = null
      if (insHasEndDate) {
        isoEndDate = parseDateInput(insEndDate)
        if (!isoEndDate) {
          setInsEndDateError('יש להזין תאריך בפורמט DD/MM/YYYY')
          setSaving(false)
          return
        }
      }

      const payment = parseFloat(insMonthlyPayment)
      const { error } = await supabase
        .from('insurances')
        .update({
          insurance_type: insType,
          insurance_company: insCompany,
          first_charge_date: isoFirstCharge,
          monthly_payment: payment,
          has_end_date: insHasEndDate,
          end_date: isoEndDate,
        })
        .eq('id', actionLog.reference_id)

      if (error) {
        setMessage({ type: 'error', text: 'שגיאה בשמירה' })
        setSaving(false)
        return
      }

      const newSummary = `${insType} – ${insCompany} – ₪${payment.toLocaleString('he-IL', { maximumFractionDigits: 0 })}/חודש`
      await supabase
        .from('action_logs')
        .update({ status: 'closed', summary: newSummary })
        .eq('id', actionLog.id)

      setSaving(false)
      navigate(getTrackingUrl())
      return
    } else if (actionLog.action_type === 'car_expense') {
      let isoStartDate: string | null = null
      let isoEndDate: string | null = null

      if (carIsFixed) {
        isoStartDate = parseDateInput(carStartDate)
        if (!isoStartDate) {
          setCarStartDateError('יש להזין תאריך בפורמט DD/MM/YYYY')
          setSaving(false)
          return
        }
        if (carHasEndDate) {
          isoEndDate = parseDateInput(carEndDate)
          if (!isoEndDate) {
            setCarEndDateError('יש להזין תאריך בפורמט DD/MM/YYYY')
            setSaving(false)
            return
          }
        }
      }

      const numAmount = parseFloat(carAmount)
      const { error } = await supabase
        .from('car_expenses')
        .update({
          name: carName,
          category: carCategory,
          amount: numAmount,
          is_fixed: carIsFixed,
          start_date: isoStartDate,
          frequency_value: carIsFixed ? parseInt(carFrequencyValue, 10) : null,
          frequency_unit: carIsFixed ? carFrequencyUnit : null,
          has_end_date: carIsFixed ? carHasEndDate : false,
          end_date: isoEndDate,
        })
        .eq('id', actionLog.reference_id)

      if (error) {
        setMessage({ type: 'error', text: 'שגיאה בשמירה' })
        setSaving(false)
        return
      }

      const unitLabels: Record<string, string> = { days: 'ימים', weeks: 'שבועות', months: 'חודשים', years: 'שנים' }
      let newSummary = `${carName} – ₪${numAmount.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`
      if (carIsFixed) {
        const unitLabel = unitLabels[carFrequencyUnit] ?? carFrequencyUnit
        newSummary += ` כל ${carFrequencyValue} ${unitLabel}`
      }
      await supabase
        .from('action_logs')
        .update({ status: 'closed', summary: newSummary })
        .eq('id', actionLog.id)

      setSaving(false)
      navigate(getTrackingUrl())
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
          <button className="action-page-close" onClick={() => navigate(-1)} aria-label="סגור">
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
        <button className="action-page-close" onClick={() => navigate(-1)} aria-label="סגור">
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
                  step="1"
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
                  step="1"
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
                <label htmlFor="edit-outgoing-reason">סיבת ההחזר</label>
                <input
                  id="edit-outgoing-reason"
                  type="text"
                  value={outgoingReason}
                  onChange={(e) => setOutgoingReason(e.target.value)}
                  required
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-outgoing-category">קטגוריה</label>
                <CustomSelect
                  id="edit-outgoing-category"
                  value={outgoingCategory}
                  onChange={setOutgoingCategory}
                  placeholder="בחר קטגוריה"
                  required
                  options={categories.map((c) => ({ value: c, label: c }))}
                  onAddOption={addCategory}
                  onRemoveOption={removeCategory}
                />
              </div>
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
                  step="1"
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

          {actionLog.action_type === 'investment_channel' && (
            <div className="action-form">
              <div className="action-field">
                <label htmlFor="edit-channel-name">שם אפיק השקעה</label>
                <input
                  id="edit-channel-name"
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  required
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-financial-company">חברה מנהלת</label>
                <CustomSelect
                  id="edit-financial-company"
                  value={financialCompany}
                  onChange={setFinancialCompany}
                  placeholder="בחר חברה"
                  required
                  options={companies.map((c) => ({ value: c, label: c }))}
                  onAddOption={addCompany}
                  onRemoveOption={removeCompany}
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-investment-track">מסלול השקעה</label>
                <input
                  id="edit-investment-track"
                  type="text"
                  value={investmentTrack}
                  onChange={(e) => setInvestmentTrack(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {actionLog.action_type === 'investment_deposit' && (
            <div className="action-form">
              <div className="action-field">
                <label htmlFor="edit-deposit-channel">אפיק השקעה</label>
                <CustomSelect
                  id="edit-deposit-channel"
                  value={depositChannelId}
                  onChange={setDepositChannelId}
                  placeholder="בחר אפיק השקעה"
                  required
                  options={channels.map((c) => ({ value: c.id, label: `${c.channel_name} – ${c.financial_company}` }))}
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-deposit-date">תאריך (DD/MM/YYYY)</label>
                <DateInput
                  id="edit-deposit-date"
                  value={depositDate}
                  onChange={(val) => {
                    setDepositDate(val)
                    setDepositDateError('')
                  }}
                  required
                  error={depositDateError}
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-deposit-amount">סכום (₪)</label>
                <input
                  id="edit-deposit-amount"
                  type="number"
                  step="1"
                  min="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  required
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-depositor">מי הפקיד</label>
                <CustomSelect
                  id="edit-depositor"
                  value={depositorName}
                  onChange={setDepositorName}
                  placeholder="בחר שם"
                  required
                  options={depositors.map((p) => ({ value: p, label: p }))}
                  onAddOption={addDepositor}
                  onRemoveOption={removeDepositor}
                />
              </div>
            </div>
          )}

          {actionLog.action_type === 'update_investment_value' && (
            <div className="action-form">
              <div className="action-field">
                <label htmlFor="edit-value-channel">אפיק השקעה</label>
                <input
                  id="edit-value-channel"
                  type="text"
                  value={channels.find((c) => c.id === valueChannelId)?.channel_name ?? ''}
                  readOnly
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-current-value">שווי נוכחי (₪)</label>
                <input
                  id="edit-current-value"
                  type="number"
                  step="1"
                  min="0"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {actionLog.action_type === 'fixed_expense' && (
            <div className="action-form">
              <div className="action-field">
                <label htmlFor="edit-fixed-name">שם ההוצאה</label>
                <input
                  id="edit-fixed-name"
                  type="text"
                  value={fixedName}
                  onChange={(e) => setFixedName(e.target.value)}
                  required
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-fixed-category">קטגוריה</label>
                <CustomSelect
                  id="edit-fixed-category"
                  value={fixedCategory}
                  onChange={setFixedCategory}
                  placeholder="בחר קטגוריה"
                  required
                  options={categories.map((c) => ({ value: c, label: c }))}
                  onAddOption={addCategory}
                  onRemoveOption={removeCategory}
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-fixed-start-date">תאריך התחלה (DD/MM/YYYY)</label>
                <DateInput
                  id="edit-fixed-start-date"
                  value={fixedStartDate}
                  onChange={(val) => {
                    setFixedStartDate(val)
                    setFixedStartDateError('')
                  }}
                  required
                  error={fixedStartDateError}
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-fixed-amount">סכום (₪)</label>
                <input
                  id="edit-fixed-amount"
                  type="number"
                  step="1"
                  min="0"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                  required
                />
              </div>
              <div className="action-field">
                <label>תדירות</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-h)' }}>כל</span>
                  <input
                    id="edit-fixed-freq-value"
                    type="number"
                    step="1"
                    min="1"
                    value={fixedFrequencyValue}
                    onChange={(e) => setFixedFrequencyValue(e.target.value)}
                    required
                    style={{ flex: '0 0 70px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <CustomSelect
                      id="edit-fixed-freq-unit"
                      value={fixedFrequencyUnit}
                      onChange={setFixedFrequencyUnit}
                      placeholder="בחר"
                      required
                      options={[
                        { value: 'days', label: 'ימים' },
                        { value: 'weeks', label: 'שבועות' },
                        { value: 'months', label: 'חודשים' },
                        { value: 'years', label: 'שנים' },
                      ]}
                    />
                  </div>
                </div>
              </div>
              <div className="action-field action-toggle">
                <label htmlFor="edit-fixed-has-end-date">יש תאריך סיום?</label>
                <div className="toggle-switch">
                  <input
                    id="edit-fixed-has-end-date"
                    type="checkbox"
                    checked={fixedHasEndDate}
                    onChange={(e) => setFixedHasEndDate(e.target.checked)}
                    role="switch"
                    aria-checked={fixedHasEndDate}
                  />
                  <span className="toggle-slider" onClick={() => setFixedHasEndDate(!fixedHasEndDate)} />
                </div>
              </div>
              {fixedHasEndDate && (
                <div className="action-field">
                  <label htmlFor="edit-fixed-end-date">תאריך סיום (DD/MM/YYYY)</label>
                  <DateInput
                    id="edit-fixed-end-date"
                    value={fixedEndDate}
                    onChange={(val) => {
                      setFixedEndDate(val)
                      setFixedEndDateError('')
                    }}
                    required
                    error={fixedEndDateError}
                  />
                </div>
              )}
            </div>
          )}

          {actionLog.action_type === 'insurance' && (
            <div className="action-form">
              <div className="action-field">
                <label htmlFor="edit-ins-type">סוג ביטוח</label>
                <CustomSelect
                  id="edit-ins-type"
                  value={insType}
                  onChange={setInsType}
                  placeholder="בחר סוג ביטוח"
                  required
                  options={insuranceTypes.map((t) => ({ value: t, label: t }))}
                  onAddOption={addInsType}
                  onRemoveOption={removeInsType}
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-ins-company">חברת ביטוח</label>
                <CustomSelect
                  id="edit-ins-company"
                  value={insCompany}
                  onChange={setInsCompany}
                  placeholder="בחר חברת ביטוח"
                  required
                  options={insuranceCompanies.map((c) => ({ value: c, label: c }))}
                  onAddOption={addInsCompany}
                  onRemoveOption={removeInsCompany}
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-ins-first-charge">חיוב ראשון (DD/MM/YYYY)</label>
                <DateInput
                  id="edit-ins-first-charge"
                  value={insFirstCharge}
                  onChange={(val) => {
                    setInsFirstCharge(val)
                    setInsFirstChargeError('')
                  }}
                  required
                  error={insFirstChargeError}
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-ins-monthly">תשלום חודשי (₪)</label>
                <input
                  id="edit-ins-monthly"
                  type="number"
                  step="1"
                  min="0"
                  value={insMonthlyPayment}
                  onChange={(e) => setInsMonthlyPayment(e.target.value)}
                  required
                />
              </div>
              <div className="action-field action-toggle">
                <label htmlFor="edit-ins-has-end-date">יש תאריך סיום?</label>
                <div className="toggle-switch">
                  <input
                    id="edit-ins-has-end-date"
                    type="checkbox"
                    checked={insHasEndDate}
                    onChange={(e) => setInsHasEndDate(e.target.checked)}
                    role="switch"
                    aria-checked={insHasEndDate}
                  />
                  <span className="toggle-slider" onClick={() => setInsHasEndDate(!insHasEndDate)} />
                </div>
              </div>
              {insHasEndDate && (
                <div className="action-field">
                  <label htmlFor="edit-ins-end-date">תאריך סיום (DD/MM/YYYY)</label>
                  <DateInput
                    id="edit-ins-end-date"
                    value={insEndDate}
                    onChange={(val) => {
                      setInsEndDate(val)
                      setInsEndDateError('')
                    }}
                    required
                    error={insEndDateError}
                  />
                </div>
              )}
            </div>
          )}

          {actionLog.action_type === 'car_expense' && (
            <div className="action-form">
              <div className="action-field">
                <label htmlFor="edit-car-name">שם ההוצאה</label>
                <input
                  id="edit-car-name"
                  type="text"
                  value={carName}
                  onChange={(e) => setCarName(e.target.value)}
                  required
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-car-category">קטגוריה</label>
                <CustomSelect
                  id="edit-car-category"
                  value={carCategory}
                  onChange={setCarCategory}
                  placeholder="בחר קטגוריה"
                  required
                  options={carCategories.map((c) => ({ value: c, label: c }))}
                  onAddOption={addCarCategory}
                  onRemoveOption={removeCarCategory}
                />
              </div>
              <div className="action-field">
                <label htmlFor="edit-car-amount">סכום (₪)</label>
                <input
                  id="edit-car-amount"
                  type="number"
                  step="1"
                  min="0"
                  value={carAmount}
                  onChange={(e) => setCarAmount(e.target.value)}
                  required
                />
              </div>
              <div className="action-field action-toggle">
                <label htmlFor="edit-car-is-fixed">הוצאה קבועה?</label>
                <div className="toggle-switch">
                  <input
                    id="edit-car-is-fixed"
                    type="checkbox"
                    checked={carIsFixed}
                    onChange={(e) => setCarIsFixed(e.target.checked)}
                    role="switch"
                    aria-checked={carIsFixed}
                  />
                  <span className="toggle-slider" onClick={() => setCarIsFixed(!carIsFixed)} />
                </div>
              </div>
              {carIsFixed && (
                <>
                  <div className="action-field">
                    <label htmlFor="edit-car-start-date">תאריך התחלה (DD/MM/YYYY)</label>
                    <DateInput
                      id="edit-car-start-date"
                      value={carStartDate}
                      onChange={(val) => {
                        setCarStartDate(val)
                        setCarStartDateError('')
                      }}
                      required
                      error={carStartDateError}
                    />
                  </div>
                  <div className="action-field">
                    <label>תדירות</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-h)' }}>כל</span>
                      <input
                        id="edit-car-freq-value"
                        type="number"
                        step="1"
                        min="1"
                        value={carFrequencyValue}
                        onChange={(e) => setCarFrequencyValue(e.target.value)}
                        required
                        style={{ flex: '0 0 70px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <CustomSelect
                          id="edit-car-freq-unit"
                          value={carFrequencyUnit}
                          onChange={setCarFrequencyUnit}
                          placeholder="בחר"
                          required
                          options={[
                            { value: 'days', label: 'ימים' },
                            { value: 'weeks', label: 'שבועות' },
                            { value: 'months', label: 'חודשים' },
                            { value: 'years', label: 'שנים' },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="action-field action-toggle">
                    <label htmlFor="edit-car-has-end-date">יש תאריך סיום?</label>
                    <div className="toggle-switch">
                      <input
                        id="edit-car-has-end-date"
                        type="checkbox"
                        checked={carHasEndDate}
                        onChange={(e) => setCarHasEndDate(e.target.checked)}
                        role="switch"
                        aria-checked={carHasEndDate}
                      />
                      <span className="toggle-slider" onClick={() => setCarHasEndDate(!carHasEndDate)} />
                    </div>
                  </div>
                  {carHasEndDate && (
                    <div className="action-field">
                      <label htmlFor="edit-car-end-date">תאריך סיום (DD/MM/YYYY)</label>
                      <DateInput
                        id="edit-car-end-date"
                        value={carEndDate}
                        onChange={(val) => {
                          setCarEndDate(val)
                          setCarEndDateError('')
                        }}
                        required
                        error={carEndDateError}
                      />
                    </div>
                  )}
                </>
              )}
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
