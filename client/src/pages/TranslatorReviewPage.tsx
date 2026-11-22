import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorAlert } from '../components/common/Alert'
import { buttonClass } from '../components/common/Button'
import { LoadingState } from '../components/common/LoadingState'
import { PageHeader } from '../components/common/ui'
import { IssuePanel } from '../components/documents/IssuePanel'
import { SideBySide } from '../components/documents/SideBySide'
import { checkTranslated } from '../lib/draft'
import { langLabel } from '../lib/constants'
import { api } from '../services/api'
import type { Block, DocumentRecord } from '../types'

export default function TranslatorReviewPage() {
  const { id = '' } = useParams()
  const [doc, setDoc] = useState<DocumentRecord | null>(null)
  const [translated, setTranslated] = useState<Block[]>([])
  const [error, setError] = useState<unknown>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setDoc(null)
    try {
      const d = await api.getDocument(id)
      if (!d.blocksOriginal || !d.blocksTranslated) {
        throw new Error('This document has no extracted or translated text stored yet.')
      }
      const problem = checkTranslated(d.blocksOriginal, d.blocksTranslated)
      if (problem) throw new Error(problem)
      setDoc(d)
      setTranslated(d.blocksTranslated)
      api.getSourceFileUrl(d).then(setFileUrl).catch(() => setFileUrl(null))
    } catch (e) {
      setError(e)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (error != null) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <ErrorAlert title="Could not open this document" error={error} onRetry={() => void load()}>
          <Link to="/translator" className={buttonClass('secondary', 'sm')}>
            Back to the queue
          </Link>
        </ErrorAlert>
      </div>
    )
  }
  if (!doc || !doc.blocksOriginal) return <LoadingState label="Loading review…" />

  return (
    <div className="space-y-5">
      <Link to="/translator" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft size={16} aria-hidden /> Back to review queue
      </Link>
      <PageHeader
        eyebrow="Translator"
        title="Review translation"
        description={`${langLabel(doc.sourceLang)} → ${langLabel(doc.targetLang)}. Edit if needed, then approve and issue.`}
        aside={
          fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-ink hover:underline">
              Open original file
            </a>
          ) : null
        }
      />
      <SideBySide
        original={doc.blocksOriginal}
        translated={translated}
        onEdit={(i, text) => setTranslated((prev) => prev.map((b, j) => (j === i ? { ...b, text } : b)))}
        originalLabel={langLabel(doc.sourceLang)}
        translatedLabel={langLabel(doc.targetLang)}
        preview
      />
      <IssuePanel
        doc={doc}
        blocks={translated}
        reviewStatus="human_reviewed"
        title="Approve and issue"
        submitLabel="Approve and issue"
        nameLabel="Issuer name (your name, printed as the reviewer)"
        intro="By approving, the PDF will say it was human reviewed by the name below."
        confirmText="This will create an issued PDF labelled as human reviewed, with your name as the issuer."
      />
    </div>
  )
}
