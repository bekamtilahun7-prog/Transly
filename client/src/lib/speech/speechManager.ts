/**
 * Single browser speechSynthesis controller for the whole app.
 * Page reading and document reading share this so they never speak at once.
 */

import { filterTranslyVoices, isTranslyVoice } from './voices'

export type SpeechOwner = 'page' | 'document'
export type SpeechStatus = 'idle' | 'speaking' | 'paused'

export const TTS_RATES = [0.75, 1, 1.25, 1.5, 2] as const
export type TtsRate = (typeof TTS_RATES)[number]

export interface SpeakOptions {
  lang?: string
  rate?: number
  voiceURI?: string | null
  onStart?: () => void
  onEnd?: () => void
  onError?: (message: string) => void
}

type Listener = () => void

export interface SpeechSnapshot {
  owner: SpeechOwner | null
  status: SpeechStatus
  voices: SpeechSynthesisVoice[]
  supported: boolean
}

const listeners = new Set<Listener>()

function synth(): SpeechSynthesis | null {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
    return window.speechSynthesis
  } catch {
    return null
  }
}

export function speechSupported(): boolean {
  try {
    return synth() !== null && typeof SpeechSynthesisUtterance === 'function'
  } catch {
    return false
  }
}

let owner: SpeechOwner | null = null
let status: SpeechStatus = 'idle'
let voices: SpeechSynthesisVoice[] = []
let current: SpeechSynthesisUtterance | null = null
let speakTimer: ReturnType<typeof setTimeout> | null = null
let generation = 0
let voicesBound = false
let snapshot: SpeechSnapshot = {
  owner: null,
  status: 'idle',
  voices,
  supported: speechSupported(),
}

function emit() {
  const next: SpeechSnapshot = { owner, status, voices, supported: speechSupported() }
  const prev = snapshot
  if (
    prev.owner === next.owner &&
    prev.status === next.status &&
    prev.voices === next.voices &&
    prev.supported === next.supported
  ) {
    return
  }
  snapshot = next
  listeners.forEach((fn) => fn())
}

function setStatus(next: SpeechStatus, nextOwner: SpeechOwner | null) {
  if (status === next && owner === nextOwner) return
  status = next
  owner = nextOwner
  emit()
}

function clearTimer() {
  if (speakTimer) {
    clearTimeout(speakTimer)
    speakTimer = null
  }
}

function sameVoices(a: SpeechSynthesisVoice[], b: SpeechSynthesisVoice[]) {
  if (a === b) return true
  if (a.length !== b.length) return false
  return a.every((v, i) => v.voiceURI === b[i]?.voiceURI)
}

function refreshVoices() {
  const s = synth()
  if (!s || typeof s.getVoices !== 'function') return
  let next: SpeechSynthesisVoice[] = []
  try {
    next = filterTranslyVoices(s.getVoices() ?? [])
  } catch {
    return
  }
  if (sameVoices(voices, next)) return
  voices = next
  emit()
}

function ensureVoices() {
  if (voicesBound) return
  const s = synth()
  voicesBound = true
  if (!s) return
  refreshVoices()
  try {
    if (typeof s.addEventListener === 'function') s.addEventListener('voiceschanged', refreshVoices)
    else s.onvoiceschanged = refreshVoices
  } catch {
    /* voices stay at whatever getVoices already returned */
  }
}

export function getSpeechSnapshot(): SpeechSnapshot {
  return snapshot
}

export function subscribeSpeech(fn: Listener) {
  listeners.add(fn)
  ensureVoices()
  return () => listeners.delete(fn)
}

export function stopSpeech(by?: SpeechOwner) {
  if (by && owner && by !== owner) return
  generation += 1
  clearTimer()
  current = null
  synth()?.cancel()
  setStatus('idle', null)
}

export function pauseSpeech(by: SpeechOwner) {
  if (owner !== by || status !== 'speaking' || !current) return
  const s = synth()
  if (!s) return
  s.pause()
  // Some browsers ignore pause(); only mark paused when it actually took.
  if (s.paused || status === 'speaking') setStatus('paused', by)
}

export function resumeSpeech(by: SpeechOwner) {
  if (owner !== by || status !== 'paused') return
  const s = synth()
  if (!s) return
  s.resume()
  setStatus('speaking', by)
}

export function speakText(by: SpeechOwner, text: string, opts: SpeakOptions = {}) {
  const s = synth()
  if (!s) {
    opts.onError?.('This browser cannot read text aloud.')
    return
  }
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (!trimmed) {
    opts.onEnd?.()
    return
  }

  generation += 1
  const gen = generation
  clearTimer()
  s.cancel()
  current = null
  owner = by
  status = 'speaking'
  emit()

  const run = () => {
    if (gen !== generation) return
    const u = new SpeechSynthesisUtterance(trimmed)
    if (opts.lang) u.lang = opts.lang
    u.rate = Math.min(2, Math.max(0.5, opts.rate ?? 1))
    u.pitch = 1
    u.volume = 1
    const pool = voices.length ? voices : filterTranslyVoices(s.getVoices() ?? [])
    const uri = opts.voiceURI
    const chosen = uri ? pool.find((voice) => voice.voiceURI === uri && isTranslyVoice(voice)) : undefined
    if (chosen) {
      u.voice = chosen
      if (!opts.lang) u.lang = chosen.lang
    }
    u.onstart = () => {
      if (gen !== generation) return
      setStatus('speaking', by)
      opts.onStart?.()
    }
    u.onend = () => {
      if (gen !== generation) return
      current = null
      setStatus('idle', null)
      opts.onEnd?.()
    }
    u.onerror = (ev) => {
      if (gen !== generation) return
      current = null
      if (ev.error === 'canceled' || ev.error === 'interrupted') {
        setStatus('idle', null)
        return
      }
      setStatus('idle', null)
      opts.onError?.(ev.error === 'not-allowed' ? 'The browser blocked speech. Try again after a click.' : 'Speech stopped unexpectedly.')
    }
    u.onpause = () => {
      if (gen !== generation) return
      setStatus('paused', by)
    }
    u.onresume = () => {
      if (gen !== generation) return
      setStatus('speaking', by)
    }
    current = u
    s.speak(u)
  }

  // cancel() then speak() in the same tick is dropped in Chrome.
  speakTimer = setTimeout(run, 40)
}
