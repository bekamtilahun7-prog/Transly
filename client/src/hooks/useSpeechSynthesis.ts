import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import {
  getSpeechSnapshot,
  pauseSpeech,
  resumeSpeech,
  speakText,
  speechSupported,
  stopSpeech,
  subscribeSpeech,
  type SpeechOwner,
  type SpeakOptions,
} from '../lib/speech/speechManager'

export function useSpeechSynthesis(owner: SpeechOwner) {
  const snap = useSyncExternalStore(subscribeSpeech, getSpeechSnapshot, getSpeechSnapshot)
  const mine = snap.owner === owner
  const status = mine ? snap.status : 'idle'

  const speak = useCallback((text: string, opts: SpeakOptions = {}) => speakText(owner, text, opts), [owner])
  const pause = useCallback(() => pauseSpeech(owner), [owner])
  const resume = useCallback(() => resumeSpeech(owner), [owner])
  const stop = useCallback(() => stopSpeech(owner), [owner])

  useEffect(() => () => stopSpeech(owner), [owner])

  return useMemo(
    () => ({
      supported: speechSupported() && snap.supported,
      voices: snap.voices,
      status,
      active: mine && snap.status !== 'idle',
      speak,
      pause,
      resume,
      stop,
    }),
    [snap.supported, snap.voices, snap.status, status, mine, speak, pause, resume, stop],
  )
}
