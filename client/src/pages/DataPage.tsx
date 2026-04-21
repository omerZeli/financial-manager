import { Link, useSearchParams } from 'react-router-dom'
import { CategoryTabs } from '../components/common/CategoryTabs'
import { dataCategoryMap, categories, type CategoryId } from '../lib/categories'
import './DataPage.css'

const dataItems = [
  { id: 'credit-card-expenses', label: 'הוצאות' },
  { id: 'paybacks', label: 'קבלת החזר' },
  { id: 'investment-deposits', label: 'הפקדות לאפיקי השקעה' },
  { id: 'investment-channels', label: 'אפיקי השקעה' },
  { id: 'insurances', label: 'ביטוחים' },
  { id: 'car-expenses', label: 'הוצאות רכב' },
]

export function DataPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paramCat = searchParams.get('cat')
  const selectedCategory: CategoryId =
    paramCat && categories.some((c) => c.id === paramCat) ? (paramCat as CategoryId) : 'regular'

  const setSelectedCategory = (id: CategoryId) => {
    setSearchParams({ cat: id }, { replace: true })
  }

  const filtered = dataItems.filter((d) => dataCategoryMap[d.id] === selectedCategory)

  return (
    <div className="page-content">
      <h2>נתונים</h2>
      <CategoryTabs selected={selectedCategory} onChange={setSelectedCategory} />
      <div className="items-list">
        {filtered.map((item) => (
          <Link key={item.id} to={`/data/${item.id}`} className="item-block action-link">
            <span className="action-link-label">{item.label}</span>
            <span className="action-link-arrow">←</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
