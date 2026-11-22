import { CheckCircle2, CircleHelp, Download, Printer, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, ErrorAlert } from '../components/common/Alert'
import { Button } from '../components/common/Button'
import { LoadingState } from '../components/common/LoadingState'
import { Card } from '../components/common/ui'
import { ReviewStatusBadge } from '../components/common/StatusBadge'
import { ShareButtons, usePdfActions } from '../components/documents/PdfActions'
import { useLocale } from '../context/LocaleContext'
import { verifyUrl } from '../lib/links'
import { api } from '../services/api'
import type { VerifyResponse, VerifyResult } from '../types'

export default function VerificationPage() {
  const { id = '' } = useParams()
  const { t } = useLocale()
  const BANNER: Record<VerifyResult, { cls: string; icon: ReactNode; title: string; text: string }> = {
    valid: {
      cls: 'border-success/40 bg-success-bg text-success',
      icon: <CheckCircle2 size={48} aria-hidden />,
      title: t('flow.validTitle'),
      text: t('flow.validBody'),
    },
    revoked: {
      cls: 'border-danger/40 bg-danger-bg text-danger',
      icon: <XCircle size={48} aria-hidden />,
      title: t('flow.revokedTitle'),
      text: t('flow.revokedBody'),
    },
    not_found: {
      cls: 'border-warn/40 bg-warn-bg text-warn',
      icon: <CircleHelp size={48} aria-hidden />,
      title: t('flow.notFoundTitle'),
      text: t('flow.notFoundBody'),
    },
  }
  const [data, setData] = useState<VerifyResponse | null>(null)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(() => {
    setData(null)
    setError(null)
    api.verify(id).then(setData).catch(setError)
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const actions = usePdfActions(data?.pdfUrl ?? null, `transly-${id.slice(0, 8)}.pdf`)

  if (error != null) {
    return (
      <div className="mx-auto max-w-xl">
        <ErrorAlert title={t('flow.checkFail')} error={error} onRetry={load} retryLabel={t('ui.tryAgain')}>
          <span className="text-xs">{t('flow.checkConn')}</span>
        </ErrorAlert>
      </div>
    )
  }
  if (!data) return <LoadingState label={t('flow.checking')} />

  const b = BANNER[data.result]
  const found = data.result !== 'not_found'

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className={`rounded-2xl border-2 p-6 text-center ${b.cls}`} role="status">
        <div className="flex justify-center">{b.icon}</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{b.title}</h1>
        <p className="mt-1 text-sm">{b.text}</p>
      </div>

      {found && (
        <Card className="p-4 sm:p-5">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Item label={t('flow.issuedBy')} value={data.issuerName} />
            <Item
              label={t('flow.issueDate')}
              value={data.issuedAt ? new Date(data.issuedAt).toLocaleDateString(undefined, { dateStyle: 'long' }) : undefined}
            />
            <Item
              label={t('flow.languages')}
              value={
                data.sourceLanguage && data.targetLanguage
                  ? `${t(`langs.${data.sourceLanguage}`)} → ${t(`langs.${data.targetLanguage}`)}`
                  : undefined
              }
            />
            <Item label={t('flow.docType')} value={data.documentType ? t(`types.${data.documentType}`) : undefined} />
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-2">{t('flow.reviewStatus')}</dt>
              <dd className="mt-1.5">
                <ReviewStatusBadge status={data.reviewStatus} />
              </dd>
            </div>
          </dl>
        </Card>
      )}

      {data.result === 'valid' && (
        <Card className="space-y-3 p-4 sm:p-5">
          {data.pdfUrl ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button icon={<Download size={16} aria-hidden />} onClick={() => void actions.download()}>
                  {t('flow.downloadPdf')}
                </Button>
                <Button variant="secondary" icon={<Printer size={16} aria-hidden />} onClick={actions.print}>
                  {t('ui.print')}
                </Button>
              </div>
              {actions.error && <Alert tone="error">{actions.error}</Alert>}
              <iframe title={t('flow.pdfTitle')} src={data.pdfUrl} className="doc-paper h-[65vh] w-full rounded-xl border border-line" />
            </>
          ) : (
            <p className="text-sm text-ink-2">{t('flow.pdfPrivate')}</p>
          )}
          <ShareButtons link={verifyUrl(id)} />
        </Card>
      )}

      <p className="text-center text-xs text-ink-2">
        {t('flow.verifyFoot')}{' '}
        <Link to="/" className="font-medium text-brand-ink hover:underline">
          {t('flow.about')}
        </Link>
      </p>
    </div>
  )
}

function Item({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-2">{label}</dt>
      <dd className="mt-1 font-medium text-ink">{value ?? '—'}</dd>
    </div>
  )
}
