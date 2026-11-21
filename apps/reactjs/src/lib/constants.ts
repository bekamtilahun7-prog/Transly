import type { BlockType, DocStatus, DocType, LangCode } from '../types'

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const LANGUAGES: { code: LangCode; label: string; native: string }[] = [
  { code: 'om', label: 'Afaan Oromo', native: 'Afaan Oromoo' },
  { code: 'am', label: 'Amharic', native: 'አማርኛ' },
  { code: 'en', label: 'English', native: 'English' },
]

export const langLabel = (c?: LangCode | null) => LANGUAGES.find((l) => l.code === c)?.label ?? c ?? '—'

/** API value -> display label (project brief, section 3). */
export const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'academic', label: 'Academic' },
  { value: 'id_certificate', label: 'ID Certificate' },
  { value: 'legal', label: 'Legal' },
  { value: 'other', label: 'Other' },
]

export const docTypeLabel = (t?: DocType | null) => DOC_TYPES.find((d) => d.value === t)?.label ?? t ?? '—'

/** documents.status -> label. The values themselves come from shared/contract.ts. */
export const STATUS_LABEL: Record<DocStatus, string> = {
  uploaded: 'Uploaded',
  extracted: 'Text extracted',
  translated: 'Translated',
  in_review: 'In review',
  reviewed: 'Reviewed',
  issued: 'Issued',
}

/** Matches the storage bucket limit in supabase/migrations/001_init.sql. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024

export const BLOCK_TYPE_LABEL: Record<BlockType, string> = {
  heading: 'Heading',
  paragraph: 'Paragraph',
  table_row: 'Table row',
  list_item: 'List item',
  stamp: 'Stamp',
  signature: 'Signature',
  logo: 'Logo',
  handwriting: 'Handwriting',
}

/** Non-text elements: never translated or faked, rendered as a placeholder line. */
export const NON_TEXT_TYPES: BlockType[] = ['stamp', 'signature', 'logo', 'handwriting']

export const NON_TEXT_PLACEHOLDER: Record<string, string> = {
  stamp: '[Stamp present in original]',
  signature: '[Signature present in original]',
  logo: '[Logo present in original]',
  handwriting: '[Handwriting present in original]',
}
