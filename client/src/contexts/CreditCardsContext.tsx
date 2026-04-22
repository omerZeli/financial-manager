import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface CreditCard {
  id: string
  name: string
  company: string
  expense_limit: number
  latest_expense_date: string | null
}

interface CreditCardsContextType {
  cards: CreditCard[]
  loading: boolean
  error: string
  addCard: (card: CreditCard) => void
  deleteCard: (id: string) => Promise<boolean>
  updateLatestExpenseDate: (cardId: string, date: string) => void
}

const CreditCardsContext = createContext<CreditCardsContextType | undefined>(undefined)

export function CreditCardsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [cards, setCards] = useState<CreditCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    if (!user) {
      setCards([])
      setFetched(false)
      setLoading(false)
      return
    }

    if (fetched) return

    const fetchCards = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('credit_cards')
        .select('id, name, company, expense_limit')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) {
        setError('שגיאה בטעינת כרטיסי אשראי')
      } else {
        const items: CreditCard[] = (data ?? []).map((c) => ({ ...c, latest_expense_date: null }))

        if (items.length > 0) {
          const { data: expenseData } = await supabase
            .from('expenses')
            .select('credit_card_id, date')
            .eq('user_id', user.id)
            .order('date', { ascending: false })

          if (expenseData) {
            const latestMap = new Map<string, string>()
            for (const row of expenseData) {
              if (!latestMap.has(row.credit_card_id)) {
                latestMap.set(row.credit_card_id, row.date)
              }
            }
            for (const item of items) {
              item.latest_expense_date = latestMap.get(item.id) ?? null
            }
          }
        }

        setCards(items)
      }
      setFetched(true)
      setLoading(false)
    }

    fetchCards()
  }, [user, fetched])

  const addCard = useCallback((card: CreditCard) => {
    setCards((prev) => [...prev, card])
  }, [])

  const deleteCard = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('credit_cards')
      .delete()
      .eq('id', id)

    if (error) {
      setError('שגיאה במחיקת כרטיס אשראי')
      return false
    }

    setCards((prev) => prev.filter((c) => c.id !== id))
    return true
  }, [])

  const updateLatestExpenseDate = useCallback((cardId: string, date: string) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c
        if (!c.latest_expense_date || date > c.latest_expense_date) {
          return { ...c, latest_expense_date: date }
        }
        return c
      })
    )
  }, [])

  return (
    <CreditCardsContext.Provider value={{ cards, loading, error, addCard, deleteCard, updateLatestExpenseDate }}>
      {children}
    </CreditCardsContext.Provider>
  )
}

export function useCreditCards() {
  const context = useContext(CreditCardsContext)
  if (context === undefined) {
    throw new Error('useCreditCards must be used within a CreditCardsProvider')
  }
  return context
}
