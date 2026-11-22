import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorAlert } from '../components/common/Alert'
import { buttonClass } from '../components/common/Button'
import { LoadingState } from '../components/common/LoadingState'
import { PageHeader } from '../components/common/ui'
import { DocumentListenPanel } from '../components/documents/DocumentListenPanel'
import { IssuePanel } from '../components/documents/IssuePanel'
import { SideBySide } from '../components/documents/SideBySide'
import type { ReaderSide } from '../hooks/useDocumentReader'
import { checkTranslated } from '../lib/draft'
import { useLocale } from '../context/LocaleContext'
import { api } from '../services/api'
import type { Block, DocumentRecord } from '../types'

export default function TranslatorReviewPage() {
  const { id = '' } = useParams()
  const { t } = useLocale()
  const [doc, setDoc] = useState<DocumentRecord | null>(null)
  const [translated, setTranslated] = useState<Block[]>([])
  const [error, setError] = useState<unknown>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [listenIndex, setListenIndex] = useState<number | null>(null)
  const [listenSide, setListenSide] = useState<ReaderSide>('original')

  const load = useCallback(async () => {
    setError(null)
    setDoc(null)
    try {
      const d = await api.getDocument(id)
      if (!d.blocksOriginal || !d.blocksTranslated) {
        throw new Error(t('flow.noStoredText'))
      }
      const problem = checkTranslated(d.blocksOriginal, d.blocksTranslated)
      if (problem) throw new Error(problem)
      setDoc(d)
      setTranslated(d.blocksTranslated)
      api.getSourceFileUrl(d).then(setFileUrl).catch(() => setFileUrl(null))
    } catch (e) {
      setError(e)
    }
  }, [id, t])

  useEffect(() => {
    void load()
  }, [load])

  if (error != null) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <ErrorAlert title={t('flow.transOpenFail')} error={error} onRetry={() => void load()}>
          <Link to="/translator" className={buttonClass('secondary', 'sm')}>
            {t('flow.backQueue')}
          </Link>
        </ErrorAlert>
      </div>
    )
  }
  if (!doc || !doc.blocksOriginal) return <LoadingState label={t('flow.loadingReview')} />

  return (
    <div className="space-y-5">
      <Link to="/translator" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft size={16} aria-hidden /> {t('flow.backQueueLong')}
      </Link>
      <PageHeader
        eyebrow={t('flow.reviewEyebrow')}
        title={t('flow.transTitle')}
        description={t('flow.reviewDesc', { from: t(`langs.${doc.sourceLang}`), to: t(`langs.${doc.targetLang}`) })}
        aside={
          fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-ink hover:underline">
              {t('flow.openOriginalFile')}
            </a>
          ) : null
        }
      />
      <DocumentListenPanel
        documentId={doc.id}
        original={doc.blocksOriginal}
        translated={translated}
        sourceLang={doc.sourceLang}
        targetLang={doc.targetLang}
        onHighlight={(i, side) => {
          setListenIndex(i)
          setListenSide(side)
        }}
      />
      <SideBySide
        original={doc.blocksOriginal}
        translated={translated}
        onEdit={(i, text) => setTranslated((prev) => prev.map((b, j) => (j === i ? { ...b, text } : b)))}
        originalLabel={t(`langs.${doc.sourceLang}`)}
        translatedLabel={t(`langs.${doc.targetLang}`)}
        preview
        highlightIndex={listenIndex}
        highlightSide={listenSide}
      />
      <IssuePanel
        doc={doc}
        blocks={translated}
        reviewStatus="human_reviewed"
        title={t('flow.issueNow')}
        submitLabel={t('flow.issuePdf')}
        nameLabel={t('flow.issuerName')}
        intro={t('flow.sendReviewBody')}
        confirmText={t('flow.issueConfirm')}
      />
    </div>
  )
}
