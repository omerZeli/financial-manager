export type CategoryId = 'regular' | 'special' | 'investment'

export interface Category {
  id: CategoryId
  label: string
}

export const categories: Category[] = [
  { id: 'regular', label: 'הוצאות רגילות' },
  { id: 'special', label: 'הוצאות מיוחדות' },
  { id: 'investment', label: 'השקעות' },
]

/** Maps action route IDs (used in ActionsPage) to their category */
export const actionCategoryMap: Record<string, CategoryId> = {
  'credit-card-expenses': 'regular',
  'paybacks': 'regular',
  'outgoing-paybacks': 'regular',
  'fixed-expenses': 'regular',
  'insurance': 'special',
  'car-expenses': 'special',
  'investment-channels': 'investment',
  'investment-deposits': 'investment',
  'update-investment-value': 'investment',
}

/** Maps data route IDs (used in DataPage) to their category */
export const dataCategoryMap: Record<string, CategoryId> = {
  'credit-card-expenses': 'regular',
  'paybacks': 'regular',
  'outgoing-paybacks': 'regular',
  'insurances': 'special',
  'car-expenses': 'special',
  'investment-deposits': 'investment',
  'investment-channels': 'investment',
}

/** Maps action_type values (stored in DB action_logs) to their category */
export const actionTypeCategoryMap: Record<string, CategoryId> = {
  'credit_card_expense': 'regular',
  'payback': 'regular',
  'outgoing_payback': 'regular',
  'fixed_expense': 'regular',
  'insurance': 'special',
  'car_expense': 'special',
  'investment_channel': 'investment',
  'investment_deposit': 'investment',
  'update_investment_value': 'investment',
}
