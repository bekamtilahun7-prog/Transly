import { ArrowLeft, Eye, EyeOff, FileText, Lock, LogIn, Mail, UserPlus, UserRound } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Alert } from '../components/common/Alert'
import { Button } from '../components/common/Button'
import { Logo } from '../components/common/Logo'
import { ThemeToggle } from '../components/common/ThemeToggle'
import { useAuth } from '../context/AuthContext'
import { afterAuthPath, hasCompletedPlanChoice } from '../lib/subscription'

const inputClass =
  'block w-full min-h-11 rounded-xl border border-input-line bg-input px-3.5 text-sm text-ink placeholder:text-muted ' +
  'transition duration-150 focus:outline-none focus:border-focus focus:ring-2 focus:ring-ring/60 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed'

function AuthField({
  id,
  label,
  icon,
  error,
  children,
}: {
  id: string
  label: string
  icon: ReactNode
  error?: string | null
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-2 text-sm font-medium text-ink">
        <span className="text-muted">{icon}</span>
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoComplete: string
  error?: string | null
  disabled?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <AuthField id={id} label={label} icon={<Lock size={16} aria-hidden />} error={error}>
      <div className="relative">
        <input
          id={id}
          className={`${inputClass} pr-11`}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition duration-150 hover:bg-hover hover:text-ink"
        >
          {show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
    </AuthField>
  )
}

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

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg text-ink">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div
        aria-hidden="true"
        className="dot-grid pointer-events-none absolute left-0 top-16 h-56 w-36 opacity-50 [mask-image:linear-gradient(to_right,black,transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-16 size-80 rounded-full bg-orange-200/55 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-orange-200/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-24 right-8 size-40 rounded-full bg-orange-100/80 blur-2xl"
      />
      <div className="relative mx-auto flex w-full max-w-[420px] flex-col items-center px-5 py-10 sm:py-14">
        {children}
      </div>
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

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { signIn, signUp } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const ids = { email: useId(), password: useId(), confirm: useId() }
  const t = copy[mode]

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [needsConfirm, setNeedsConfirm] = useState(false)

  const from = (loc.state as { from?: string } | null)?.from
  const fallback = hasCompletedPlanChoice() ? '/dashboard' : afterAuthPath()
  const next = from && !from.startsWith('/login') && !from.startsWith('/register') ? from : fallback

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setConfirmError(null)
    setNeedsConfirm(false)

    if (mode === 'register' && password !== confirm) {
      setConfirmError('Passwords do not match.')
      return
    }
    if (mode === 'register' && password.length < 6) {
      setConfirmError('Use at least 6 characters.')
      return
    }

    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password)
        nav(next, { replace: true })
      } else {
        const signedIn = await signUp(email.trim(), password)
        if (signedIn) nav(next, { replace: true })
        else setNeedsConfirm(true)
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
        noValidate={false}
      >
      

        {error && (
          <div className="mb-4">
            <Alert tone="error" title={mode === 'login' ? 'Could not log in' : 'Could not create the account'}>
              {error}
            </Alert>
          </div>
        )}

        {needsConfirm && (
          <div className="mb-4">
            <Alert tone="success" title="Check your email">
              We sent a confirmation link to {email.trim()}. Open it, then log in.
            </Alert>
          </div>
        )}

        <div className="space-y-4">
          <AuthField id={ids.email} label="Email Address" icon={<Mail size={16} aria-hidden />}>
            <input
              id={ids.email}
              className={inputClass}
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
