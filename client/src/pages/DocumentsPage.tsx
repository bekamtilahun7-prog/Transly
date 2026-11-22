import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, FileText } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorAlert } from '../components/common/Alert'
import { buttonClass } from '../components/common/Button'
import { EmptyState, LoadingState } from '../components/common/LoadingState'
import { PageHeader } from '../components/common/ui'
import { DocumentList } from '../components/documents/DocumentList'
import { useLocale } from '../context/LocaleContext'
import { fileNameOf } from '../lib/format'
import { api } from '../services/api'
import type { DocumentRecord } from '../types'

const PAGE_SIZE = 5

type Filter = 'all' | 'completed' | 'in_progress' | 'draft'
type Sort = 'newest' | 'oldest'

const FILTERS: { id: Filter; key: 'all' | 'completed' | 'progress' | 'draft' }[] = [
  { id: 'all', key: 'all' },
  { id: 'completed', key: 'completed' },
  { id: 'in_progress', key: 'progress' },
  { id: 'draft', key: 'draft' },
]

function matchesFilter(doc: DocumentRecord, filter: Filter) {
  if (filter === 'completed') return doc.status === 'issued'
  if (filter === 'draft') return doc.status === 'uploaded'
  if (filter === 'in_progress') return doc.status !== 'issued' && doc.status !== 'uploaded'
  return true
}

export default function DocumentsPage() {
  const { t } = useLocale()
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
        eyebrow={t('docs.eyebrow')}
        title={t('docs.title')}
        description={t('docs.desc')}
        aside={
          <div className="flex items-center gap-5 rounded-2xl border border-line bg-surface px-5 py-3">
            <MiniStat icon={<FileText size={16} className="text-orange-500" />} value={stats.total} label={t('dash.total')} />
            <span className="hidden h-8 w-px bg-line sm:block" />
            <MiniStat icon={<CheckCircle2 size={16} className="text-emerald-500" />} value={stats.completed} label={t('dash.completed')} />
            <span className="hidden h-8 w-px bg-line sm:block" />
            <MiniStat icon={<Clock3 size={16} className="text-violet-500" />} value={stats.inProgress} label={t('dash.progress')} />
          </div>
        }
      />

      {error != null && <ErrorAlert title={t('docs.loadFail')} error={error} onRetry={load} />}

      <div className="rounded-2xl border border-line bg-surface">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <FileText size={18} className="text-brand-ink" aria-hidden />
            {t('docs.allDocs')}
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
                  {t(`docs.${f.key}`)}
                </button>
              )
            })}
            <label className="ml-auto flex items-center gap-2 text-xs text-ink-2 sm:ml-2">
              <span className="hidden sm:inline">{t('docs.sortBy')}</span>
              <select
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink"
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                aria-label={t('docs.sortAria')}
              >
                <option value="newest">{t('docs.newest')}</option>
                <option value="oldest">{t('docs.oldest')}</option>
              </select>
            </label>
          </div>
        </div>

        {q && (
          <p className="border-b border-line px-5 py-3 text-sm text-ink-2">
            {t('docs.showingQ')} <span className="font-medium text-ink">“{params.get('q')}”</span>
            {' · '}
            <Link to="/documents" className="text-brand-ink hover:underline">
              {t('docs.clear')}
            </Link>
          </p>
        )}
        {docs == null && error == null && <LoadingState label={t('dash.loading')} />}
        {docs && shown.length === 0 && (
          <EmptyState
            title={q || filter !== 'all' ? t('docs.noMatch') : t('dash.noDocs')}
            action={
              <Link to="/documents/upload" className={buttonClass('primary', 'md')}>
                {t('dash.upload')}
              </Link>
            }
          >
            {q || filter !== 'all' ? t('docs.noMatchHint') : t('dash.empty')}
          </EmptyState>
        )}
        {shown.length > 0 && <DocumentList docs={shown} />}
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-ink-2 sm:px-5">
            <p>
              {t('docs.showingRange', { from, to, count: filtered.length })}
            </p>
            {pages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={t('docs.prev')}
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
                    aria-label={t('docs.page', { n })}
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
                  aria-label={t('docs.next')}
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
