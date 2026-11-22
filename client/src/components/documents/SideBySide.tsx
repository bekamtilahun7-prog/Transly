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
}: {
  original: Block[]
  translated: Block[]
  onEdit?: (index: number, text: string) => void
  originalLabel: string
  translatedLabel: string
  /** Show the PREVIEW watermark (document not issued yet). */
  preview?: boolean
  readOnly?: boolean
}) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-3 sm:p-5 ${preview ? 'preview-watermark' : ''}`}>
      <div className="mb-3 hidden grid-cols-2 gap-5 text-xs font-semibold uppercase tracking-wide text-ink-2 md:grid">
        <span>Original · {originalLabel}</span>
        <span>
          Translation · {translatedLabel}
          {!readOnly && <span className="font-normal normal-case tracking-normal"> (editable)</span>}
        </span>
      </div>
      <ol className="space-y-4">
        {original.map((o, i) => (
          <li key={o.id} className="grid gap-2 md:grid-cols-2 md:gap-5">
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted md:hidden">
                Original · {originalLabel} · {BLOCK_TYPE_LABEL[o.type]}
              </p>
              <TextBlockEditor block={o} readOnly label={`Original block ${i + 1}, ${BLOCK_TYPE_LABEL[o.type]}`} />
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted md:hidden">Translation · {translatedLabel}</p>
              {translated[i] && (
                <TextBlockEditor
                  block={translated[i]}
                  readOnly={readOnly}
                  onChange={(t) => onEdit?.(i, t)}
                  label={`Translated block ${i + 1}, ${BLOCK_TYPE_LABEL[o.type]}`}
                />
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
