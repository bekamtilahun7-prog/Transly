import { ArrowLeft, FileText, Lock, LogIn, Mail, UserPlus, UserRound } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthField, AuthShell, PasswordField, authInputClass } from '../components/auth/AuthShell'
import { Alert } from '../components/common/Alert'
import { Button } from '../components/common/Button'
import { Logo } from '../components/common/Logo'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
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

function validName(name: string, t: (path: string) => string) {
  const n = name.trim()
  if (n.length < 2) return t('auth.nameShort')
  if (n.length > 80) return t('auth.nameLong')
  if (!/^[\p{L}][\p{L}\s'.-]*$/u.test(n)) return t('auth.nameChars')
  return null
}

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { t } = useLocale()
  const { signIn, signUp } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const ids = { name: useId(), email: useId(), password: useId(), confirm: useId() }
  const copy =
    mode === 'login'
      ? {
          titleLead: t('auth.welcome'),
          titleAccent: t('auth.back'),
          subtitle: t('auth.loginSub'),
          submit: t('auth.login'),
          switchPrompt: t('auth.noAccount'),
          switchLabel: t('auth.signUp'),
          switchTo: '/register',
        }
      : {
          titleLead: t('auth.createYour'),
          titleAccent: t('auth.account'),
          subtitle: t('auth.registerSub'),
          submit: t('auth.create'),
          switchPrompt: t('auth.haveAccount'),
          switchLabel: t('auth.login'),
          switchTo: '/login',
        }

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const from = (loc.state as { from?: string } | null)?.from
  const fallback = hasCompletedPlanChoice() ? '/dashboard' : afterAuthPath()
  const next = from && !from.startsWith('/login') && !from.startsWith('/register') ? from : fallback

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setConfirmError(null)
    setNameError(null)

    if (mode === 'register' || name.trim()) {
      const ne = validName(name, t)
      if (ne) {
        setNameError(ne)
        return
      }
    }
    if (mode === 'register') {
      if (password !== confirm) {
        setConfirmError(t('auth.mismatch'))
        return
      }
      if (password.length < 6) {
        setConfirmError(t('auth.shortPass'))
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
        if (!signedIn) {
          throw new Error('Could not sign you in after creating the account. Try logging in.')
        }
        nav(next, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <Link to="/" className="text-ink" aria-label={t('nav.home')}>
        <Logo size={36} />
      </Link>

      <div className="mt-8">{mode === 'login' ? <LoginArt /> : <RegisterArt />}</div>

      <h1 className="mt-5 text-center text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">
        {copy.titleLead} <span className="text-orange-500">{copy.titleAccent}</span>
      </h1>
      <p className="mt-2 max-w-sm text-center text-sm text-ink-2">{copy.subtitle}</p>

      <form
        onSubmit={onSubmit}
        className="mt-7 w-full rounded-2xl border border-line bg-surface p-5 shadow-[0px_16px_40px_rgba(124,48,0,0.08)] sm:p-6"
      >
        {error && (
          <div className="mb-4">
            <Alert tone="error" title={mode === 'login' ? t('auth.loginFail') : t('auth.registerFail')}>
              {error}
            </Alert>
          </div>
        )}
        <div className="space-y-4">
          <AuthField
            id={ids.name}
            label={mode === 'login' ? t('auth.fullNameOptional') : t('auth.fullName')}
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

          <AuthField id={ids.email} label={t('auth.email')} icon={<Mail size={16} aria-hidden />}>
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
            label={t('auth.password')}
            value={password}
            onChange={setPassword}
            placeholder={mode === 'login' ? t('auth.enterPassword') : t('auth.createPassword')}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            disabled={busy}
          />

          {mode === 'register' && (
            <PasswordField
              id={ids.confirm}
              label={t('auth.confirm')}
              value={confirm}
              onChange={(v) => {
                setConfirm(v)
                setConfirmError(null)
              }}
              placeholder={t('auth.confirmPh')}
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
            {copy.submit}
          </Button>
        </div>

        <p className="mt-4 text-center text-sm text-ink-2">
          {copy.switchPrompt}{' '}
          <Link to={copy.switchTo} className="font-medium text-orange-600 transition hover:text-orange-700">
            {copy.switchLabel}
          </Link>
        </p>

        <div className="mt-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          {t('auth.or')}
          <span className="h-px flex-1 bg-line" />
        </div>

        <Link
          to="/"
          className="mt-4 flex min-h-10 items-center justify-center gap-1.5 text-sm text-ink-2 transition hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden />
          {t('auth.backHome')}
        </Link>
      </form>
    </AuthShell>
  )
}
