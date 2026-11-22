import { Download, Printer } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Alert, ErrorAlert } from '../components/common/Alert'
import { Button, buttonClass } from '../components/common/Button'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { Card, PageHeader } from '../components/common/ui'
import { ShareButtons, usePdfActions } from '../components/documents/PdfActions'
import { useAuth } from '../context/AuthContext'
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
            setRemoteErr(
              'The PDF is not kept in this browser after a reload, and this document is not public, so it cannot be downloaded again here.',
            )
          }
        }
      })
      .catch((e) => {
        if (!mem) setRemoteErr(errMsg(e))
      })
  }, [mem, verificationId])

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
        eyebrow="Issued document"
        title={revoked ? 'Document revoked' : 'Document issued'}
        description={revoked ? 'Anyone who scans the QR code will see that it is no longer valid.' : 'Your PDF has been created and registered. Anyone can check it at the link below.'}
      />

      {revoked ? (
        <Alert tone="error" title="Document revoked">
          This document has been revoked. Anyone who scans its QR code will see that it is no longer valid.
        </Alert>
      ) : (
        <Alert tone="success" title="Document issued">
          Your PDF has been created and registered. Anyone can check it at the verification link below.
        </Alert>
      )}

      <Card className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="text-sm font-semibold text-ink">Verification link (in the PDF QR code)</p>
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
                  setDownloadLimitError(
                    `Free plan allows ${res.limit} downloads. Payment is required for more.`,
                  )
                  return
                }
                setDownloadLimitError(null)
                void actions.download()
              }}
            >
              Download PDF
            </Button>
            <Button variant="secondary" icon={<Printer size={16} aria-hidden />} onClick={actions.print}>
              Print
            </Button>
          </div>
        ) : (
          remoteErr && <Alert tone="warn">{remoteErr}</Alert>
        )}
        <ShareButtons link={link} />
        {downloadLimitError && (
          <Alert tone="warn" title="Download limit">
            {downloadLimitError}{' '}
            <Link to="/onboarding" className="font-medium text-brand-ink hover:underline">
              View plans
            </Link>
          </Alert>
        )}
        {!downloadGate.ok && !downloadLimitError && (
          <Alert tone="warn" title="Free download limit reached">
            This plan includes {downloadGate.limit} downloads. Payment is required to download more files.
          </Alert>
        )}
        {actions.error && (
          <Alert tone="error" title="Action failed">
            {actions.error}
          </Alert>
        )}
        <Link to={`/v/${verificationId}`} className="inline-block text-sm font-medium text-brand-ink hover:underline">
          Open the public verification page
        </Link>
      </Card>

      {isOwner && !revoked && (
        <Card className="space-y-3 border-danger/30 p-4 sm:p-5">
          <h2 className="font-semibold text-danger">Revoke this document</h2>
          <p className="text-sm text-ink-2">
            Revoking marks the document as no longer valid. Anyone who scans the QR code will see “Revoked”. This cannot be undone.
          </p>
          {revokeError != null && <ErrorAlert title="Could not revoke" error={revokeError} onRetry={() => void revoke()} />}
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Revoke…
          </Button>
          <ConfirmDialog
            open={confirming}
            title="Revoke this document?"
            confirmLabel="Yes, revoke it"
            confirmVariant="danger"
            busy={revoking}
            onConfirm={() => void revoke()}
            onCancel={() => {
              setConfirming(false)
              setRevokeError(null)
            }}
          >
            Anyone who scans the QR code will see that it is no longer valid. This cannot be undone.
          </ConfirmDialog>
        </Card>
      )}

      {pdfUrl && (
        <Card className="overflow-hidden p-2">
          <iframe title="Issued PDF" src={pdfUrl} className="doc-paper h-[70vh] w-full rounded-xl" />
        </Card>
      )}
      <Link to="/documents" className={buttonClass('ghost', 'sm')}>
        Back to my documents
      </Link>
    </div>
  )
}
