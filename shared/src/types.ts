// Framework-agnostic row types for the Financial Manager data model.
// These interfaces mirror the Supabase table shapes exactly. They are the
// single source of truth consumed by both the client app and the MCP server.

export interface Salary {
  id: string
  user_id: string
  month: string
  employer: string
  bruto: number
  neto: number
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  name: string
  category: string
  amount: number
  date: string
  salary_id: string | null
  created_at: string
}

export interface FixedExpense {
  id: string
  user_id: string
  name: string
  category: string
  amount: number
  start_date: string
  end_date: string | null
  salary_employer: string | null
  created_at: string
}

export interface Payback {
  id: string
  user_id: string
  direction: 'by_me' | 'to_me'
  name: string | null
  category: string | null
  amount: number
  date: string
  person: string
  expense_id: string | null
  fixed_expense_id: string | null
  payback_id: string | null
  created_at: string
}

export interface InvestmentChannel {
  id: string
  user_id: string
  name: string
  company: string
  investment_path: string
  is_pension: boolean
  created_at: string
}

export interface InvestmentDeposit {
  id: string
  user_id: string
  channel_id: string
  amount: number
  date: string
  depositor: string
  salary_id: string | null
  is_withdrawal: boolean
  created_at: string
}

export interface InvestmentValueUpdate {
  id: string
  user_id: string
  channel_id: string
  value: number
  date: string
  created_at: string
}

export interface ExpenseType {
  id: string
  user_id: string
  type_name: string
  categories: string[]
  created_at: string
}

export interface DropdownOption {
  id: string
  user_id: string
  category: string
  value: string
  created_at: string
}
