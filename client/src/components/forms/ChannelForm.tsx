import { useState } from 'react'
import { CustomSelect } from '../common/CustomSelect'
import { CASH_PATH_LABEL } from '../../lib/computeChannelSummary'
import type { DropdownOption } from '../../hooks/useDropdownOptions'

interface ChannelFormProps {
  sortedCompanyOptions: DropdownOption[]
  companyLoading: boolean
  addCompany: (label: string) => Promise<DropdownOption | null>
  removeCompany: (id: string) => Promise<boolean>
  sortedPathOptions: DropdownOption[]
  pathLoading: boolean
  addPath: (label: string) => Promise<DropdownOption | null>
  removePath: (id: string) => Promise<boolean>
  onSubmit: (data: { name: string; company: string; investment_path: string; is_pension: boolean }) => Promise<void>
  onClose: () => void
}

export function ChannelForm({
  sortedCompanyOptions,
  companyLoading,
  addCompany,
  removeCompany,
  sortedPathOptions,
  pathLoading,
  addPath,
  removePath,
  onSubmit,
  onClose,
}: ChannelFormProps) {
  const [chName, setChName] = useState('')
  const [chCompany, setChCompany] = useState('')
  const [chPath, setChPath] = useState('')
  const [chIsPension, setChIsPension] = useState(false)
  const [chSaving, setChSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chName || !chCompany || !chPath) return
    setChSaving(true)
    await onSubmit({ name: chName, company: chCompany, investment_path: chPath, is_pension: chIsPension })
    setChSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="סגור">&times;</button>
        <h2>אפיק השקעה חדש</h2>
        <form onSubmit={handleSubmit}>
          <label>שם אפיק</label>
          <input type="text" placeholder="הכנס שם אפיק" value={chName} onChange={e => setChName(e.target.value)} required />

          <label>חברה</label>
          <CustomSelect
            options={sortedCompanyOptions}
            value={chCompany}
            placeholder="הכנס חברה"
            onChange={setChCompany}
            onAddOption={addCompany}
            onRemoveOption={removeCompany}
            loading={companyLoading}
          />

          <label>מסלול השקעה</label>
          <CustomSelect
            options={sortedPathOptions}
            pinnedOptions={[CASH_PATH_LABEL]}
            value={chPath}
            placeholder="הכנס מסלול השקעה"
            onChange={setChPath}
            onAddOption={addPath}
            onRemoveOption={removePath}
            loading={pathLoading}
          />

          <div className="toggle-row">
            <label className="toggle-label" htmlFor="is-pension">אפיק פנסיוני?</label>
            <button
              type="button"
              id="is-pension"
              role="switch"
              aria-checked={chIsPension}
              className={`toggle-switch${chIsPension ? ' active' : ''}`}
              onClick={() => setChIsPension(prev => !prev)}
            >
              <span className="toggle-knob" />
            </button>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={chSaving || !chCompany}>
              {chSaving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
