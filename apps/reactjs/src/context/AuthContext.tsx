import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { USE_MOCKS } from '../lib/constants'
import { api } from '../services/api'
import type { AuthUser, Role } from '../types'

interface AuthState {
  user: AuthUser | null
  role: Role
  loading: boolean
  profileError: string | null
  signIn(email: string, password: string): Promise<void>
  /** Resolves true if signed in immediately, false if email confirmation is required. */
  signUp(email: string, password: string): Promise<boolean>
  signOut(): Promise<void>
}

const Ctx = createContext<AuthState | null>(null)
const MOCK_KEY = 'transly.mock.user'

function readMock(): (AuthUser & { role: Role }) | null {
  try {
    return JSON.parse(localStorage.getItem(MOCK_KEY) ?? 'null')
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [role, setRole] = useState<Role>('customer')
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  const loadRole = useCallback(async () => {
    try {
      setRole(await api.getMyRole())
      setProfileError(null)
    } catch (e) {
      setRole('customer')
      setProfileError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    if (USE_MOCKS) {
      const m = readMock()
      if (m) {
        setUser({ id: m.id, email: m.email })
        setRole(m.role)
      }
      setLoading(false)
      return
    }
    if (!supabase) {
      setLoading(false)
      return
    }
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      const u = data.session?.user
      setUser(u ? { id: u.id, email: u.email ?? '' } : null)
      if (u) void loadRole()
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user
      setUser(u ? { id: u.id, email: u.email ?? '' } : null)
      if (u) setTimeout(() => void loadRole(), 0) // avoid awaiting supabase calls inside the callback
      else setRole('customer')
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadRole])

  const value = useMemo<AuthState>(
    () => {
      const signIn: AuthState['signIn'] = async (email, password) => {
        if (USE_MOCKS) {
          // MOCK auth: any credentials work. An email containing "translator" gets the translator role.
          const r: Role = email.toLowerCase().includes('translator') ? 'translator' : 'customer'
          const m = { id: r === 'translator' ? 'mock-translator' : 'mock-customer', email, role: r }
          localStorage.setItem(MOCK_KEY, JSON.stringify(m))
          setUser({ id: m.id, email })
          setRole(r)
          return
        }
        if (!supabase) throw new Error('Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error(error.message)
      }
      // NOTE: callers destructure these functions (const { signUp } = useAuth()), so never use `this` here.
      const signUp: AuthState['signUp'] = async (email, password) => {
        if (USE_MOCKS) {
          await signIn(email, password)
          return true
        }
        if (!supabase) throw new Error('Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw new Error(error.message)
        return !!data.session
      }
      const signOut: AuthState['signOut'] = async () => {
        if (USE_MOCKS) {
          localStorage.removeItem(MOCK_KEY)
          setUser(null)
          setRole('customer')
          return
        }
        if (supabase) {
          const { error } = await supabase.auth.signOut()
          if (error) throw new Error(error.message)
        }
      }
      return { user, role, loading, profileError, signIn, signUp, signOut }
    },
    [user, role, loading, profileError],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>')
  return v
}
