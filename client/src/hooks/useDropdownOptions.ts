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
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const fetchOptions = useCallback(async () => {
    if (fetched || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('user_dropdown_options')
      .select('id, value')
      .eq('user_id', user.id)
      .eq('category', category)
      .order('value')
    if (!error && data) {
      setOptions(data.map((d) => ({ id: d.id, label: d.value })))
    }
    setFetched(true)
    setLoading(false)
  }, [fetched, user, category])

  useEffect(() => { fetchOptions() }, [fetchOptions])

  const addOption = async (label: string): Promise<DropdownOption | null> => {
    if (!user) return null
    const trimmed = label.trim()
    if (!trimmed || options.some((o) => o.label === trimmed)) return null
    const { data, error } = await supabase
      .from('user_dropdown_options')
      .insert({ user_id: user.id, category, value: trimmed })
      .select('id, value')
      .single()
    if (!error && data) {
      const newOpt = { id: data.id, label: data.value }
      setOptions((prev) => [...prev, newOpt].sort((a, b) => a.label.localeCompare(b.label)))
      return newOpt
    }
    return null
  }

  const removeOption = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('user_dropdown_options').delete().eq('id', id)
    if (!error) {
      setOptions((prev) => prev.filter((o) => o.id !== id))
      return true
    }
    return false
  }

  return { options, loading, addOption, removeOption }
}
