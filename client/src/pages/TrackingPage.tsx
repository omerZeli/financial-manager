import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CategoryTabs } from '../components/common/CategoryTabs'
import { actionTypeCategoryMap, categories, type CategoryId } from '../lib/categories'
import './TrackingPage.css'

interface ActionLog {
  id: string
  action_type: string
  action_label: string
  status: 'open' | 'closed'
  reference_id: string | null
  summary: string
  created_at: string
}

export function TrackingPage() {
  const [logs, setLogs] = useState<ActionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const paramCat = searchParams.get('cat')
  const selectedCategory: CategoryId =
    paramCat && categories.some((c) => c.id === paramCat) ? (paramCat as CategoryId) : 'regular'
  const navigate = useNavigate()

  const setSelectedCategory = (id: CategoryId) => {
    setSearchParams({ cat: id }, { replace: true })
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('action_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setLogs(data)
    }
    setLoading(false)
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }

  const filteredLogs = logs.filter(
    (l) => actionTypeCategoryMap[l.action_type] === selectedCategory
  )
  const openLogs = filteredLogs.filter((l) => l.status === 'open')
  const closedLogs = filteredLogs.filter((l) => l.status === 'closed')

  if (loading) {
    return <div className="page-content"><p>טוען...</p></div>
  }

  return (
    <div className="page-content">
      <h2>מעקב</h2>
      <CategoryTabs selected={selectedCategory} onChange={setSelectedCategory} />

      {filteredLogs.length === 0 ? (
        <p className="page-empty-state">אין פעולות עדיין</p>
      ) : (
        <div className="history-sections">
          {openLogs.length > 0 && (
            <section className="history-section">
              <h3 className="history-section-title history-section-title--open">
                <span className="history-dot history-dot--open" />
                פתוחות ({openLogs.length})
              </h3>
              <div className="history-list">
                {openLogs.map((log) => (
                  <div
                    key={log.id}
                    className="history-item history-item--open history-item--clickable"
                    onClick={() => navigate(`/tracking/${log.id}`)}
                  >
                    <div className="history-item-right">
                      <span className="history-item-label">{log.action_label}</span>
                      <span className="history-item-summary">{log.summary}</span>
                    </div>
                    <div className="history-item-left">
                      <span className="history-item-date">
                        {formatDate(log.created_at)} · {formatTime(log.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {closedLogs.length > 0 && (
            <section className="history-section">
              <h3 className="history-section-title history-section-title--closed">
                <span className="history-dot history-dot--closed" />
                סגורות ({closedLogs.length})
              </h3>
              <div className="history-list">
                {closedLogs.map((log) => (
                  <div
                    key={log.id}
                    className="history-item history-item--closed history-item--clickable"
                    onClick={() => navigate(`/tracking/${log.id}`)}
                  >
                    <div className="history-item-right">
                      <span className="history-item-label">{log.action_label}</span>
                      <span className="history-item-summary">{log.summary}</span>
                    </div>
                    <div className="history-item-left">
                      <span className="history-item-date">
                        {formatDate(log.created_at)} · {formatTime(log.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
