import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface DropdownOption {
  id: string
  label: string
}

export function useDropdownOptions(category: string) {
  const { user } = useAuth()
  const [options, setOptions] = useState<DropdownOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setOptions([])
      setLoading(false)
      return
    }

    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('user_dropdown_options')
        .select('id, label')
        .eq('user_id', user.id)
        .eq('category', category)
        .order('created_at', { ascending: true })

      setOptions(data ?? [])
      setLoading(false)
    }

    fetch()
  }, [user, category])

  const addOption = useCallback(async (label: string): Promise<DropdownOption | null> => {
    if (!user) return null

    const { data, error } = await supabase
      .from('user_dropdown_options')
      .insert({ user_id: user.id, category, label: label.trim() })
      .select('id, label')
      .single()

    if (error || !data) return null

    setOptions((prev) => [...prev, data])
    return data
  }, [user, category])

  const removeOption = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('user_dropdown_options')
      .delete()
      .eq('id', id)

    if (error) return false

    setOptions((prev) => prev.filter((o) => o.id !== id))
    return true
  }, [])

  return { options, loading, addOption, removeOption }
}
