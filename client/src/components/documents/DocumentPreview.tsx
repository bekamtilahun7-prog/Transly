import { ExternalLink, FileText, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { useLocale } from '../../context/LocaleContext'
import { fileKindOf, type FileKindGuess } from '../../lib/format'

const ZOOMS = [50, 75, 100, 125, 150, 200]

/**
 * The uploaded source file. Always a white page with its own colours, in either theme.
 * `url` is null when no preview can be shown (e.g. the mock backend after a reload).
 */
export function DocumentPreview({
  url,
  fileName,
  kind,
  className = '',
}: {
  url: string | null
  fileName: string
  /** Pass when the type is known; otherwise it is guessed from the file name. */
  kind?: FileKindGuess
  className?: string
}) {
  const { t } = useLocale()
  const k = kind ?? fileKindOf(fileName)
  const [zoom, setZoom] = useState(100)
  const idx = ZOOMS.indexOf(zoom)

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="flex min-w-0 items-center gap-2 font-semibold text-ink">
          <FileText size={18} className="shrink-0 text-brand-ink" aria-hidden />
          <span className="truncate">{t('flow.previewTitle')}</span>
        </p>
        <div className="flex items-center gap-2">
          {url && k === 'image' && (
            <div className="flex items-center rounded-full border border-line bg-surface text-ink">
              <button
                type="button"
                aria-label={t('flow.zoomOut')}
                disabled={idx <= 0}
                onClick={() => setZoom(ZOOMS[idx - 1])}
                className="flex size-9 items-center justify-center rounded-full hover:bg-hover disabled:opacity-40"
              >
                <Minus size={16} aria-hidden />
              </button>
              <span className="w-12 text-center text-xs tabular-nums" aria-live="polite">
                {zoom}%
              </span>
              <button
                type="button"
                aria-label={t('flow.zoomIn')}
                disabled={idx >= ZOOMS.length - 1}
                onClick={() => setZoom(ZOOMS[idx + 1])}
                className="flex size-9 items-center justify-center rounded-full hover:bg-hover disabled:opacity-40"
              >
                <Plus size={16} aria-hidden />
              </button>
            </div>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              aria-label={t('flow.openTab')}
              title={t('flow.openTab')}
              className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink hover:bg-hover"
            >
              <ExternalLink size={16} aria-hidden />
            </a>
          )}
        </div>
      </div>

      <div className="min-h-72 flex-1 overflow-auto rounded-b-2xl border-t border-line bg-bg-2 p-3">
        {!url ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 px-4 text-center text-ink-2">
            <FileText size={28} aria-hidden />
            <p className="text-sm font-medium text-ink">{t('flow.previewFail')}</p>
            <p className="max-w-xs text-xs">{t('flow.previewFailBody')}</p>
          </div>
        ) : k === 'image' ? (
          <img
            src={url}
            alt={t('flow.origFile', { name: fileName })}
            className="doc-paper mx-auto block max-w-none rounded shadow-md"
            style={{ width: `${zoom}%` }}
          />
        ) : (
          <iframe title={t('flow.origFile', { name: fileName })} src={url} className="doc-paper h-[60vh] min-h-96 w-full rounded shadow-md lg:h-full" />
        )}
      </div>
    </div>
  )
}
