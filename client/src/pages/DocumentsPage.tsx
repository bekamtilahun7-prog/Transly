import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, FileText } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorAlert } from '../components/common/Alert'
import { buttonClass } from '../components/common/Button'
import { EmptyState, LoadingState } from '../components/common/LoadingState'
import { PageHeader } from '../components/common/ui'
import { DocumentList } from '../components/documents/DocumentList'
import { fileNameOf } from '../lib/format'
import { api } from '../services/api'
import type { DocumentRecord } from '../types'

const PAGE_SIZE = 5

type Filter = 'all' | 'completed' | 'in_progress' | 'draft'
type Sort = 'newest' | 'oldest'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'draft', label: 'Draft' },
]

function matchesFilter(doc: DocumentRecord, filter: Filter) {
  if (filter === 'completed') return doc.status === 'issued'
  if (filter === 'draft') return doc.status === 'uploaded'
  if (filter === 'in_progress') return doc.status !== 'issued' && doc.status !== 'uploaded'
  return true
}

export default function DocumentsPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim().toLowerCase()
  const [docs, setDocs] = useState<DocumentRecord[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('newest')
  const [page, setPage] = useState(1)

  const load = useCallback(() => {
    setError(null)
    setDocs(null)
    api.listMyDocuments().then(setDocs).catch(setError)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [q, filter, sort])

  const stats = useMemo(() => {
    if (!docs) return { total: null as number | null, completed: null as number | null, inProgress: null as number | null }
    const completed = docs.filter((d) => d.status === 'issued').length
    return { total: docs.length, completed, inProgress: docs.length - completed }
  }, [docs])

  const filtered = useMemo(() => {
    if (!docs) return []
    const searched = q ? docs.filter((d) => fileNameOf(d).toLowerCase().includes(q)) : docs
    const next = searched.filter((d) => matchesFilter(d, filter))
    next.sort((a, b) => a.createdAt.localeCompare(b.createdAt) * (sort === 'newest' ? -1 : 1))
    return next
  }, [docs, q, filter, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pages)
  const shown = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const to = Math.min(safePage * PAGE_SIZE, filtered.length)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your Documents"
        title="My Documents"
        description="View and manage all your uploaded and translated documents."
        aside={
          <div className="flex items-center gap-5 rounded-2xl border border-line bg-surface px-5 py-3">
            <MiniStat icon={<FileText size={16} className="text-orange-500" />} value={stats.total} label="Total Documents" />
            <span className="hidden h-8 w-px bg-line sm:block" />
            <MiniStat icon={<CheckCircle2 size={16} className="text-emerald-500" />} value={stats.completed} label="Completed" />
            <span className="hidden h-8 w-px bg-line sm:block" />
            <MiniStat icon={<Clock3 size={16} className="text-violet-500" />} value={stats.inProgress} label="In Progress" />
          </div>
        }
      />

      {error != null && <ErrorAlert title="Could not load documents" error={error} onRetry={load} />}

      <div className="rounded-2xl border border-line bg-surface">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <FileText size={18} className="text-brand-ink" aria-hidden />
            All Documents
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition duration-150 ${
                    active ? 'bg-orange-500 text-white' : 'text-ink-2 hover:bg-hover hover:text-ink'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
            <label className="ml-auto flex items-center gap-2 text-xs text-ink-2 sm:ml-2">
              <span className="hidden sm:inline">Sort by:</span>
              <select
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink"
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                aria-label="Sort documents"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </label>
          </div>
        </div>

        {q && (
          <p className="border-b border-line px-5 py-3 text-sm text-ink-2">
            Showing results for <span className="font-medium text-ink">“{params.get('q')}”</span>
            {' · '}
            <Link to="/documents" className="text-brand-ink hover:underline">
              Clear search
            </Link>
          </p>
        )}
        {docs == null && error == null && <LoadingState label="Loading your documents…" />}
        {docs && shown.length === 0 && (
          <EmptyState
            title={q || filter !== 'all' ? 'No matching documents' : 'No documents yet'}
            action={
              <Link to="/documents/upload" className={buttonClass('primary', 'md')}>
                Upload a document
              </Link>
            }
          >
            {q || filter !== 'all'
              ? 'Try a different filter, name, or clear the search.'
              : 'Upload a PDF, JPG, or PNG to start a translation.'}
          </EmptyState>
        )}
        {shown.length > 0 && <DocumentList docs={shown} />}
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-ink-2 sm:px-5">
            <p>
              Showing {from}–{to} of {filtered.length} documents
            </p>
            {pages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex size-8 items-center justify-center rounded-full border border-line hover:bg-hover disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`Page ${n}`}
                    aria-current={n === safePage ? 'page' : undefined}
                    onClick={() => setPage(n)}
                    className={`flex size-8 items-center justify-center rounded-full text-xs font-medium ${
                      n === safePage ? 'bg-orange-500 text-white' : 'hover:bg-hover'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={safePage >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  className="flex size-8 items-center justify-center rounded-full border border-line hover:bg-hover disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MiniStat({ icon, value, label }: { icon: ReactNode; value: number | null; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-full bg-bg-2">{icon}</span>
      <div>
        <p className="text-lg font-semibold leading-none tabular-nums text-ink">{value ?? '—'}</p>
        <p className="mt-0.5 text-[10px] text-ink-2">{label}</p>
      </div>
    </div>
  )
}
