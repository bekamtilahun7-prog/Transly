import { ArrowLeft, FileText, Lock, LogIn, Mail, UserPlus, UserRound } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthField, AuthShell, PasswordField, authInputClass } from '../components/auth/AuthShell'
import { Alert } from '../components/common/Alert'
import { Button } from '../components/common/Button'
import { Logo } from '../components/common/Logo'
import { useAuth } from '../context/AuthContext'
import { afterAuthPath, hasCompletedPlanChoice } from '../lib/subscription'

function Sparkles() {
  return (
    <>
      <span className="absolute right-2 top-1 size-1.5 rotate-45 bg-orange-400" />
      <span className="absolute -right-1 top-8 size-2 rotate-45 bg-orange-300" />
      <span className="absolute left-1 top-3 size-1 rotate-45 bg-orange-300" />
    </>
  )
}

function LoginArt() {
  return (
    <div className="relative mx-auto h-28 w-28" aria-hidden="true">
      <div className="absolute inset-1 rounded-full border-2 border-orange-200/80" />
      <Sparkles />
      <div className="absolute left-1/2 top-[46%] flex size-[4.25rem] -translate-x-1/2 -translate-y-1/2 items-start rounded-xl border border-line bg-surface p-3 shadow-md">
        <FileText size={36} className="text-muted" strokeWidth={1.4} />
      </div>
      <span className="absolute bottom-5 right-2 flex size-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-md ring-4 ring-bg">
        <Lock size={14} strokeWidth={2.5} />
      </span>
    </div>
  )
}

function RegisterArt() {
  return (
    <div className="relative mx-auto h-28 w-28" aria-hidden="true">
      <div className="absolute inset-1 rounded-full border-2 border-orange-200/80" />
      <Sparkles />
      <span className="absolute left-1/2 top-[46%] flex size-[4.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-bg-2 text-muted shadow-inner ring-4 ring-bg">
        <UserRound size={34} strokeWidth={1.6} />
      </span>
      <span className="absolute bottom-5 right-2 flex size-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-md ring-4 ring-bg">
        <UserPlus size={14} strokeWidth={2.5} />
      </span>
    </div>
  )
}

const copy = {
  login: {
    titleLead: 'Welcome',
    titleAccent: 'Back!',
    subtitle: 'Log in to continue translating your documents.',
    submit: 'Log In',
    switchPrompt: "Don't have an account?",
    switchLabel: 'Sign up',
    switchTo: '/register',
  },
  register: {
    titleLead: 'Create Your',
    titleAccent: 'Account',
    subtitle: 'Start translating and managing your documents with Transly.',
    submit: 'Create Account',
    switchPrompt: 'Already have an account?',
    switchLabel: 'Log in',
    switchTo: '/login',
  },
} as const

function validName(name: string) {
  const n = name.trim()
  if (n.length < 2) return 'Enter your full name (at least 2 characters).'
  if (n.length > 80) return 'Use 80 characters or fewer for your name.'
  if (!/^[\p{L}][\p{L}\s'.-]*$/u.test(n)) return 'Use letters, spaces, apostrophes, or hyphens only.'
  return null
}

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { signIn, signUp } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const ids = { name: useId(), email: useId(), password: useId(), confirm: useId() }
  const t = copy[mode]

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const locState = loc.state as { from?: string; reset?: boolean } | null
  const from = locState?.from
  const resetOk = Boolean(locState?.reset)
  const fallback = hasCompletedPlanChoice() ? '/dashboard' : afterAuthPath()
  const next = from && !from.startsWith('/login') && !from.startsWith('/register') ? from : fallback

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setConfirmError(null)
    setNameError(null)

    if (mode === 'register' || name.trim()) {
      const ne = validName(name)
      if (ne) {
        setNameError(ne)
        return
      }
    }
    if (mode === 'register') {
      if (password !== confirm) {
        setConfirmError('Passwords do not match.')
        return
      }
      if (password.length < 6) {
        setConfirmError('Use at least 6 characters.')
        return
      }
    }

    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password, name.trim() || undefined)
        nav(next, { replace: true })
      } else {
        const signedIn = await signUp(email.trim(), password, name.trim())
        if (signedIn) nav(next, { replace: true })
        else {
          nav('/verify-otp', {
            replace: true,
            state: { email: email.trim(), purpose: 'signup', next, from: next },
          })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <Link to="/" className="text-ink" aria-label="Transly home">
        <Logo size={36} />
      </Link>

      <div className="mt-8">{mode === 'login' ? <LoginArt /> : <RegisterArt />}</div>

      <h1 className="mt-5 text-center text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">
        {t.titleLead} <span className="text-orange-500">{t.titleAccent}</span>
      </h1>
      <p className="mt-2 max-w-sm text-center text-sm text-ink-2">{t.subtitle}</p>

      <form
        onSubmit={onSubmit}
        className="mt-7 w-full rounded-2xl border border-line bg-surface p-5 shadow-[0px_16px_40px_rgba(124,48,0,0.08)] sm:p-6"
      >
        {error && (
          <div className="mb-4">
            <Alert tone="error" title={mode === 'login' ? 'Could not log in' : 'Could not create the account'}>
              {error}
            </Alert>
          </div>
        )}
        {resetOk && mode === 'login' && !error && (
          <div className="mb-4">
            <Alert tone="success" title="Password updated">
              Log in with your new password.
            </Alert>
          </div>
        )}

        <div className="space-y-4">
          <AuthField
            id={ids.name}
            label={mode === 'login' ? 'Full name (optional)' : 'Full name'}
            icon={<UserRound size={16} aria-hidden />}
            error={nameError}
          >
            <input
              id={ids.name}
              className={authInputClass}
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setNameError(null)
              }}
              placeholder="Abebe Kebede"
              required={mode === 'register'}
              disabled={busy}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? `${ids.name}-error` : undefined}
            />
          </AuthField>

          <AuthField id={ids.email} label="Email Address" icon={<Mail size={16} aria-hidden />}>
            <input
              id={ids.email}
              className={authInputClass}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={busy}
            />
          </AuthField>

          <PasswordField
            id={ids.password}
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder={mode === 'login' ? 'Enter your password' : 'Create a strong password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            disabled={busy}
          />

          {mode === 'register' && (
            <PasswordField
              id={ids.confirm}
              label="Confirm Password"
              value={confirm}
              onChange={(v) => {
                setConfirm(v)
                setConfirmError(null)
              }}
              placeholder="Confirm your password"
              autoComplete="new-password"
              error={confirmError}
              disabled={busy}
            />
          )}

          {mode === 'login' && (
            <p className="text-right">
              <Link to="/forgot-password" className="text-sm font-medium text-orange-600 hover:text-orange-700">
                Forgot password?
              </Link>
            </p>
          )}

          <Button
            type="submit"
            className="w-full !rounded-xl !bg-orange-500 !text-white shadow-md shadow-orange-500/25 hover:!bg-orange-600 active:!bg-orange-700"
            size="lg"
            loading={busy}
            icon={mode === 'login' ? <LogIn size={18} aria-hidden /> : <UserPlus size={18} aria-hidden />}
          >
            {t.submit}
          </Button>
        </div>

        <p className="mt-4 text-center text-sm text-ink-2">
          {t.switchPrompt}{' '}
          <Link to={t.switchTo} className="font-medium text-orange-600 transition hover:text-orange-700">
            {t.switchLabel}
          </Link>
        </p>

        <div className="mt-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <Link
          to="/"
          className="mt-4 flex min-h-10 items-center justify-center gap-1.5 text-sm text-ink-2 transition hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to Home
        </Link>
      </form>
    </AuthShell>
  )
}
