import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { IssueError, issueDocument, rememberIssued, type IssueStage } from '../../lib/issue'
import type { Block, DocumentRecord, ReviewStatus } from '../../types'
import { Alert, ErrorAlert } from '../common/Alert'
import { Button } from '../common/Button'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { Field, inputClass } from '../common/Input'
import { Card } from '../common/ui'

const STAGE_TEXT: Record<IssueStage, string> = {
  reserve: 'Step 1 of 3: reserving the verification ID…',
  build: 'Step 2 of 3: creating the A4 PDF with its QR code…',
  complete: 'Step 3 of 3: saving the issued PDF…',
}
const STAGE_NAME: Record<IssueStage, string> = {
  reserve: 'reserving the verification ID',
  build: 'creating the PDF',
  complete: 'saving the issued PDF',
}

export function IssuePanel({
  doc,
  blocks,
  reviewStatus,
  title,
  submitLabel,
  nameLabel = 'Issuer name',
  intro,
  confirmText,
}: {
  doc: DocumentRecord
  blocks: Block[]
  reviewStatus: ReviewStatus
  title: string
  submitLabel: string
  nameLabel?: string
  intro?: string
  confirmText: string
}) {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [stage, setStage] = useState<IssueStage | null>(null)
  const [error, setError] = useState<IssueError | Error | null>(null)
  const [resumeId, setResumeId] = useState<string | undefined>()
  const [confirming, setConfirming] = useState(false)
  const busy = stage !== null

  async function run() {
    setConfirming(false)
    setError(null)
    try {
      const res = await issueDocument(
        {
          documentId: doc.id,
          blocks,
          sourceLang: doc.sourceLang,
          targetLang: doc.targetLang,
          docType: doc.docType,
          issuerName: name.trim(),
          issuerPhone: phone.trim() || undefined,
          reviewStatus,
          isPublic,
          resumeVerificationId: resumeId,
        },
        setStage,
      )
      rememberIssued(res.verificationId, res.pdf, doc.id)
      nav(`/documents/issued/${res.verificationId}`, { state: { sha256: res.sha256, isPublic } })
    } catch (err) {
      if (err instanceof IssueError) setResumeId(err.verificationId)
      setError(err instanceof Error ? err : new Error(String(err)))
      setStage(null)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setConfirming(true)
  }

  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {intro && <p className="mt-1 text-sm text-ink-2">{intro}</p>}
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={nameLabel}>
            <input className={inputClass} required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" disabled={busy} />
          </Field>
          <Field label="Issuer phone (optional)" hint="Printed on the PDF.">
            <input
              className={inputClass}
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              disabled={busy}
            />
          </Field>
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-line bg-bg-2 p-3 text-sm">
          <input type="checkbox" className="mt-1 size-4 accent-orange-500" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} disabled={busy} />
          <span>
            <span className="font-medium text-ink">Make the PDF public</span>
            <span className="mt-0.5 block text-ink-2">
              If checked, anyone who scans the QR code can open the PDF. If not, they only see that it is valid, who issued it, and when.
            </span>
          </span>
        </label>
        {error && (
          <ErrorAlert
            title={error instanceof IssueError ? `Failed: ${STAGE_NAME[error.stage]}` : 'Issuance failed'}
            error={error instanceof IssueError ? (error.cause ?? error) : error}
            onRetry={() => void run()}
          />
        )}
        {busy && stage && <Alert tone="info">{STAGE_TEXT[stage]}</Alert>}
        <Button type="submit" className="w-full" loading={busy} disabled={!name.trim()}>
          {submitLabel}
        </Button>
      </form>
      <ConfirmDialog
        open={confirming}
        title="Issue this document?"
        confirmLabel={submitLabel}
        busy={busy}
        onConfirm={() => void run()}
        onCancel={() => setConfirming(false)}
      >
        {confirmText}
      </ConfirmDialog>
    </Card>
  )
}
