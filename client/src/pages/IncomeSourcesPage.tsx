import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ConfirmModal } from '../components/common/ConfirmModal'
import './IncomeSources.css'

interface IncomeSource {
  id: string
  name: string
  type: 'employed' | 'self_employed'
}

export function IncomeSourcesPage() {
  const { user } = useAuth()
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return

    const fetchSources = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('income_sources')
        .select('id, name, type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) {
        setError('שגיאה בטעינת מקורות הכנסה')
      } else {
        setSources(data ?? [])
      }
      setLoading(false)
    }

    fetchSources()
  }, [user])

  const typeLabel = (type: string) =>
    type === 'employed' ? 'שכיר' : 'עצמאי'

  const [deleteTarget, setDeleteTarget] = useState<IncomeSource | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)

    const { error } = await supabase
      .from('income_sources')
      .delete()
      .eq('id', deleteTarget.id)

    if (error) {
      setError('שגיאה במחיקת מקור הכנסה')
    } else {
      setSources((prev) => prev.filter((s) => s.id !== deleteTarget.id))
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  return (
    <div className="income-sources-page">
      <Link to="/entry" className="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
        </svg>
        חזרה להזנת נתונים
      </Link>

      <div className="income-sources-header">
        <h1>מקורות הכנסה</h1>
        <Link to="/entry/income-sources/new" className="add-source-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" /><path d="M5 12h14" />
          </svg>
          הוספת מקור
        </Link>
      </div>

      {error && <div className="sources-error">{error}</div>}

      {loading ? (
        <div className="sources-loading">טוען...</div>
      ) : sources.length === 0 ? (
        <div className="sources-empty">אין מקורות הכנסה עדיין. לחץ על "הוספת מקור" כדי להתחיל.</div>
      ) : (
        <div className="sources-list">
          {sources.map((source) => (
            <div key={source.id} className="source-item">
              <div className="source-info">
                <span className="source-name">{source.name}</span>
                <span className="source-type">{typeLabel(source.type)}</span>
              </div>
              <button
                className="delete-source-btn"
                onClick={() => setDeleteTarget(source)}
                aria-label={`מחיקת ${source.name}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

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
