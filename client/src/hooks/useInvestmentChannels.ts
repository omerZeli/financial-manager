import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface InvestmentChannel {
  id: string
  channel_name: string
  financial_company: string
  investment_track: string
  current_value: number | null
  value_updated_at: string | null
}

export function useInvestmentChannels() {
  const { user } = useAuth()
  const [channels, setChannels] = useState<InvestmentChannel[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChannels = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('investment_channels')
      .select('id, channel_name, financial_company, investment_track, current_value, value_updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (data) {
      setChannels(data)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  return { channels, loading, refetch: fetchChannels }
}
