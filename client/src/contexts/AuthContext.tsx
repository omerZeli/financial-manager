import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface Profile {
  display_name: string | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const hasRedirectedToReset = useRef(false)

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single()
    setProfile(data ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)

      if (event === 'PASSWORD_RECOVERY' && !hasRedirectedToReset.current) {
        hasRedirectedToReset.current = true
        navigate('/reset-password', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()

    // Clear service worker caches
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }

    // Tell the service worker to clear its caches too
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' })
    }

    // Clear all client-side storage
    localStorage.clear()
    sessionStorage.clear()
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
