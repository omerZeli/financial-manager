import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface CreditCard {
  id: string
  name: string
  company: string
  expense_limit: number
}

interface CreditCardsContextType {
  cards: CreditCard[]
  loading: boolean
  error: string
  addCard: (card: CreditCard) => void
  deleteCard: (id: string) => Promise<boolean>
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
        setCards(data ?? [])
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

  return (
    <CreditCardsContext.Provider value={{ cards, loading, error, addCard, deleteCard }}>
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
