import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useDropdownOptions(category: string) {
  const { user } = useAuth()
  const [options, setOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOptions = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('user_dropdown_options')
      .select('label')
      .eq('user_id', user.id)
      .eq('category', category)
      .order('created_at', { ascending: true })

    if (data) {
      setOptions(data.map((d) => d.label))
    }
    setLoading(false)
  }, [user, category])

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  const addOption = useCallback(async (label: string) => {
    if (!user) return
    const trimmed = label.trim()
    if (!trimmed || options.includes(trimmed)) return

    const { error } = await supabase.from('user_dropdown_options').insert({
      user_id: user.id,
      category,
      label: trimmed,
    })

    if (!error) {
      setOptions((prev) => [...prev, trimmed])
    }
  }, [user, category, options])

  const removeOption = useCallback(async (label: string) => {
    if (!user) return
    const { error } = await supabase
      .from('user_dropdown_options')
      .delete()
      .eq('user_id', user.id)
      .eq('category', category)
      .eq('label', label)

    if (!error) {
      setOptions((prev) => prev.filter((o) => o !== label))
    }
  }, [user, category])

  return { options, loading, addOption, removeOption, refetch: fetchOptions }
}
