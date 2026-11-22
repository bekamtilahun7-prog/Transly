import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { USE_MOCKS } from '../lib/constants'
import { getAccount, mockRoleFor, upsertAccount, verifyPassword } from '../lib/mockAccounts'
import { api } from '../services/api'
import type { AuthUser, Role } from '../types'

interface AuthState {
  user: AuthUser | null
  role: Role
  loading: boolean
  profileError: string | null
  signIn(email: string, password: string, name?: string): Promise<void>
  /** Saves the account, then signs in. */
  signUp(email: string, password: string, name?: string): Promise<boolean>
  signOut(): Promise<void>
}

const Ctx = createContext<AuthState | null>(null)
const MOCK_KEY = 'transly.mock.user'

async function registerOnServer(email: string, password: string, name?: string) {
  let res: Response
  try {
    res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: name?.trim() || undefined }),
    })
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.')
  }
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
  if (!res.ok) {
    throw new Error(json?.error?.message || 'Could not create the account.')
  }
}

function readMock(): (AuthUser & { role: Role }) | null {
  try {
    return JSON.parse(localStorage.getItem(MOCK_KEY) ?? 'null') as (AuthUser & { role: Role }) | null
  } catch {
    return null
  }
}

function persistSession(user: AuthUser, role: Role) {
  localStorage.setItem(MOCK_KEY, JSON.stringify({ ...user, role }))
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
        setUser({ id: m.id, email: m.email, name: m.name })
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
      const name = typeof u?.user_metadata?.full_name === 'string' ? u.user_metadata.full_name : undefined
      setUser(u ? { id: u.id, email: u.email ?? '', name } : null)
      if (u) void loadRole()
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user
      const name = typeof u?.user_metadata?.full_name === 'string' ? u.user_metadata.full_name : undefined
      setUser(u ? { id: u.id, email: u.email ?? '', name } : null)
      if (u) setTimeout(() => void loadRole(), 0)
      else setRole('customer')
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadRole])

  const value = useMemo<AuthState>(() => {
    const applyMockUser = (email: string, name?: string) => {
      const acc = getAccount(email)
      const r: Role = acc?.role ?? mockRoleFor(email)
      const display = name?.trim() || acc?.name || ''
      const m: AuthUser = {
        id: r === 'translator' ? 'mock-translator' : 'mock-customer',
        email,
        name: display || undefined,
      }
      persistSession(m, r)
      setUser(m)
      setRole(r)
    }

    const signIn: AuthState['signIn'] = async (email, password, name) => {
      if (USE_MOCKS) {
        const check = verifyPassword(email, password)
        if (check === 'missing') throw new Error('No account was found for that email.')
        if (check === 'wrong') throw new Error('That password does not match this email.')
        if (name?.trim()) {
          const acc = getAccount(email)
          if (acc) upsertAccount({ ...acc, name: name.trim() })
        }
        applyMockUser(email, name)
        return
      }
      if (!supabase) throw new Error('Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
    }

    const signUp: AuthState['signUp'] = async (email, password, name) => {
      if (USE_MOCKS) {
        if (getAccount(email)) {
          throw new Error('An account with this email already exists. Log in.')
        }
        const display = name?.trim() || email.split('@')[0] || 'User'
        upsertAccount({
          email,
          password,
          name: display,
          role: mockRoleFor(email),
        })
        applyMockUser(email, display)
        return true
      }
      if (!supabase) throw new Error('Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
      await registerOnServer(email, password, name)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw new Error(signInError.message)
      return true
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

    return {
      user,
      role,
      loading,
      profileError,
      signIn,
      signUp,
      signOut,
    }
  }, [user, role, loading, profileError])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>')
  return v
}
