import { useLocale } from '../../context/LocaleContext'
import { BLOCK_TYPE_LABEL } from '../../lib/constants'
import type { Block } from '../../types'
import { TextBlockEditor } from './TextBlockEditor'

/** Original (read-only) next to the translation. Two columns on wide screens, stacked on phones. */
export function SideBySide({
  original,
  translated,
  onEdit,
  originalLabel,
  translatedLabel,
  preview = false,
  readOnly = false,
  highlightIndex = null,
  highlightSide = null,
}: {
  original: Block[]
  translated: Block[]
  onEdit?: (index: number, text: string) => void
  originalLabel: string
  translatedLabel: string
  /** Show the PREVIEW watermark (document not issued yet). */
  preview?: boolean
  readOnly?: boolean
  highlightIndex?: number | null
  highlightSide?: 'original' | 'translated' | null
}) {
  const { t } = useLocale()
  return (
    <div className={`rounded-2xl border border-line bg-surface p-3 sm:p-5 ${preview ? 'preview-watermark' : ''}`}>
      <div className="mb-3 hidden grid-cols-2 gap-5 text-xs font-semibold uppercase tracking-wide text-ink-2 md:grid">
        <span>
          {t('ui.original')} · {originalLabel}
        </span>
        <span>
          {t('ui.translation')} · {translatedLabel}
          {!readOnly && <span className="font-normal normal-case tracking-normal"> {t('ui.editable')}</span>}
        </span>
      </div>
      <ol className="space-y-4">
        {original.map((o, i) => (
          <li key={o.id} className="grid gap-2 md:grid-cols-2 md:gap-5">
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted md:hidden">
                {t('ui.original')} · {originalLabel} · {BLOCK_TYPE_LABEL[o.type]}
              </p>
              <TextBlockEditor
                block={o}
                readOnly
                index={highlightSide === 'original' ? i : undefined}
                highlighted={highlightSide === 'original' && highlightIndex === i}
                label={t('flow.origBlock', { n: i + 1, type: BLOCK_TYPE_LABEL[o.type] })}
              />
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted md:hidden">
                {t('ui.translation')} · {translatedLabel}
              </p>
              {translated[i] && (
                <TextBlockEditor
                  block={translated[i]}
                  readOnly={readOnly}
                  onChange={(t) => onEdit?.(i, t)}
                  index={highlightSide === 'translated' ? i : undefined}
                  highlighted={highlightSide === 'translated' && highlightIndex === i}
                  label={t('flow.transBlock', { n: i + 1, type: BLOCK_TYPE_LABEL[o.type] })}
                />
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
