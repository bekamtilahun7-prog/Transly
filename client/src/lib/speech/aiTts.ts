import type { LangCode } from '../../types'

export function bcp47ToLang(lang?: string | null): LangCode | null {
  if (!lang) return null
  const code = lang.replace('_', '-').toLowerCase()
  if (code === 'om' || code.startsWith('om-')) return 'om'
  if (code === 'am' || code.startsWith('am-')) return 'am'
  if (code === 'en' || code.startsWith('en-')) return 'en'
  return null
}

/** Gemini reads all three Transly languages with the same pinned voice. */
export function usesGeminiVoice(lang: LangCode): boolean {
  return lang === 'am' || lang === 'om' || lang === 'en'
}

export async function fetchGeminiSpeech(text: string, lang: LangCode, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lang }),
    signal,
  })
  const body = (await res.json().catch(() => null)) as { audio?: string; mimeType?: string; error?: { message?: string } } | null
  if (!res.ok || !body?.audio) {
    throw new Error(body?.error?.message || 'Could not generate speech.')
  }
  const bin = Uint8Array.from(atob(body.audio), (c) => c.charCodeAt(0))
  return new Blob([bin], { type: body.mimeType || 'audio/wav' })
}
