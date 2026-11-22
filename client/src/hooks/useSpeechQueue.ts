import { useCallback, useMemo, useRef, useState } from 'react'
import type { SpeechOwner } from '../lib/speech/speechManager'
import { useSpeechSynthesis } from './useSpeechSynthesis'

export interface QueueItem {
  id: string
  text: string
  lang?: string
}

export function useSpeechQueue(owner: SpeechOwner) {
  const speech = useSpeechSynthesis(owner)
  const itemsRef = useRef<QueueItem[]>([])
  const indexRef = useRef(0)
  const rateRef = useRef(1)
  const voiceRef = useRef<string | null>(null)
  const playingRef = useRef(false)
  const speakFn = useRef(speech.speak)
  const stopFn = useRef(speech.stop)
  speakFn.current = speech.speak
  stopFn.current = speech.stop

  const [index, setIndex] = useState(0)
  const [length, setLength] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const speakAt = useCallback((i: number) => {
    const items = itemsRef.current
    if (i < 0 || i >= items.length) {
      playingRef.current = false
      stopFn.current()
      return
    }
    const item = items[i]
    if (!item) return
    indexRef.current = i
    setIndex(i)
    playingRef.current = true
    speakFn.current(item.text, {
      lang: item.lang,
      rate: rateRef.current,
      voiceURI: voiceRef.current,
      onEnd: () => {
        if (!playingRef.current) return
        const next = indexRef.current + 1
        if (next < itemsRef.current.length) speakAt(next)
        else {
          playingRef.current = false
          indexRef.current = 0
          setIndex(0)
        }
      },
      onError: (msg) => {
        playingRef.current = false
        setError(msg)
      },
    })
  }, [])

  const play = useCallback(
    (items: QueueItem[], from = 0) => {
      setError(null)
      itemsRef.current = items
      setLength(items.length)
      if (!items.length) {
        setError('a11y.nothing')
        return
      }
      speakAt(Math.min(Math.max(from, 0), items.length - 1))
    },
    [speakAt],
  )

  const pause = useCallback(() => speech.pause(), [speech])

  const resume = useCallback(() => {
    if (speech.status === 'paused') speech.resume()
    else if (itemsRef.current.length) speakAt(indexRef.current)
  }, [speech, speakAt])

  const stop = useCallback(() => {
    playingRef.current = false
    speech.stop()
    indexRef.current = 0
    setIndex(0)
  }, [speech])

  const next = useCallback(() => {
    if (!itemsRef.current.length) return
    speakAt(Math.min(indexRef.current + 1, itemsRef.current.length - 1))
  }, [speakAt])

  const prev = useCallback(() => {
    if (!itemsRef.current.length) return
    speakAt(Math.max(indexRef.current - 1, 0))
  }, [speakAt])

  const setRate = useCallback(
    (rate: number) => {
      rateRef.current = rate
      if (speech.status === 'speaking' || speech.status === 'paused') speakAt(indexRef.current)
    },
    [speech.status, speakAt],
  )

  const setVoiceURI = useCallback(
    (uri: string | null) => {
      voiceRef.current = uri
      if (speech.status === 'speaking' || speech.status === 'paused') speakAt(indexRef.current)
    },
    [speech.status, speakAt],
  )

  const progress = length === 0 ? 0 : speech.status === 'idle' && !playingRef.current ? 0 : (index + 1) / length

  return useMemo(
    () => ({
      supported: speech.supported,
      voices: speech.voices,
      status: speech.status,
      active: speech.active,
      index,
      length,
      progress,
      error,
      setError,
      play,
      pause,
      resume,
      stop,
      next,
      prev,
      setRate,
      setVoiceURI,
      rateRef,
      voiceRef,
    }),
    [
      speech.supported,
      speech.voices,
      speech.status,
      speech.active,
      index,
      length,
      progress,
      error,
      play,
      pause,
      resume,
      stop,
      next,
      prev,
      setRate,
      setVoiceURI,
    ],
  )
}
