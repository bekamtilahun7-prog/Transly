import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { USE_MOCKS } from '../lib/constants'
import {
  allowPasswordReset,
  consumeOtp,
  getAccount,
  issueOtp,
  mockRoleFor,
  takePasswordResetAllowance,
  upsertAccount,
  verifyPassword,
  type OtpPurpose,
} from '../lib/mockAccounts'
import { clearResetEmail } from '../lib/resetEmail'
import { api } from '../services/api'
import type { AuthUser, Role } from '../types'

interface AuthState {
  user: AuthUser | null
  role: Role
  loading: boolean
  profileError: string | null
  signIn(email: string, password: string, name?: string): Promise<void>
  /** Creates the account and signs in. OTP is not used for registration. */
  signUp(email: string, password: string, name?: string): Promise<boolean>
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  confirmOtp(email: string, code: string, purpose: OtpPurpose): Promise<void>
  completePasswordReset(email: string, password: string): Promise<void>
  resendOtp(email: string, purpose: OtpPurpose): Promise<void>
}

const Ctx = createContext<AuthState | null>(null)
const MOCK_KEY = 'transly.mock.user'

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
        if (check === 'wrong') throw new Error('That password does not match this email. Try again or reset it.')
        if (check === 'missing') {
          upsertAccount({
            email,
            password,
            name: name?.trim() || email.split('@')[0] || 'User',
            role: mockRoleFor(email),
          })
        } else if (name?.trim()) {
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
          throw new Error('An account with this email already exists. Log in, or use Forgot password.')
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name?.trim() || undefined },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      })
      if (error) throw new Error(error.message)
      if (data.session) return true
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        throw new Error(
          'The account was created, but email confirmation is still on in Supabase, so you cannot sign in yet. Turn off Confirm email in Authentication → Providers, then log in.',
        )
      }
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

    const sendResetEmail = async (email: string) => {
      if (!supabase) throw new Error('Password reset needs the real auth service. It is not connected in this build.')
      const redirectTo = `${window.location.origin}/reset-password`
      try {
        const res = await fetch('/api/auth/forgot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, redirectTo }),
        })
        if (res.ok) return
      } catch {
        /* fall through to the browser client */
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw new Error(error.message)
    }

    const requestPasswordReset: AuthState['requestPasswordReset'] = async (email) => {
      if (USE_MOCKS) {
        if (!getAccount(email)) throw new Error('No account was found for that email in this browser.')
        issueOtp(email, 'reset')
        return
      }
      await sendResetEmail(email)
    }

    const confirmOtp: AuthState['confirmOtp'] = async (email, code, purpose) => {
      if (purpose !== 'reset') {
        throw new Error('Verification codes are only used to reset a password.')
      }
      if (!USE_MOCKS) {
        if (!supabase) throw new Error('Password reset needs the real auth service. It is not connected in this build.')
        const token = code.trim()
        const address = email.trim()
        const recovery = await supabase.auth.verifyOtp({ email: address, token, type: 'recovery' })
        if (!recovery.error) return
        const emailOtp = await supabase.auth.verifyOtp({ email: address, token, type: 'email' })
        if (emailOtp.error) throw new Error(recovery.error.message || emailOtp.error.message)
        return
      }
      const result = consumeOtp(email, 'reset', code)
      if (result === 'expired') throw new Error('That code has expired. Send a new one.')
      if (result === 'mismatch') throw new Error('That code is not correct. Check it and try again.')
      allowPasswordReset(email)
    }

    const completePasswordReset: AuthState['completePasswordReset'] = async (email, password) => {
      if (!USE_MOCKS) {
        if (!supabase) throw new Error('Password reset needs the real auth service. It is not connected in this build.')
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw new Error(error.message)
        await supabase.auth.signOut()
        clearResetEmail()
        return
      }
      if (!takePasswordResetAllowance(email)) {
        throw new Error('Verify the code sent to your email before choosing a new password.')
      }
      const acc = getAccount(email)
      if (!acc) throw new Error('No account was found for that email in this browser.')
      upsertAccount({ ...acc, password })
    }

    const resendOtp: AuthState['resendOtp'] = async (email, purpose) => {
      if (purpose !== 'reset') return
      if (USE_MOCKS) {
        if (!getAccount(email)) throw new Error('No account was found for that email.')
        issueOtp(email, 'reset')
        return
      }
      await sendResetEmail(email)
    }

    return {
      user,
      role,
      loading,
      profileError,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      confirmOtp,
      completePasswordReset,
      resendOtp,
    }
  }, [user, role, loading, profileError])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>')
  return v
}
