import type { ReactNode } from 'react'

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border border-line bg-surface shadow-sm shadow-slate-900/[0.03] ${className}`}>{children}</div>
}

/** Small orange tag above page titles ("● Your Documents"). */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft-2 px-3 py-1 text-xs font-medium text-brand-ink">
      <span className="size-2 rounded-full bg-brand" aria-hidden />
      {children}
    </span>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  aside?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-[32px]/10">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-ink-2 sm:text-base">{description}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  )
}

type StatTone = 'brand' | 'success' | 'info' | 'warn'

const statTone: Record<StatTone, string> = {
  brand: 'bg-brand-soft-2 text-brand-ink',
  success: 'bg-success-bg text-success',
  info: 'bg-info-bg text-info',
  warn: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
}

/** A count derived from real data. Pass `value={null}` while loading or when the data failed to load. */
export function StatCard({
  icon,
  label,
  value,
  tone = 'brand',
  className = '',
}: {
  icon: ReactNode
  label: string
  value: number | null
  tone?: StatTone
  className?: string
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 ${className}`}>
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${statTone[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-2xl font-semibold leading-7 text-ink tabular-nums">{value ?? '—'}</p>
        <p className="truncate text-xs text-ink-2">{label}</p>
      </div>
    </div>
  )
}
