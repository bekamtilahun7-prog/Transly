import { ArrowRight, CheckCircle2, Clock3, FileText, Folder, Globe } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ErrorAlert } from '../components/common/Alert'
import { buttonClass } from '../components/common/Button'
import { EmptyState, LoadingState } from '../components/common/LoadingState'
import { Eyebrow } from '../components/common/ui'
import { DocumentList } from '../components/documents/DocumentList'
import { useAuth } from '../context/AuthContext'
import { LANGUAGES } from '../lib/constants'
import { displayNameOf } from '../lib/format'
import { api } from '../services/api'
import type { DocumentRecord, LangCode } from '../types'

const RECENT_LIMIT = 5

function isComplete(status: DocumentRecord['status']) {
  return status === 'issued'
}

function EtFlag() {
  return (
    <svg viewBox="0 0 36 36" className="size-full" aria-hidden>
      <rect width="36" height="12" y="0" fill="#078930" />
      <rect width="36" height="12" y="12" fill="#FCDD09" />
      <rect width="36" height="12" y="24" fill="#DA121A" />
      <circle cx="18" cy="18" r="5.2" fill="#0F47AF" />
      <circle cx="18" cy="18" r="2.2" fill="#FCDD09" />
    </svg>
  )
}

function UkFlag() {
  return (
    <svg viewBox="0 0 60 36" className="size-full" aria-hidden>
      <rect width="60" height="36" fill="#012169" />
      <path d="M0 0 L60 36 M60 0 L0 36" stroke="#fff" strokeWidth="8" />
      <path d="M0 0 L60 36 M60 0 L0 36" stroke="#C8102E" strokeWidth="3" />
      <path d="M30 0 V36 M0 18 H60" stroke="#fff" strokeWidth="12" />
      <path d="M30 0 V36 M0 18 H60" stroke="#C8102E" strokeWidth="7" />
    </svg>
  )
}

function RoundFlag({ code }: { code: LangCode }) {
  return (
    <span className="flex size-8 shrink-0 overflow-hidden rounded-full shadow-sm ring-1 ring-black/10" aria-hidden>
      {code === 'en' ? <UkFlag /> : <EtFlag />}
    </span>
  )
}

function DashStat({
  icon,
  label,
  value,
  card,
  iconWrap,
}: {
  icon: ReactNode
  label: string
  value: number | null
  card: string
  iconWrap: string
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 ${card}`}>
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${iconWrap}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[28px] font-semibold leading-none tabular-nums text-ink">{value ?? '—'}</p>
        <p className="mt-1 truncate text-xs text-ink-2">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const name = displayNameOf(user?.email ?? '')
  const [docs, setDocs] = useState<DocumentRecord[] | null>(null)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(() => {
    setError(null)
    setDocs(null)
    api.listMyDocuments().then(setDocs).catch(setError)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => {
    if (!docs) return { total: null as number | null, completed: null as number | null, inProgress: null as number | null }
    const completed = docs.filter((d) => isComplete(d.status)).length
    return { total: docs.length, completed, inProgress: docs.length - completed }
  }, [docs])

  const recent = docs?.slice(0, RECENT_LIMIT) ?? []

  return (
    <div className="space-y-5">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20.5rem]">
        <div className="min-w-0">
          <Eyebrow>Welcome back!</Eyebrow>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-[34px]/10">
            Hello, {name}! <span aria-hidden>👋</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-2 sm:text-base">
            Manage your documents, track progress, and more — all in one place.
          </p>

          {error != null && (
            <div className="mt-4">
              <ErrorAlert title="Could not load your documents" error={error} onRetry={load} />
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <DashStat
              icon={<Folder size={20} aria-hidden />}
              label="Total Documents"
              value={stats.total}
              card="bg-orange-50 dark:bg-orange-500/10"
              iconWrap="bg-white text-orange-500 shadow-sm dark:bg-elevated"
            />
            <DashStat
              icon={<CheckCircle2 size={20} aria-hidden />}
              label="Completed"
              value={stats.completed}
              card="bg-sky-50 dark:bg-sky-500/10"
              iconWrap="bg-white text-sky-500 shadow-sm dark:bg-elevated"
            />
            <DashStat
              icon={<Clock3 size={20} aria-hidden />}
              label="In Progress"
              value={stats.inProgress}
              card="bg-violet-50 dark:bg-violet-500/10"
              iconWrap="bg-white text-violet-500 shadow-sm dark:bg-elevated"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Globe size={18} className="text-brand-ink" aria-hidden />
            Supported Languages
          </h2>
          <ul className="mt-4 space-y-3.5">
            {LANGUAGES.map((l) => (
              <li key={l.code} className="flex items-center gap-3 text-sm">
                <RoundFlag code={l.code} />
                <span className="font-medium text-ink">{l.label}</span>
                <span className="ml-auto text-xs text-ink-2">({l.code.toUpperCase()})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <FileText size={18} className="text-brand-ink" aria-hidden />
            Your Recent Documents
          </h2>
          <Link
            to="/documents"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-ink transition duration-150 hover:text-orange-700"
          >
            View All <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
        {docs == null && error == null && <LoadingState label="Loading your documents…" className="py-10" />}
        {docs && docs.length === 0 && (
          <EmptyState
            icon={<Folder size={22} aria-hidden />}
            title="No documents yet"
            action={
              <Link to="/documents/upload" className={buttonClass('primary', 'md')}>
                Upload a document
              </Link>
            }
          >
            Upload a PDF, JPG, or PNG to start a translation.
          </EmptyState>
        )}
        {recent.length > 0 && <DocumentList docs={recent} />}
      </div>
    </div>
  )
}
