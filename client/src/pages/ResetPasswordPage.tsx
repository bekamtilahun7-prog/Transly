import { ArrowLeft, Lock } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell, PasswordField } from '../components/auth/AuthShell'
import { Alert } from '../components/common/Alert'
import { Button } from '../components/common/Button'
import { Logo } from '../components/common/Logo'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'

type NavState = { email?: string }

export default function ResetPasswordPage() {
  const { t } = useLocale()
  const { completePasswordReset } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const ids = { password: useId(), confirm: useId() }
  const email = ((loc.state as NavState | null)?.email ?? '').trim()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  if (!email) return <Navigate to="/forgot-password" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setConfirmError(null)
    if (password.length < 6) {
      setConfirmError(t('auth.shortPass'))
      return
    }
    if (password !== confirm) {
      setConfirmError(t('auth.mismatch'))
      return
    }
    setBusy(true)
    try {
      await completePasswordReset(email, password)
      nav('/login', { replace: true, state: { reset: true } })
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
          <Lock size={32} strokeWidth={1.6} />
        </span>
      </div>

      <h1 className="mt-5 text-center text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">
        {t('auth.newPassTitle')} <span className="text-orange-500">{t('auth.newPassAccent')}</span>
      </h1>
      <p className="mt-2 max-w-sm text-center text-sm text-ink-2">{t('auth.newPassSub', { email })}</p>

      <form
        onSubmit={onSubmit}
        className="mt-7 w-full rounded-2xl border border-line bg-surface p-5 shadow-[0px_16px_40px_rgba(124,48,0,0.08)] sm:p-6"
      >
        {error && (
          <div className="mb-4">
            <Alert tone="error" title={t('auth.resetFail')}>
              {error}
            </Alert>
          </div>
        )}

        <div className="space-y-4">
          <PasswordField
            id={ids.password}
            label={t('auth.password')}
            value={password}
            onChange={setPassword}
            placeholder={t('auth.createPassword')}
            autoComplete="new-password"
            disabled={busy}
          />
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
        </div>

        <Button
          type="submit"
          className="mt-5 w-full !rounded-xl !bg-orange-500 !text-white shadow-md shadow-orange-500/25 hover:!bg-orange-600"
          size="lg"
          loading={busy}
        >
          {t('auth.savePass')}
        </Button>

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
