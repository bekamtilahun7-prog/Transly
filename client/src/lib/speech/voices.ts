import type { LangCode } from '../../types'

const PREFIX: Record<LangCode, string[]> = {
  en: ['en'],
  am: ['am'],
  om: ['om'],
}

export function langToBcp47(code: LangCode): string {
  if (code === 'am') return 'am-ET'
  if (code === 'om') return 'om-ET'
  return 'en-US'
}

export function voicesForLang(voices: SpeechSynthesisVoice[], code: LangCode): SpeechSynthesisVoice[] {
  const prefixes = PREFIX[code]
  return voices.filter((v) => {
    const lang = v.lang.replace('_', '-').toLowerCase()
    return prefixes.some((p) => lang === p || lang.startsWith(`${p}-`))
  })
}

/** Best installed voice for a Transly language, or null if none match. */
export function bestVoiceForLang(
  voices: SpeechSynthesisVoice[],
  code: LangCode,
  preferredURI?: string | null,
): SpeechSynthesisVoice | null {
  const matches = voicesForLang(voices, code)
  if (preferredURI) {
    const preferred = matches.find((v) => v.voiceURI === preferredURI)
    if (preferred) return preferred
    const anyPreferred = voices.find((v) => v.voiceURI === preferredURI)
    if (anyPreferred && !matches.length) return anyPreferred
  }
  if (!matches.length) return null
  const local = matches.find((v) => v.localService)
  return local ?? matches[0] ?? null
}

export function voiceUnavailableMessage(code: LangCode): string {
  if (code === 'am') {
    return 'No Amharic voice is installed in this browser. Another available voice will be used, and pronunciation may be inaccurate.'
  }
  if (code === 'om') {
    return 'No Afaan Oromo voice is installed in this browser. Another available voice will be used, and pronunciation may be inaccurate.'
  }
  return 'No English voice is installed in this browser. The default system voice will be used.'
}
