import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getAppRole, isSupabaseConfigured, supabase, type AppRole } from '../lib/supabase'

type AuthValue = {
  session: Session | null
  user: User | null
  role: AppRole
  loading: boolean
  configured: boolean
  signOut: () => Promise<void>
}
const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (alive) { setSession(data.session); setLoading(false) }
    }).catch(() => { if (alive) setLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (alive) { setSession(nextSession); setLoading(false) }
    })
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [])

  const value = useMemo<AuthValue>(() => ({
    session,
    user: session?.user ?? null,
    role: getAppRole(session?.user ?? null),
    loading,
    configured: isSupabaseConfigured,
    signOut: async () => { if (supabase) await supabase.auth.signOut() },
  }), [session, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth debe utilizarse dentro de AuthProvider')
  return value
}
