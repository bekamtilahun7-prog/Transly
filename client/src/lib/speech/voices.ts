import type { LangCode } from '../../types'

export const READ_LANGS: LangCode[] = ['om', 'am', 'en']

const PREFIX: Record<LangCode, string[]> = {
  en: ['en'],
  am: ['am'],
  om: ['om'],
}

const NAME_HINT: Record<LangCode, RegExp> = {
  en: /\benglish\b/i,
  am: /amharic/i,
  om: /oromo|afaan/i,
}

export function langToBcp47(code: LangCode): string {
  if (code === 'am') return 'am-ET'
  if (code === 'om') return 'om-ET'
  return 'en-US'
}

function normLang(voice: SpeechSynthesisVoice) {
  return voice.lang.replace('_', '-').toLowerCase()
}

function matchesCode(voice: SpeechSynthesisVoice, code: LangCode): boolean {
  const lang = normLang(voice)
  if (PREFIX[code].some((p) => lang === p || lang.startsWith(`${p}-`))) return true
  return NAME_HINT[code].test(voice.name)
}

/** True when the installed voice is English, Amharic, or Afaan Oromo. */
export function isTranslyVoice(voice: SpeechSynthesisVoice): boolean {
  return READ_LANGS.some((code) => matchesCode(voice, code))
}

export function filterTranslyVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter(isTranslyVoice)
}

export function voicesForLang(voices: SpeechSynthesisVoice[], code: LangCode): SpeechSynthesisVoice[] {
  return filterTranslyVoices(voices).filter((v) => matchesCode(v, code))
}

/** Best installed voice for a Transly language. Never selects a fourth language. */
export function bestVoiceForLang(
  voices: SpeechSynthesisVoice[],
  code: LangCode,
  preferredURI?: string | null,
): SpeechSynthesisVoice | null {
  const allowed = filterTranslyVoices(voices)
  const matches = voicesForLang(allowed, code)
  if (preferredURI) {
    const preferred = matches.find((v) => v.voiceURI === preferredURI)
    if (preferred) return preferred
  }
  if (matches.length) {
    return matches.find((v) => v.localService) ?? matches[0]
  }
  const english = voicesForLang(allowed, 'en')
  return english.find((v) => v.localService) ?? english[0] ?? allowed[0] ?? null
}

export function voiceUnavailableMessage(code: LangCode): string {
  if (code === 'am') {
    return 'No Amharic voice is installed in this browser. English will be used, and pronunciation may be inaccurate.'
  }
  if (code === 'om') {
    return 'No Afaan Oromo voice is installed in this browser. English will be used, and pronunciation may be inaccurate.'
  }
  return 'No English voice is installed in this browser. Reading may be unavailable until the system adds an English voice.'
}
