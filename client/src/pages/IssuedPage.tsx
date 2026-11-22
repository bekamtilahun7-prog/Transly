import { Download, Printer } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Alert, ErrorAlert } from '../components/common/Alert'
import { Button, buttonClass } from '../components/common/Button'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { Card, PageHeader } from '../components/common/ui'
import { ShareButtons, usePdfActions } from '../components/documents/PdfActions'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { getIssued, getIssuedDocumentId } from '../lib/issue'
import { verifyUrl } from '../lib/links'
import { canDownloadIssued, recordFreeDownload } from '../lib/subscription'
import { api } from '../services/api'
import { errMsg } from '../services/errors'
import type { VerifyResult } from '../types'

export default function IssuedPage() {
  const { verificationId = '' } = useParams()
  const loc = useLocation()
  const { user } = useAuth()
  const { t } = useLocale()
  const sha = (loc.state as { sha256?: string } | null)?.sha256
  const mem = getIssued(verificationId)
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null)
  const [remoteErr, setRemoteErr] = useState<string | null>(null)
  const [status, setStatus] = useState<VerifyResult | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [revokeError, setRevokeError] = useState<unknown>(null)
  const [downloadLimitError, setDownloadLimitError] = useState<string | null>(null)
  const downloadGate = canDownloadIssued(verificationId)

  useEffect(() => {
    api
      .verify(verificationId)
      .then((v) => {
        setStatus(v.result)
        if (!mem) {
          if (v.pdfUrl) setRemoteUrl(v.pdfUrl)
          else {
            setRemoteErr(t('flow.pdfGone'))
          }
        }
      })
      .catch((e) => {
        if (!mem) setRemoteErr(errMsg(e))
      })
  }, [mem, verificationId, t])

  useEffect(() => {
    const docId = getIssuedDocumentId(verificationId)
    if (!docId || !user) return
    api
      .getDocument(docId)
      .then((d) => setIsOwner(d.ownerId === user.id))
      .catch(() => setIsOwner(false))
  }, [verificationId, user])

  const revoke = useCallback(async () => {
    setRevoking(true)
    setRevokeError(null)
    try {
      await api.revokeDocument(verificationId)
      setStatus('revoked')
      setConfirming(false)
    } catch (e) {
      setRevokeError(e)
    } finally {
      setRevoking(false)
    }
  }, [verificationId])

  const blobUrl = useMemo(
    () => (mem ? URL.createObjectURL(new Blob([mem.pdf as BlobPart], { type: 'application/pdf' })) : null),
    [mem],
  )
  useEffect(
    () => () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    },
    [blobUrl],
  )

  const pdfUrl = blobUrl ?? remoteUrl
  const link = verifyUrl(verificationId)
  const actions = usePdfActions(pdfUrl, `transly-${verificationId.slice(0, 8)}.pdf`)
  const revoked = status === 'revoked'

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        eyebrow={t('flow.issuedEyebrow')}
        title={revoked ? t('flow.revokedDocTitle') : t('flow.issuedTitle')}
        description={revoked ? t('flow.revokedDocDesc') : t('flow.issuedDesc')}
      />

      {revoked ? (
        <Alert tone="error" title={t('flow.revokedDocTitle')}>
          {t('flow.revokedAlert')}
        </Alert>
      ) : (
        <Alert tone="success" title={t('flow.issuedTitle')}>
          {t('flow.issuedAlert')}
        </Alert>
      )}

      <Card className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="text-sm font-semibold text-ink">{t('flow.verifyLink')}</p>
          <p className="mt-1 break-all rounded-xl bg-bg-2 p-3 font-mono text-xs text-ink">{link}</p>
          {sha && <p className="mt-1 break-all text-xs text-ink-2">SHA-256: {sha}</p>}
        </div>

        {pdfUrl ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              icon={<Download size={16} aria-hidden />}
              disabled={!downloadGate.ok}
              onClick={() => {
                const res = recordFreeDownload(verificationId)
                if (!res.ok) {
                  setDownloadLimitError(t('flow.downloadLimitHit', { n: res.limit }))
                  return
                }
                setDownloadLimitError(null)
                void actions.download()
              }}
            >
              {t('flow.downloadPdf')}
            </Button>
            <Button variant="secondary" icon={<Printer size={16} aria-hidden />} onClick={actions.print}>
              {t('ui.print')}
            </Button>
          </div>
        ) : (
          remoteErr && <Alert tone="warn">{remoteErr}</Alert>
        )}
        <ShareButtons link={link} />
        {downloadLimitError && (
          <Alert tone="warn" title={t('flow.downloadLimit')}>
            {downloadLimitError}{' '}
            <Link to="/onboarding" className="font-medium text-brand-ink hover:underline">
              {t('checkout.viewPlans')}
            </Link>
          </Alert>
        )}
        {!downloadGate.ok && !downloadLimitError && (
          <Alert tone="warn" title={t('flow.downloadLimitReached')}>
            {t('flow.downloadLimitBody', { n: downloadGate.limit })}
          </Alert>
        )}
        {actions.error && (
          <Alert tone="error" title={t('flow.actionFail')}>
            {actions.error}
          </Alert>
        )}
        <Link to={`/v/${verificationId}`} className="inline-block text-sm font-medium text-brand-ink hover:underline">
          {t('flow.openVerify')}
        </Link>
      </Card>

      {isOwner && !revoked && (
        <Card className="space-y-3 border-danger/30 p-4 sm:p-5">
          <h2 className="font-semibold text-danger">{t('flow.revokeTitle')}</h2>
          <p className="text-sm text-ink-2">{t('flow.revokeBody')}</p>
          {revokeError != null && <ErrorAlert title={t('flow.revokeFail')} error={revokeError} onRetry={() => void revoke()} />}
          <Button variant="danger" onClick={() => setConfirming(true)}>
            {t('flow.revokeBtn')}
          </Button>
          <ConfirmDialog
            open={confirming}
            title={t('flow.revokeAsk')}
            confirmLabel={t('flow.revokeYes')}
            confirmVariant="danger"
            busy={revoking}
            onConfirm={() => void revoke()}
            onCancel={() => {
              setConfirming(false)
              setRevokeError(null)
            }}
          >
            {t('flow.revokeConfirm')}
          </ConfirmDialog>
        </Card>
      )}

      {pdfUrl && (
        <Card className="overflow-hidden p-2">
          <iframe title={t('flow.issuedPdf')} src={pdfUrl} className="doc-paper h-[70vh] w-full rounded-xl" />
        </Card>
      )}
      <Link to="/documents" className={buttonClass('ghost', 'sm')}>
        {t('flow.backDocs')}
      </Link>
    </div>
  )
}
