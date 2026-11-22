import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorAlert } from '../components/common/Alert'
import { Button, buttonClass } from '../components/common/Button'
import { LoadingState } from '../components/common/LoadingState'
import { Card, PageHeader } from '../components/common/ui'
import { IssuePanel } from '../components/documents/IssuePanel'
import { SideBySide } from '../components/documents/SideBySide'
import { checkTranslated, loadDraft, sameBlocks, saveDraft } from '../lib/draft'
import { langLabel } from '../lib/constants'
import { api } from '../services/api'
import type { Block, DocumentRecord } from '../types'

type Phase = 'loading' | 'translating' | 'ready' | 'error'

export default function TranslationPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [doc, setDoc] = useState<DocumentRecord | null>(null)
  const [original, setOriginal] = useState<Block[]>([])
  const [translated, setTranslated] = useState<Block[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState<unknown>(null)
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewError, setReviewError] = useState<unknown>(null)

  const translateNow = useCallback(
    async (d: DocumentRecord, src: Block[]) => {
      setPhase('translating')
      setError(null)
      try {
        const res = await api.translate({
          documentId: id,
          sourceLanguage: d.sourceLang,
          targetLanguage: d.targetLang,
          blocks: src,
        })
        const problem = checkTranslated(src, res.blocks)
        if (problem) throw new Error(problem)
        setTranslated(res.blocks)
        saveDraft(id, { translated: res.blocks, translatedSource: src })
        setPhase('ready')
      } catch (e) {
        setError(e)
        setPhase('error')
      }
    },
    [id],
  )

  const init = useCallback(async () => {
    setPhase('loading')
    setError(null)
    try {
      const d = await api.getDocument(id)
      setDoc(d)
      const draft = loadDraft(id)
      const src = draft.original ?? d.blocksOriginal
      if (!src || src.length === 0) {
        nav(`/documents/${id}/review`, { replace: true })
        return
      }
      setOriginal(src)
      if (draft.translated && sameBlocks(draft.translatedSource, src)) {
        setTranslated(draft.translated)
        setPhase('ready')
      } else if (!draft.original && d.blocksTranslated && !checkTranslated(src, d.blocksTranslated)) {
        setTranslated(d.blocksTranslated)
        setPhase('ready')
      } else {
        await translateNow(d, src)
      }
    } catch (e) {
      setError(e)
      setPhase('error')
    }
  }, [id, nav, translateNow])

  useEffect(() => {
    void init()
  }, [init])

  async function sendForReview() {
    setReviewBusy(true)
    setReviewError(null)
    try {
      await api.saveTranslatedBlocks(id, translated)
      await api.requestHumanReview(id)
      nav('/documents')
    } catch (e) {
      setReviewError(e)
      setReviewBusy(false)
    }
  }

  if (phase === 'loading') return <LoadingState label="Loading…" />
  if (phase === 'translating') return <LoadingState label="Translating… this can take up to a minute." />
  if (phase === 'error' || !doc) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <ErrorAlert title="Translation failed" error={error} onRetry={() => void init()}>
          <Link to={`/documents/${id}/review`} className={buttonClass('secondary', 'sm')}>
            Back to extraction
          </Link>
        </ErrorAlert>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Translation"
        title="Review translation"
        description={`${langLabel(doc.sourceLang)} → ${langLabel(doc.targetLang)}. The PREVIEW mark stays until the document is issued.`}
      />
      <SideBySide
        original={original}
        translated={translated}
        onEdit={(i, text) =>
          setTranslated((prev) => {
            const next = prev.map((b, j) => (j === i ? { ...b, text } : b))
            saveDraft(id, { translated: next })
            return next
          })
        }
        originalLabel={langLabel(doc.sourceLang)}
        translatedLabel={langLabel(doc.targetLang)}
        preview
      />
      <IssuePanel
        doc={doc}
        blocks={translated}
        reviewStatus="machine"
        title="Issue now (machine translated)"
        submitLabel="Issue PDF with QR code"
        intro="The PDF will say “Machine translated, not human reviewed”."
        confirmText="This will create an issued PDF labelled as machine translated, not human reviewed."
      />
      <Card className="p-4 sm:p-5">
        <h2 className="font-semibold text-ink">Send for human review</h2>
        <p className="mt-1 text-sm text-ink-2">
          A translator checks the translation saved on the server, then issues the PDF with their name.
        </p>
        {reviewError != null && (
          <div className="mt-3">
            <ErrorAlert title="Could not send for review" error={reviewError} onRetry={() => void sendForReview()} />
          </div>
        )}
        <Button className="mt-4" variant="secondary" loading={reviewBusy} onClick={() => void sendForReview()}>
          Send to human translator
        </Button>
      </Card>
    </div>
  )
}
