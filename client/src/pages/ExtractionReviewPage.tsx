import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, ErrorAlert } from '../components/common/Alert'
import { Button, buttonClass } from '../components/common/Button'
import { LoadingState } from '../components/common/LoadingState'
import { Card, PageHeader } from '../components/common/ui'
import { DocumentListenPanel } from '../components/documents/DocumentListenPanel'
import { DocumentPreview } from '../components/documents/DocumentPreview'
import { BlockCaption, TextBlockEditor, hasUnclear } from '../components/documents/TextBlockEditor'
import { useLocale } from '../context/LocaleContext'
import { loadDraft, saveDraft } from '../lib/draft'
import { fileNameOf } from '../lib/format'
import { api } from '../services/api'
import type { Block, DocumentRecord, ExtractResponse } from '../types'

type Phase = 'loading' | 'extracting' | 'ready' | 'error'

export default function ExtractionReviewPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { t } = useLocale()
  const [doc, setDoc] = useState<DocumentRecord | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState<unknown>(null)
  const [detected, setDetected] = useState<ExtractResponse | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [listenIndex, setListenIndex] = useState<number | null>(null)

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
        throw new Error(t('flow.extractEmpty'))
      }
      setDetected(res)
      setBlocks(res.blocks)
      saveDraft(id, { original: res.blocks })
      setPhase('ready')
    } catch (e) {
      setError(e)
      setPhase('error')
    }
  }, [id, t])

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

  if (phase === 'loading') return <LoadingState label={t('flow.extractLoading')} />
  if (phase === 'extracting') return <LoadingState label={t('flow.extractBusy')} />
  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <ErrorAlert title={t('flow.extractFail')} error={error} onRetry={() => void run()}>
          <Link to="/documents/upload" className={buttonClass('secondary', 'sm')}>
            {t('flow.extractOther')}
          </Link>
        </ErrorAlert>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Link to="/documents" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft size={16} aria-hidden /> {t('flow.backDocs')}
      </Link>
      <PageHeader
        eyebrow={t('flow.extractEyebrow')}
        title={t('flow.extractTitle')}
        description={t('flow.extractDesc')}
        aside={
          doc && (
            <p className="text-sm text-ink-2">
              {fileNameOf(doc)} · {t(`langs.${doc.sourceLang}`)} → {t(`langs.${doc.targetLang}`)} · {t(`types.${doc.docType}`)}
            </p>
          )
        }
      />

      {detected && doc && detected.detectedLanguage !== doc.sourceLang && (
        <Alert tone="warn" title={t('flow.mismatch')}>
          {t('flow.mismatchBody', {
            chosen: t(`langs.${doc.sourceLang}`),
            detected: t(`langs.${detected.detectedLanguage}`),
          })}
        </Alert>
      )}
      {unclearCount > 0 ? (
        <Alert tone="warn" title={unclearCount === 1 ? t('flow.unclearOne') : t('flow.unclearMany', { n: unclearCount })}>
          {t('flow.unclearBody')}
        </Alert>
      ) : (
        <Alert tone="success">{t('flow.unclearNone')}</Alert>
      )}

      {doc && (
        <DocumentListenPanel
          documentId={doc.id}
          original={blocks}
          sourceLang={doc.sourceLang}
          targetLang={doc.targetLang}
          onHighlight={(i) => setListenIndex(i)}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <DocumentPreview url={fileUrl} fileName={doc ? fileNameOf(doc) : 'document'} />
        </Card>
        <Card className="p-4 sm:p-5">
          <p className="mb-3 font-semibold text-ink">{t('flow.extractedText')}</p>
          <ol className="space-y-3">
            {blocks.map((b, i) => (
              <li key={b.id}>
                <BlockCaption index={i} block={b} />
                <TextBlockEditor block={b} onChange={(t) => edit(i, t)} index={i} highlighted={listenIndex === i} />
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/documents" className={buttonClass('secondary')}>
          {t('flow.previous')}
        </Link>
        <Button
          icon={<ArrowRight size={16} />}
          onClick={() => {
            saveDraft(id, { original: blocks })
            nav(`/documents/${id}/translation`)
          }}
        >
          {t('flow.continueTrans')}
        </Button>
      </div>
    </div>
  )
}
