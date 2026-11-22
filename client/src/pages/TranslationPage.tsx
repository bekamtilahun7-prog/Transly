import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorAlert } from '../components/common/Alert'
import { Button, buttonClass } from '../components/common/Button'
import { LoadingState } from '../components/common/LoadingState'
import { Card, PageHeader } from '../components/common/ui'
import { DocumentListenPanel } from '../components/documents/DocumentListenPanel'
import { IssuePanel } from '../components/documents/IssuePanel'
import { SideBySide } from '../components/documents/SideBySide'
import type { ReaderSide } from '../hooks/useDocumentReader'
import { checkTranslated, loadDraft, sameBlocks, saveDraft } from '../lib/draft'
import { useLocale } from '../context/LocaleContext'
import { api } from '../services/api'
import type { Block, DocumentRecord } from '../types'

type Phase = 'loading' | 'translating' | 'ready' | 'error'

export default function TranslationPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { t } = useLocale()
  const [doc, setDoc] = useState<DocumentRecord | null>(null)
  const [original, setOriginal] = useState<Block[]>([])
  const [translated, setTranslated] = useState<Block[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState<unknown>(null)
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewError, setReviewError] = useState<unknown>(null)
  const [listenIndex, setListenIndex] = useState<number | null>(null)
  const [listenSide, setListenSide] = useState<ReaderSide>('original')

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

  if (phase === 'loading') return <LoadingState label={t('flow.transLoading')} />
  if (phase === 'translating') return <LoadingState label={t('flow.transBusy')} />
  if (phase === 'error' || !doc) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <ErrorAlert title={t('flow.transFail')} error={error} onRetry={() => void init()}>
          <Link to={`/documents/${id}/review`} className={buttonClass('secondary', 'sm')}>
            {t('flow.backExtract')}
          </Link>
        </ErrorAlert>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('flow.transEyebrow')}
        title={t('flow.transTitle')}
        description={t('flow.transDesc', { from: t(`langs.${doc.sourceLang}`), to: t(`langs.${doc.targetLang}`) })}
      />
      <DocumentListenPanel
        documentId={id}
        original={original}
        translated={translated}
        sourceLang={doc.sourceLang}
        targetLang={doc.targetLang}
        onHighlight={(i, side) => {
          setListenIndex(i)
          setListenSide(side)
        }}
      />
      <SideBySide
        original={original}
        translated={translated}
        highlightIndex={listenIndex}
        highlightSide={listenSide}
        onEdit={(i, text) =>
          setTranslated((prev) => {
            const next = prev.map((b, j) => (j === i ? { ...b, text } : b))
            saveDraft(id, { translated: next })
            return next
          })
        }
        originalLabel={t(`langs.${doc.sourceLang}`)}
        translatedLabel={t(`langs.${doc.targetLang}`)}
        preview
      />
      <IssuePanel
        doc={doc}
        blocks={translated}
        reviewStatus="machine"
        title={t('flow.issueNow')}
        submitLabel={t('flow.issuePdf')}
        intro={t('flow.issueIntro')}
        confirmText={t('flow.issueConfirm')}
      />
      <Card className="p-4 sm:p-5">
        <h2 className="font-semibold text-ink">{t('flow.sendReview')}</h2>
        <p className="mt-1 text-sm text-ink-2">{t('flow.sendReviewBody')}</p>
        {reviewError != null && (
          <div className="mt-3">
            <ErrorAlert title={t('flow.sendFail')} error={reviewError} onRetry={() => void sendForReview()} />
          </div>
        )}
        <Button className="mt-4" variant="secondary" loading={reviewBusy} onClick={() => void sendForReview()}>
          {t('flow.sendTranslator')}
        </Button>
      </Card>
    </div>
  )
}
