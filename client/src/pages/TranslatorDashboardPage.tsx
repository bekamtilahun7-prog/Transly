import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorAlert } from '../components/common/Alert'
import { buttonClass } from '../components/common/Button'
import { EmptyState, LoadingState } from '../components/common/LoadingState'
import { PageHeader, StatCard } from '../components/common/ui'
import { DocumentList } from '../components/documents/DocumentList'
import { Clock3, Languages } from 'lucide-react'
import { useLocale } from '../context/LocaleContext'
import { api } from '../services/api'
import type { DocumentRecord } from '../types'

export default function TranslatorDashboardPage() {
  const { t } = useLocale()
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
        eyebrow={t('flow.transWork')}
        title={t('flow.transDash')}
        description={t('flow.transDashDesc')}
      />

      {error != null && <ErrorAlert title={t('flow.queueFail')} error={error} onRetry={load} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard icon={<Clock3 size={20} />} label={t('flow.pending')} value={docs?.length ?? null} tone="brand" />
        <StatCard icon={<Languages size={20} />} label={t('flow.inQueue')} value={docs?.length ?? null} tone="brand" />
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        {docs == null && error == null && <LoadingState label={t('flow.queueLoad')} />}
        {docs && docs.length === 0 && (
          <EmptyState title={t('flow.queueEmpty')} action={<Link to="/dashboard" className={buttonClass('secondary')}>{t('flow.backDash')}</Link>}>
            {t('flow.queueEmptyHint')}
          </EmptyState>
        )}
        {docs && docs.length > 0 && <DocumentList docs={docs} hrefFor={(d) => `/translator/${d.id}`} />}
      </div>
    </div>
  )
}
