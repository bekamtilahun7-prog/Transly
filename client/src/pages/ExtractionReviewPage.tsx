import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, ErrorAlert } from '../components/common/Alert'
import { Button, buttonClass } from '../components/common/Button'
import { LoadingState } from '../components/common/LoadingState'
import { Card, PageHeader } from '../components/common/ui'
import { DocumentPreview } from '../components/documents/DocumentPreview'
import { BlockCaption, TextBlockEditor, hasUnclear } from '../components/documents/TextBlockEditor'
import { docTypeLabel, langLabel } from '../lib/constants'
import { loadDraft, saveDraft } from '../lib/draft'
import { fileNameOf } from '../lib/format'
import { api } from '../services/api'
import type { Block, DocumentRecord, ExtractResponse } from '../types'

type Phase = 'loading' | 'extracting' | 'ready' | 'error'

export default function ExtractionReviewPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [doc, setDoc] = useState<DocumentRecord | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState<unknown>(null)
  const [detected, setDetected] = useState<ExtractResponse | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)

  const run = useCallback(async () => {
    setPhase('loading')
    setError(null)
    try {
      const d = await api.getDocument(id)
      setDoc(d)
      api.getSourceFileUrl(d).then(setFileUrl).catch(() => setFileUrl(null))
      const draft = loadDraft(id)
      const existing = draft.original ?? d.blocksOriginal
      if (existing && existing.length) {
        setBlocks(existing)
        setPhase('ready')
        return
      }
      setPhase('extracting')
      const res = await api.extract(id, d.sourceLang)
      if (!Array.isArray(res.blocks) || res.blocks.length === 0) {
        throw new Error('No text could be found in this document. Try a sharper photo or a different file.')
      }
      setDetected(res)
      setBlocks(res.blocks)
      saveDraft(id, { original: res.blocks })
      setPhase('ready')
    } catch (e) {
      setError(e)
      setPhase('error')
    }
  }, [id])

  useEffect(() => {
    void run()
  }, [run])

  function edit(i: number, text: string) {
    setBlocks((prev) => {
      const next = prev.map((b, j) => (j === i ? { ...b, text } : b))
      saveDraft(id, { original: next })
      return next
    })
  }

  const unclearCount = blocks.filter((b) => hasUnclear(b.text)).length

  if (phase === 'loading') return <LoadingState label="Loading document…" />
  if (phase === 'extracting') return <LoadingState label="Reading the text in your document… this can take up to a minute." />
  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <ErrorAlert title="Could not read the document" error={error} onRetry={() => void run()}>
          <Link to="/documents/upload" className={buttonClass('secondary', 'sm')}>
            Upload a different file
          </Link>
        </ErrorAlert>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Link to="/documents" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft size={16} aria-hidden /> Back to My Documents
      </Link>
      <PageHeader
        eyebrow="Extraction"
        title="Extraction Review"
        description="Review and correct the extracted text. Translation does not start until you click Continue."
        aside={
          doc && (
            <p className="text-sm text-ink-2">
              {fileNameOf(doc)} · {langLabel(doc.sourceLang)} → {langLabel(doc.targetLang)} · {docTypeLabel(doc.docType)}
            </p>
          )
        }
      />

      {detected && doc && detected.detectedLanguage !== doc.sourceLang && (
        <Alert tone="warn" title="Language mismatch">
          You chose {langLabel(doc.sourceLang)}, but the document looks like {langLabel(detected.detectedLanguage)}.
        </Alert>
      )}
      {unclearCount > 0 ? (
        <Alert tone="warn" title={`${unclearCount} unclear ${unclearCount === 1 ? 'part' : 'parts'}`}>
          Text marked [unclear] could not be read confidently. Type the correct text, or leave the marker.
        </Alert>
      ) : (
        <Alert tone="success">No unclear parts were marked. Please still read it carefully.</Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <DocumentPreview url={fileUrl} fileName={doc ? fileNameOf(doc) : 'document'} />
        </Card>
        <Card className="p-4 sm:p-5">
          <p className="mb-3 font-semibold text-ink">Extracted Text</p>
          <ol className="space-y-3">
            {blocks.map((b, i) => (
              <li key={b.id}>
                <BlockCaption index={i} block={b} />
                <TextBlockEditor block={b} onChange={(t) => edit(i, t)} />
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/documents" className={buttonClass('secondary')}>
          Previous
        </Link>
        <Button
          icon={<ArrowRight size={16} />}
          onClick={() => {
            saveDraft(id, { original: blocks })
            nav(`/documents/${id}/translation`)
          }}
        >
          Continue to Translation
        </Button>
      </div>
    </div>
  )
}
