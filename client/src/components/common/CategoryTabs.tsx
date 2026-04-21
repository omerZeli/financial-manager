import { categories, type CategoryId } from '../../lib/categories'
import './CategoryTabs.css'

interface CategoryTabsProps {
  selected: CategoryId
  onChange: (id: CategoryId) => void
}

export function CategoryTabs({ selected, onChange }: CategoryTabsProps) {
  return (
    <div className="category-tabs">
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={`category-tab${selected === cat.id ? ' category-tab--active' : ''}`}
          onClick={() => onChange(cat.id)}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}
