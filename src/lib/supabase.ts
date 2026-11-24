import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim()

export const isSupabaseConfigured = Boolean(url && key)
export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url!, key!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null

export type AppRole = 'owner' | 'admin' | 'team' | 'client'
export function getAppRole(user: { app_metadata?: Record<string, unknown> } | null): AppRole {
  const role = user?.app_metadata?.role
  return role === 'owner' || role === 'admin' || role === 'team' ? role : 'client'
}
export function isStaffRole(role: AppRole) { return role === 'owner' || role === 'admin' || role === 'team' }
export function isAdminRole(role: AppRole) { return role === 'owner' || role === 'admin' }
