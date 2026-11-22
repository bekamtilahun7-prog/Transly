import { ArrowLeft, KeyRound, Mail } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthField, AuthShell, authInputClass } from '../components/auth/AuthShell'
import { Alert } from '../components/common/Alert'
import { Button } from '../components/common/Button'
import { Logo } from '../components/common/Logo'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { USE_MOCKS } from '../lib/constants'
import { writeResetEmail } from '../lib/resetEmail'

export default function ForgotPasswordPage() {
  const { t } = useLocale()
  const { requestPasswordReset } = useAuth()
  const nav = useNavigate()
  const id = useId()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const trimmed = email.trim()
      await requestPasswordReset(trimmed)
      writeResetEmail(trimmed)
      nav('/verify-otp', { replace: true, state: { email: trimmed, purpose: 'reset' } })
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

      <div className="relative mx-auto mt-8 h-28 w-28" aria-hidden="true">
        <div className="absolute inset-1 rounded-full border-2 border-orange-200/80" />
        <span className="absolute left-1/2 top-[46%] flex size-[4.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-bg-2 text-muted shadow-inner ring-4 ring-bg">
          <KeyRound size={32} strokeWidth={1.6} />
        </span>
      </div>

      <h1 className="mt-5 text-center text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">
        {t('auth.forgotTitle')} <span className="text-orange-500">{t('auth.forgotAccent')}</span>
      </h1>
      <p className="mt-2 max-w-sm text-center text-sm text-ink-2">{t('auth.forgotSub')}</p>

      <form
        onSubmit={onSubmit}
        className="mt-7 w-full rounded-2xl border border-line bg-surface p-5 shadow-[0px_16px_40px_rgba(124,48,0,0.08)] sm:p-6"
      >
        {error && (
          <div className="mb-4">
            <Alert tone="error" title={t('auth.forgotFail')}>
              {error}
            </Alert>
          </div>
        )}
        {USE_MOCKS && (
          <div className="mb-4">
            <Alert tone="info" title={t('auth.demoMode')}>
              {t('auth.demoOtp')}
            </Alert>
          </div>
        )}

        <AuthField id={id} label={t('auth.email')} icon={<Mail size={16} aria-hidden />}>
          <input
            id={id}
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

        <Button
          type="submit"
          className="mt-5 w-full !rounded-xl !bg-orange-500 !text-white shadow-md shadow-orange-500/25 hover:!bg-orange-600"
          size="lg"
          loading={busy}
        >
          {t('auth.sendCode')}
        </Button>

        <p className="mt-4 text-center text-sm text-ink-2">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="font-medium text-orange-600 hover:text-orange-700">
            {t('auth.login')}
          </Link>
        </p>

        <Link
          to="/login"
          className="mt-5 flex min-h-10 items-center justify-center gap-1.5 text-sm text-ink-2 transition hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden />
          {t('auth.login')}
        </Link>
      </form>
    </AuthShell>
  )
}
