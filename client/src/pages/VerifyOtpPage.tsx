import { ArrowLeft, KeyRound, Mail } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell, authInputClass } from '../components/auth/AuthShell'
import { Alert } from '../components/common/Alert'
import { Button } from '../components/common/Button'
import { Logo } from '../components/common/Logo'
import { useAuth } from '../context/AuthContext'
import { USE_MOCKS } from '../lib/constants'
import { peekOtp, type OtpPurpose } from '../lib/mockAccounts'
import { afterAuthPath, hasCompletedPlanChoice } from '../lib/subscription'

type NavState = { email?: string; purpose?: OtpPurpose; next?: string }

function OtpBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '')

  function focusAt(i: number) {
    refs.current[Math.max(0, Math.min(5, i))]?.focus()
  }

  function apply(next: string, focus?: number) {
    onChange(next.replace(/\D/g, '').slice(0, 6))
    if (typeof focus === 'number') requestAnimationFrame(() => focusAt(focus))
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    apply(pasted, pasted.length >= 6 ? 5 : pasted.length)
  }

  return (
    <div className="flex justify-center gap-2" role="group" aria-label="Six-digit verification code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          className={`${authInputClass} h-12 w-11 px-0 text-center text-lg font-semibold tabular-nums sm:w-12`}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={d}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          onPaste={onPaste}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, '').slice(-1)
            const next = value.slice(0, i) + ch + value.slice(i + 1)
            apply(ch ? next.replace(/\s/g, '') : value.slice(0, i) + value.slice(i + 1), ch ? i + 1 : i)
          }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Backspace' && !digits[i] && i > 0) {
              e.preventDefault()
              apply(value.slice(0, i - 1) + value.slice(i), i - 1)
            }
            if (e.key === 'ArrowLeft') {
              e.preventDefault()
              focusAt(i - 1)
            }
            if (e.key === 'ArrowRight') {
              e.preventDefault()
              focusAt(i + 1)
            }
          }}
        />
      ))}
    </div>
  )
}

export default function VerifyOtpPage() {
  const { confirmOtp, resendOtp } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const formId = useId()
  const state = (loc.state as NavState | null) ?? {}
  const purpose: OtpPurpose = state.purpose === 'reset' ? 'reset' : 'signup'
  const email = (state.email ?? '').trim()
  const fallback = hasCompletedPlanChoice() ? '/dashboard' : afterAuthPath()
  const next = state.next && !state.next.startsWith('/login') ? state.next : fallback

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
    return <Navigate to={purpose === 'reset' ? '/forgot-password' : '/register'} replace />
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
      if (purpose === 'signup') nav(next, { replace: true })
      else nav('/reset-password', { replace: true, state: { email } })
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
      setInfo(USE_MOCKS ? 'A new demo code is ready below.' : 'If an account exists, we sent a new code.')
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
        Verify <span className="text-orange-500">your email</span>
      </h1>
      <p className="mt-2 max-w-sm text-center text-sm text-ink-2">
        {purpose === 'signup'
          ? 'Enter the 6-digit code to finish creating your account for'
          : 'Enter the 6-digit code to reset the password for'}{' '}
        <span className="font-medium text-ink">{email}</span>.
      </p>

      <form
        id={formId}
        onSubmit={onSubmit}
        className="mt-7 w-full rounded-2xl border border-line bg-surface p-5 shadow-[0px_16px_40px_rgba(124,48,0,0.08)] sm:p-6"
      >
        {error && (
          <div className="mb-4">
            <Alert tone="error" title="Could not verify">
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
            <Alert tone="info" title="Demo code (no email is sent)">
              Use <span className="font-semibold tabular-nums tracking-[0.3em]">{demo.code}</span>
              {remainingMs > 0 ? ` · expires in about ${remainingMin} min` : ' · expired, send a new one'}.
            </Alert>
          </div>
        )}
        {!USE_MOCKS && (
          <div className="mb-4">
            <Alert tone="info" title="Check your inbox">
              Six-digit codes are for the local demo. With live auth, open the link in your email instead.
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
          Verify code
        </Button>

        <p className="mt-4 text-center text-sm text-ink-2">
          Didn’t get a code?{' '}
          <button
            type="button"
            onClick={() => void onResend()}
            disabled={busy}
            className="font-medium text-orange-600 hover:text-orange-700 disabled:opacity-60"
          >
            Send a new one
          </button>
        </p>

        <Link
          to={purpose === 'reset' ? '/forgot-password' : '/register'}
          className="mt-5 flex min-h-10 items-center justify-center gap-1.5 text-sm text-ink-2 transition hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden />
          {purpose === 'reset' ? 'Back to forgot password' : 'Back to register'}
        </Link>
      </form>
    </AuthShell>
  )
}
