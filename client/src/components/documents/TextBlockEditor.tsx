import { BLOCK_TYPE_LABEL, NON_TEXT_PLACEHOLDER, NON_TEXT_TYPES } from '../../lib/constants'
import type { Block } from '../../types'

export const UNCLEAR = '[unclear]'
export const hasUnclear = (t: string) => t.toLowerCase().includes(UNCLEAR)

/** Stamps, signatures and logos are never typed or translated: they become a placeholder line. */
export function isNonText(b: Block) {
  return NON_TEXT_TYPES.includes(b.type) && b.type !== 'handwriting'
}

/** Text with every "[unclear]" marked. Used as the highlight layer under the textarea. */
function Highlighted({ text }: { text: string }) {
  const parts = text.split(/(\[unclear\])/gi)
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === UNCLEAR ? (
          <mark key={i} className="rounded-sm bg-amber-300 text-transparent dark:bg-amber-500/60">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

// The mirror and the textarea must wrap identically, so they share every text-affecting class.
const textLayout = 'col-start-1 row-start-1 px-3 py-2.5 text-[15px]/6 whitespace-pre-wrap [overflow-wrap:anywhere]'

/**
 * One block of a document: an auto-growing text box with "[unclear]" highlighted in place.
 * The same component is used for extraction review, translation and translator review.
 */
export function TextBlockEditor({
  block,
  onChange,
  readOnly = false,
  label,
}: {
  block: Block
  onChange?: (text: string) => void
  readOnly?: boolean
  label?: string
}) {
  if (isNonText(block)) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong bg-bg-2 px-3 py-2.5 text-sm italic text-ink-2">
        {NON_TEXT_PLACEHOLDER[block.type]}
      </div>
    )
  }
  const unclear = hasUnclear(block.text)
  const frame = unclear
    ? 'border-warn bg-warn-bg/40 focus-within:ring-warn/40'
    : readOnly
      ? 'border-line bg-bg-2/60 focus-within:ring-ring/40'
      : 'border-input-line bg-input focus-within:border-focus focus-within:ring-ring/60'
  const weight = block.type === 'heading' ? 'font-semibold' : ''
  return (
    <div>
      <div className={`grid rounded-xl border transition duration-150 focus-within:ring-2 ${frame}`}>
        {/* Mirror: sizes the box to its content and paints the [unclear] highlight behind the text. */}
        <div aria-hidden className={`${textLayout} ${weight} pointer-events-none text-transparent`}>
          <Highlighted text={block.text} />
          {'\u200b'}
        </div>
        <textarea
          aria-label={label ?? BLOCK_TYPE_LABEL[block.type]}
          className={`${textLayout} ${weight} min-h-11 resize-none overflow-hidden bg-transparent text-ink placeholder:text-muted focus:outline-none ${readOnly ? 'text-ink-2' : ''}`}
          value={block.text}
          readOnly={readOnly}
          rows={1}
          spellCheck={false}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </div>
      {unclear && !readOnly && (
        <p className="mt-1 text-xs text-warn">
          Unclear text. Type what the original says, or leave <span className="font-semibold">{UNCLEAR}</span> if it really cannot be read.
        </p>
      )}
    </div>
  )
}

/** Type caption shown above a block ("3. Table row"). */
export function BlockCaption({ index, block }: { index: number; block: Block }) {
  return (
    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">
      {index + 1}. {BLOCK_TYPE_LABEL[block.type]}
      {isNonText(block) && <span className="normal-case tracking-normal"> · not text, shown as a placeholder in the PDF</span>}
    </p>
  )
}
