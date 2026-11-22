import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

export function LoadingState({ label = 'Loading…', className = '' }: { label?: string; className?: string }) {
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-3 py-16 text-ink-2 ${className}`}>
      <Loader2 size={28} className="animate-spin text-brand" aria-hidden />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      {icon && (
        <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-ink">{icon}</span>
      )}
      <p className="text-base font-semibold text-ink">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-ink-2">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
