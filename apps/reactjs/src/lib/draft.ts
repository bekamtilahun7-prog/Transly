import type { Block } from '../types'

/** Unsaved edits live in sessionStorage per document (the API has no endpoint to save drafts). */
export interface Draft {
  original?: Block[]
  translated?: Block[]
  /** The exact original blocks the stored translation was produced from. */
  translatedSource?: Block[]
}

const k = (id: string) => `transly.draft.${id}`

export function loadDraft(id: string): Draft {
  try {
    return JSON.parse(sessionStorage.getItem(k(id)) ?? '{}') as Draft
  } catch {
    return {}
  }
}

export function saveDraft(id: string, patch: Partial<Draft>, remove: (keyof Draft)[] = []) {
  const d = { ...loadDraft(id), ...patch }
  for (const key of remove) delete d[key]
  try {
    sessionStorage.setItem(k(id), JSON.stringify(d))
  } catch {
    /* storage full/blocked: edits just won't survive a reload */
  }
}

export const sameBlocks = (a?: Block[] | null, b?: Block[] | null) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** The translation must keep ids, order, count and types (shared/contract.ts). */
export function checkTranslated(original: Block[], translated: Block[]): string | null {
  if (!Array.isArray(translated)) return 'The translation response was not a list of blocks.'
  if (translated.length !== original.length) {
    return `The translation returned ${translated.length} blocks but the document has ${original.length}.`
  }
  for (let i = 0; i < original.length; i++) {
    const o = original[i]
    const t = translated[i]
    if (!t || t.id !== o.id || t.type !== o.type || typeof t.text !== 'string') {
      return `Translated block ${i + 1} does not match the original (id or type changed).`
    }
  }
  return null
}
