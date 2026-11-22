import { Eye, EyeOff, Lock } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { AccessibilityLauncher } from '../accessibility/AccessibilityLauncher'
import { LanguageSwitcher } from '../common/LanguageSwitcher'
import { ThemeToggle } from '../common/ThemeToggle'
import { useLocale } from '../../context/LocaleContext'

export const authInputClass =
  'block w-full min-h-11 rounded-xl border border-input-line bg-input px-3.5 text-sm text-ink placeholder:text-muted ' +
  'transition duration-150 focus:outline-none focus:border-focus focus:ring-2 focus:ring-ring/60 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg text-ink">
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 sm:right-6 sm:top-6">
        <LanguageSwitcher compact />
        <AccessibilityLauncher />
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
      <main id="main" data-page-content className="relative mx-auto flex w-full max-w-[420px] flex-col items-center px-5 py-10 sm:py-14">
        {children}
      </main>
    </div>
  )
}

export function AuthField({
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
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

export function PasswordField({
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
  const { t } = useLocale()
  return (
    <AuthField id={id} label={label} icon={<Lock size={16} aria-hidden />} error={error}>
      <div className="relative">
        <input
          id={id}
          className={`${authInputClass} pr-11`}
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
          aria-label={show ? t('auth.hidePass') : t('auth.showPass')}
          aria-pressed={show}
          className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition duration-150 hover:bg-hover hover:text-ink"
        >
          {show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
    </AuthField>
  )
}
