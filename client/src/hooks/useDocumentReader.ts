import { useCallback, useEffect, useMemo, useState } from 'react'
import { blocksToSegments } from '../lib/speech/segments'
import { bestVoiceForLang, langToBcp47, voiceUnavailableMessage, voicesForLang } from '../lib/speech/voices'
import { readTtsPrefs, writeTtsPrefs } from '../lib/speech/a11yPrefs'
import type { Block, LangCode } from '../types'
import { useSpeechQueue } from './useSpeechQueue'

export type ReaderSide = 'original' | 'translated'

export function useDocumentReader({
  documentId,
  original,
  translated,
  sourceLang,
  targetLang,
}: {
  documentId: string
  original: Block[]
  translated?: Block[] | null
  sourceLang: LangCode
  targetLang?: LangCode
}) {
  const queue = useSpeechQueue('document')
  const [stored] = useState(readTtsPrefs)
  const [side, setSide] = useState<ReaderSide>('original')
  const [rate, setRateState] = useState(stored.rate)
  const [voiceURI, setVoiceState] = useState<string | null>(null)
  const [voiceReady, setVoiceReady] = useState(false)

  const canTranslate = Boolean(translated && translated.length)
  const lang: LangCode = side === 'translated' && targetLang ? targetLang : sourceLang
  const blocks = side === 'translated' && translated ? translated : original
  const segments = useMemo(() => blocksToSegments(blocks), [blocks])
  const matches = useMemo(() => voicesForLang(queue.voices, lang), [queue.voices, lang])

  useEffect(() => {
    queue.rateRef.current = rate
  }, [queue.rateRef, rate])

  useEffect(() => {
    if (!queue.voices.length) return
    const saved = stored.voiceURIByLang[lang]
    const next = bestVoiceForLang(queue.voices, lang, saved)
    setVoiceState(next?.voiceURI ?? queue.voices.find((v) => v.default)?.voiceURI ?? queue.voices[0]?.voiceURI ?? null)
    queue.voiceRef.current = next?.voiceURI ?? null
    setVoiceReady(true)
  }, [lang, queue.voices, queue.voiceRef, stored.voiceURIByLang])

  useEffect(() => {
    queue.stop()
  }, [documentId]) // eslint-disable-line react-hooks/exhaustive-deps -- reset only when the document changes

  const play = useCallback(
    (from?: number) => {
      queue.voiceRef.current = voiceURI
      queue.rateRef.current = rate
      queue.play(
        segments.map((s) => ({ id: s.id, text: s.text, lang: langToBcp47(lang) })),
        from ?? queue.index,
      )
    },
    [queue, segments, lang, voiceURI, rate],
  )

  const changeSide = useCallback(
    (next: ReaderSide) => {
      if (next === side) return
      queue.stop()
      setSide(next)
    },
    [queue, side],
  )

  const changeRate = useCallback(
    (next: number) => {
      setRateState(next)
      writeTtsPrefs({ ...readTtsPrefs(), rate: next })
      queue.setRate(next)
    },
    [queue],
  )

  const changeVoice = useCallback(
    (uri: string) => {
      setVoiceState(uri)
      const prefs = readTtsPrefs()
      writeTtsPrefs({ ...prefs, voiceURIByLang: { ...prefs.voiceURIByLang, [lang]: uri } })
      queue.setVoiceURI(uri)
    },
    [queue, lang],
  )

  const highlightIndex = queue.active || queue.status === 'paused' ? (segments[queue.index]?.blockIndex ?? null) : null
  const langMissing = voiceReady && matches.length === 0
  const playFromStart = useCallback(() => play(0), [play])
  const resume = useCallback(
    () => (queue.status === 'paused' ? queue.resume() : play(queue.index)),
    [queue.status, queue.resume, queue.index, play],
  )

  return useMemo(
    () => ({
      supported: queue.supported,
      status: queue.status,
      index: queue.index,
      length: segments.length,
      progress: queue.progress,
      error: queue.error || (segments.length === 0 ? 'This document has no readable text yet.' : null),
      side,
      canTranslate,
      lang,
      rate,
      voiceURI,
      voices: queue.voices,
      matchingVoices: matches,
      langMissing,
      langMissingMessage: langMissing ? voiceUnavailableMessage(lang) : null,
      highlightIndex,
      play: playFromStart,
      pause: queue.pause,
      resume,
      stop: queue.stop,
      next: queue.next,
      prev: queue.prev,
      playFrom: play,
      changeSide,
      changeRate,
      changeVoice,
      currentText: segments[queue.index]?.text ?? '',
    }),
    [
      queue.supported,
      queue.status,
      queue.index,
      queue.progress,
      queue.error,
      queue.pause,
      queue.stop,
      queue.next,
      queue.prev,
      segments.length,
      segments,
      side,
      canTranslate,
      lang,
      rate,
      voiceURI,
      queue.voices,
      matches,
      langMissing,
      highlightIndex,
      playFromStart,
      resume,
      play,
      changeSide,
      changeRate,
      changeVoice,
    ],
  )
}
