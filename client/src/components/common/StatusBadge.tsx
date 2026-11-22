import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { STATUS_LABEL, docTypeLabel, langLabel } from '../../lib/constants'
import type { DocStatus, DocType, LangCode, ReviewStatus, VerifyResult } from '../../types'

type BadgeTone = 'success' | 'warn' | 'danger' | 'info' | 'neutral' | 'brand' | 'violet'

const toneCls: Record<BadgeTone, string> = {
  success: 'bg-success-bg text-success',
  warn: 'bg-warn-bg text-warn',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-info-bg text-info',
  neutral: 'bg-bg-2 text-ink-2',
  brand: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
}

export function Badge({ tone, dot = false, children }: { tone: BadgeTone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${toneCls[tone]}`}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

const statusTone: Record<DocStatus, BadgeTone> = {
  uploaded: 'neutral',
  extracted: 'info',
  translated: 'info',
  in_review: 'warn',
  reviewed: 'success',
  issued: 'success',
}

/** documents.status as reported by the backend. */
export function StatusBadge({ status }: { status: DocStatus }) {
  return (
    <Badge tone={statusTone[status] ?? 'neutral'} dot>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  )
}

const typeTone: Record<DocType, BadgeTone> = {
  academic: 'info',
  id_certificate: 'violet',
  legal: 'success',
  other: 'neutral',
}

export function DocTypeBadge({ type }: { type: DocType | null | undefined }) {
  if (!type) return <span className="text-ink-2">—</span>
  return <Badge tone={typeTone[type] ?? 'neutral'}>{docTypeLabel(type)}</Badge>
}

/** "AM → EN" chip; the full language names are available to screen readers and on hover. */
export function LangPair({ source, target }: { source: LangCode; target: LangCode }) {
  const full = `${langLabel(source)} to ${langLabel(target)}`
  return (
    <span
      title={full}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-bg-2 px-2.5 py-1 text-xs font-medium text-ink-2"
    >
      <span aria-hidden>{source.toUpperCase()}</span>
      <ArrowRight size={12} aria-hidden />
      <span aria-hidden>{target.toUpperCase()}</span>
      <span className="sr-only">{full}</span>
    </span>
  )
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus | undefined }) {
  if (status === 'human_reviewed') return <Badge tone="success">Human reviewed</Badge>
  if (status === 'machine') return <Badge tone="warn">Machine translated, not human reviewed</Badge>
  return <span className="text-ink-2">—</span>
}

const verifyTone: Record<VerifyResult, BadgeTone> = { valid: 'success', revoked: 'danger', not_found: 'warn' }
const verifyText: Record<VerifyResult, string> = { valid: 'Valid', revoked: 'Revoked', not_found: 'Not found' }

export function VerifyBadge({ result }: { result: VerifyResult }) {
  return (
    <Badge tone={verifyTone[result]} dot>
      {verifyText[result]}
    </Badge>
  )
}
