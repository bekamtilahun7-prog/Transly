import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorAlert } from '../components/common/Alert'
import { buttonClass } from '../components/common/Button'
import { EmptyState, LoadingState } from '../components/common/LoadingState'
import { PageHeader, StatCard } from '../components/common/ui'
import { DocumentList } from '../components/documents/DocumentList'
import { Clock3, Languages } from 'lucide-react'
import { api } from '../services/api'
import type { DocumentRecord } from '../types'

export default function TranslatorDashboardPage() {
  const [docs, setDocs] = useState<DocumentRecord[] | null>(null)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(() => {
    setError(null)
    setDocs(null)
    api.listReviewQueue().then(setDocs).catch(setError)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Translator Workspace"
        title="Translator Dashboard"
        description="Review and approve translated documents from the queue."
      />

      {error != null && <ErrorAlert title="Could not load the review queue" error={error} onRetry={load} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard icon={<Clock3 size={20} />} label="Pending review" value={docs?.length ?? null} tone="brand" />
        <StatCard icon={<Languages size={20} />} label="In this queue" value={docs?.length ?? null} tone="brand" />
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        {docs == null && error == null && <LoadingState label="Loading the queue…" />}
        {docs && docs.length === 0 && (
          <EmptyState title="Nothing waiting for review" action={<Link to="/dashboard" className={buttonClass('secondary')}>Back to dashboard</Link>}>
            Documents appear here after an owner requests human review.
          </EmptyState>
        )}
        {docs && docs.length > 0 && <DocumentList docs={docs} hrefFor={(d) => `/translator/${d.id}`} />}
      </div>
    </div>
  )
}
