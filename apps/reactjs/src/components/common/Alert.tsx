import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { describeError } from '../../services/errors'
import { Button, buttonClass } from './Button'

export type Tone = 'info' | 'success' | 'warn' | 'error'

const tones: Record<Tone, { cls: string; icon: ReactNode }> = {
  info: { cls: 'bg-info-bg text-info border-info/25', icon: <Info size={18} aria-hidden /> },
  success: { cls: 'bg-success-bg text-success border-success/25', icon: <CheckCircle2 size={18} aria-hidden /> },
  warn: { cls: 'bg-warn-bg text-warn border-warn/25', icon: <AlertTriangle size={18} aria-hidden /> },
  error: { cls: 'bg-danger-bg text-danger border-danger/25', icon: <XCircle size={18} aria-hidden /> },
}

export function Alert({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: Tone
  title?: string
  children?: ReactNode
  action?: ReactNode
}) {
  const t = tones[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-xl border p-3.5 ${t.cls}`}>
      <span className="mt-0.5 shrink-0">{t.icon}</span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={`text-sm text-ink ${title ? 'mt-0.5' : ''}`}>{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}

/**
 * One consistent error box for anything thrown by the API layer. Shows the real message,
 * and offers Retry only when retrying can help (rate limit, server error, network).
 */
export function ErrorAlert({
  title,
  error,
  onRetry,
  retryLabel = 'Try again',
  children,
}: {
  title: string
  error: unknown
  onRetry?: () => void
  retryLabel?: string
  /** Extra actions, e.g. a link back. */
  children?: ReactNode
}) {
  const info = describeError(error)
  const showRetry = info.retryable && !!onRetry
  return (
    <Alert
      tone="error"
      title={title}
      action={
        showRetry || info.needsLogin || children ? (
          <div className="flex flex-wrap items-center gap-2">
            {showRetry && (
              <Button size="sm" onClick={onRetry}>
                {retryLabel}
              </Button>
            )}
            {info.needsLogin && (
              <Link to="/login" className={buttonClass('primary', 'sm')}>
                Log in again
              </Link>
            )}
            {children}
          </div>
        ) : undefined
      }
    >
      <p>{info.message}</p>
      {info.detail && info.detail !== info.message && (
        <p className="mt-1 break-words text-xs text-ink-2">Details: {info.detail}</p>
      )}
    </Alert>
  )
}
