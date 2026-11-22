import type { LangCode } from '../types'
import { fill, MESSAGES, type Messages } from './messages'

export function planCopy(lang: LangCode, id: keyof Messages['pricing']['plans']) {
  return MESSAGES[lang].pricing.plans[id]
}

function lookup(dict: Messages, path: string): unknown {
  return path.split('.').reduce<unknown>((cur, part) => {
    if (cur && typeof cur === 'object' && part in (cur as object)) return (cur as Record<string, unknown>)[part]
    return undefined
  }, dict)
}

export function t(lang: LangCode, path: string, vars?: Record<string, string | number>): string {
  const raw = lookup(MESSAGES[lang], path)
  const fallback = typeof raw === 'string' ? raw : lookup(MESSAGES.en, path)
  if (typeof fallback !== 'string') return path
  return fill(fallback, vars)
}

export function faqsFor(lang: LangCode) {
  return MESSAGES[lang].faq.items
}
