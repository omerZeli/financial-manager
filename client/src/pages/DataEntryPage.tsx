import { Link } from 'react-router-dom'
import './DataEntryPage.css'

export function DataEntryPage() {
  return (
    <div className="data-entry-page">
      <h1>הזנת נתונים</h1>
      <div className="entry-steps">
        <Link to="/entry/income-sources" className="entry-step-link">
          מקורות הכנסה
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
