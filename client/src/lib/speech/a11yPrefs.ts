export type A11yMode = 'standard' | 'accessible'

export interface A11yPrefs {
  mode: A11yMode
  largeText: boolean
  highContrast: boolean
  autoSpeak: boolean
}

export const A11Y_KEY = 'transly.a11y.v1'
export const TTS_KEY = 'transly.tts.v1'

export interface TtsPrefs {
  rate: number
  voiceURIByLang: Partial<Record<string, string>>
}

export function readA11yPrefs(): A11yPrefs | null {
  try {
    const raw = localStorage.getItem(A11Y_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<A11yPrefs>
    if (p.mode !== 'standard' && p.mode !== 'accessible') return null
    return {
      mode: p.mode,
      largeText: Boolean(p.largeText),
      highContrast: Boolean(p.highContrast),
      autoSpeak: Boolean(p.autoSpeak),
    }
  } catch {
    return null
  }
}

export function writeA11yPrefs(p: A11yPrefs) {
  try {
    localStorage.setItem(A11Y_KEY, JSON.stringify(p))
  } catch {
    /* storage blocked */
  }
}

export function applyA11yClasses(p: A11yPrefs | null) {
  const root = document.documentElement
  const accessible = p?.mode === 'accessible'
  root.classList.toggle('a11y-mode', Boolean(accessible))
  root.classList.toggle('a11y-large', Boolean(accessible && p?.largeText))
  root.classList.toggle('a11y-contrast', Boolean(accessible && p?.highContrast))
}

export function readTtsPrefs(): TtsPrefs {
  try {
    const raw = localStorage.getItem(TTS_KEY)
    if (!raw) return { rate: 1, voiceURIByLang: {} }
    const p = JSON.parse(raw) as Partial<TtsPrefs>
    const rate = typeof p.rate === 'number' ? p.rate : 1
    return { rate, voiceURIByLang: p.voiceURIByLang ?? {} }
  } catch {
    return { rate: 1, voiceURIByLang: {} }
  }
}

export function writeTtsPrefs(p: TtsPrefs) {
  try {
    localStorage.setItem(TTS_KEY, JSON.stringify(p))
  } catch {
    /* storage blocked */
  }
}
