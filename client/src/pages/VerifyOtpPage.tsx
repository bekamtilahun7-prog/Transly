import { ArrowLeft, KeyRound, Mail } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/auth/AuthShell'
import { Alert } from '../components/common/Alert'
import { Button } from '../components/common/Button'
import { Logo } from '../components/common/Logo'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { USE_MOCKS } from '../lib/constants'
import { peekOtp, type OtpPurpose } from '../lib/mockAccounts'
import { readResetEmail, writeResetEmail } from '../lib/resetEmail'

type NavState = { email?: string; purpose?: OtpPurpose }

const otpCellClass =
  'flex h-12 w-10 shrink-0 items-center justify-center rounded-xl border border-input-line bg-input ' +
  'text-lg font-semibold tabular-nums text-ink sm:w-12'

function OtpBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '')
  const active = Math.min(value.length, 5)

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id="otp-code"
        className="absolute inset-0 z-10 cursor-text opacity-0"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        value={value}
        disabled={disabled}
        aria-label="Six-digit verification code"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      />
      <div className="flex justify-center gap-1.5 sm:gap-2" aria-hidden="true">
        {digits.map((d, i) => (
          <div
            key={i}
            className={`${otpCellClass} ${
              i === active && !disabled ? 'border-focus ring-2 ring-ring/60' : ''
            }`}
          >
            {d || <span className="text-muted/40">·</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function VerifyOtpPage() {
  const { t } = useLocale()
  const { confirmOtp, resendOtp } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const state = (loc.state as NavState | null) ?? {}
  const purpose: OtpPurpose = 'reset'
  const email = (state.email ?? readResetEmail()).trim()

  useEffect(() => {
    if (email) writeResetEmail(email)
  }, [email])

  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const inflight = useRef(false)

  const demo = useMemo(() => (USE_MOCKS && email ? peekOtp(email, purpose) : null), [email, purpose, tick])

  useEffect(() => {
    if (!demo) return
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [demo?.code, demo?.expiresAt])

  if (!email) {
    return <Navigate to="/forgot-password" replace />
  }

  const remainingMs = demo ? Math.max(0, demo.expiresAt - Date.now()) : 0
  const remainingMin = Math.ceil(remainingMs / 60000)

  async function submit(raw = code) {
    if (inflight.current) return
    if (raw.length !== 6) {
      setError('Enter all 6 digits.')
      return
    }
    inflight.current = true
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      await confirmOtp(email, raw, purpose)
      nav('/reset-password', { replace: true, state: { email } })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      inflight.current = false
    } finally {
      setBusy(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await submit()
  }

  async function onResend() {
    setBusy(true)
    setError(null)
    try {
      await resendOtp(email, purpose)
      setCode('')
      setTick((n) => n + 1)
      setInfo(USE_MOCKS ? 'A new demo code is ready below.' : 'If that account exists, we sent a new code to your email.')
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
        <span className="absolute bottom-5 right-2 flex size-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-md ring-4 ring-bg">
          <Mail size={14} strokeWidth={2.5} />
        </span>
      </div>

      <h1 className="mt-5 text-center text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">
        {t('auth.otpTitle')} <span className="text-orange-500">{t('auth.otpAccent')}</span>
      </h1>
      <p className="mt-2 max-w-sm text-center text-sm text-ink-2">{t('auth.otpSub', { email })}</p>

      <form
        onSubmit={onSubmit}
        className="mt-7 w-full rounded-2xl border border-line bg-surface p-5 shadow-[0px_16px_40px_rgba(124,48,0,0.08)] sm:p-6"
      >
        {error && (
          <div className="mb-4">
            <Alert tone="error" title={t('auth.otpFail')}>
              {error}
            </Alert>
          </div>
        )}
        {info && !error && (
          <div className="mb-4">
            <Alert tone="success">{info}</Alert>
          </div>
        )}
        {USE_MOCKS && demo && (
          <div className="mb-4">
            <Alert tone="info" title="Demo code (local mock — no SMTP)">
              Use <span className="font-semibold tabular-nums tracking-[0.3em]">{demo.code}</span>
              {remainingMs > 0 ? ` · expires in about ${remainingMin} min` : ' · expired, send a new one'}.
            </Alert>
          </div>
        )}
        {!USE_MOCKS && (
          <div className="mb-4">
            <Alert tone="info" title="Check your inbox">
              We emailed a 6-digit Transly code. It can take a minute. Check spam if you do not see it.
            </Alert>
          </div>
        )}

        <OtpBoxes
          value={code}
          disabled={busy}
          onChange={(next) => {
            setCode(next)
            setError(null)
            if (next.length === 6) void submit(next)
          }}
        />

        <Button
          type="submit"
          className="mt-5 w-full !rounded-xl !bg-orange-500 !text-white shadow-md shadow-orange-500/25 hover:!bg-orange-600"
          size="lg"
          loading={busy}
          disabled={code.length !== 6}
        >
          {t('auth.verify')}
        </Button>

        <p className="mt-4 text-center text-sm text-ink-2">
          {t('auth.resend')}{' '}
          <button
            type="button"
            onClick={() => void onResend()}
            disabled={busy}
            className="font-medium text-orange-600 hover:text-orange-700 disabled:opacity-60"
          >
            {t('auth.sendCode')}
          </button>
        </p>

        <Link
          to="/forgot-password"
          className="mt-5 flex min-h-10 items-center justify-center gap-1.5 text-sm text-ink-2 transition hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden />
          {t('auth.forgot')}
        </Link>
      </form>
    </AuthShell>
  )
}
