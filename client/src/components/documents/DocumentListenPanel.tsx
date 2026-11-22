import { Pause, Play, SkipBack, SkipForward, Square, Volume2 } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useLocale } from '../../context/LocaleContext'
import { useDocumentReader, type ReaderSide } from '../../hooks/useDocumentReader'
import { LANGUAGES } from '../../lib/constants'
import { usesGeminiVoice } from '../../lib/speech/aiTts'
import { voicesForLang } from '../../lib/speech/voices'
import { TTS_RATES } from '../../lib/speech/speechManager'
import type { Block, LangCode } from '../../types'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { Card } from '../common/ui'

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

function isButtonish(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false
  return el.closest('button, a, [role="button"]') != null
}

function Seg({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-10 flex-1 rounded-xl px-3 text-sm font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active ? 'bg-brand text-white' : 'text-ink-2 hover:bg-hover hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

export function DocumentListenPanel({
  documentId,
  original,
  translated,
  sourceLang,
  targetLang,
  onHighlight,
}: {
  documentId: string
  original: Block[]
  translated?: Block[] | null
  sourceLang: LangCode
  targetLang?: LangCode
  onHighlight?: (index: number | null, side: ReaderSide) => void
}) {
  const { t } = useLocale()
  const r = useDocumentReader({ documentId, original, translated, sourceLang, targetLang })
  const gemini = usesGeminiVoice(r.lang)

  useEffect(() => {
    onHighlight?.(r.highlightIndex, r.side)
  }, [r.highlightIndex, r.side, onHighlight])

  useEffect(() => {
    if (r.highlightIndex == null) return
    const el = document.querySelector(`[data-tts-block="${r.highlightIndex}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [r.highlightIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      if (e.key === 'Escape') {
        e.preventDefault()
        r.stop()
        return
      }
      if (isButtonish(e.target) && e.key === ' ') return
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        if (r.status === 'speaking') r.pause()
        else if (r.status === 'paused') r.resume()
        else r.playFrom(r.index)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        r.next()
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        r.prev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [r])

  const paragraphLabel =
    r.length === 0
      ? t('a11y.noParagraphs')
      : t('a11y.paragraphOf', { n: Math.min(r.index + 1, r.length), total: r.length })
  const playing = r.status === 'speaking'
  const paused = r.status === 'paused'

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Volume2 size={18} className="text-brand-ink" aria-hidden />
            {t('a11y.listenTitle')}
          </h2>
          <p className="mt-1 text-sm text-ink-2">{t('a11y.listenSub', { lang: t(`langs.${r.lang}`) })}</p>
        </div>
        {r.canTranslate && (
          <div className="flex w-full rounded-2xl bg-bg-2 p-1 sm:w-auto" role="group" aria-label={t('a11y.whichText')}>
            <Seg active={r.side === 'original'} onClick={() => r.changeSide('original' as ReaderSide)}>
              {t('stage.original')}
            </Seg>
            <Seg active={r.side === 'translated'} onClick={() => r.changeSide('translated')}>
              {t('stage.translated')}
            </Seg>
          </div>
        )}
      </div>

      {!r.supported && (
        <div className="mt-4">
          <Alert tone="warn" title={t('a11y.noSpeech')}>
            {t('a11y.noSpeechBody')}
          </Alert>
        </div>
      )}
      {r.supported && r.langMissingMessage && (
        <div className="mt-4">
          <Alert tone="info" title={t('a11y.noVoice')}>
            {r.langMissingMessage}
          </Alert>
        </div>
      )}
      {(r.error || r.length === 0) && r.supported && (
        <div className="mt-4">
          <Alert tone="warn">
            {r.length === 0
              ? t('a11y.noText')
              : r.error?.startsWith('a11y.')
                ? t(r.error)
                : r.error}
          </Alert>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-xs text-ink-2">
          <span aria-live="polite">{paragraphLabel}</span>
          <span className="tabular-nums">{Math.round(r.progress * 100)}%</span>
        </div>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg-2"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(r.progress * 100)}
          aria-label={t('a11y.progress')}
        >
          <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${Math.round(r.progress * 100)}%` }} />
        </div>
        {r.currentText && (playing || paused) && (
          <p className="mt-2 line-clamp-2 text-sm text-ink">{r.currentText}</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Button size="sm" variant="secondary" disabled={!r.supported || r.length === 0} onClick={r.play} icon={<Play size={14} aria-hidden />}>
          {t('a11y.play')}
        </Button>
        <Button size="sm" variant="secondary" disabled={!playing} onClick={r.pause} icon={<Pause size={14} aria-hidden />}>
          {t('a11y.pause')}
        </Button>
        <Button size="sm" variant="secondary" disabled={!paused} onClick={r.resume} icon={<Play size={14} aria-hidden />}>
          {t('a11y.resume')}
        </Button>
        <Button size="sm" variant="secondary" disabled={r.status === 'idle'} onClick={r.stop} icon={<Square size={14} aria-hidden />}>
          {t('a11y.stop')}
        </Button>
        <Button size="sm" variant="secondary" disabled={!r.supported || r.length === 0} onClick={r.prev} icon={<SkipBack size={14} aria-hidden />}>
          {t('a11y.previous')}
        </Button>
        <Button size="sm" variant="secondary" disabled={!r.supported || r.length === 0} onClick={r.next} icon={<SkipForward size={14} aria-hidden />}>
          {t('a11y.nextSeg')}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink">{t('a11y.speed')}</span>
          <select
            className="block min-h-11 w-full rounded-xl border border-input-line bg-input px-3 text-sm text-ink focus:border-focus focus:outline-none focus:ring-2 focus:ring-ring/60"
            value={String(r.rate)}
            onChange={(e) => r.changeRate(Number(e.target.value))}
            disabled={!r.supported}
          >
            {TTS_RATES.map((n) => (
              <option key={n} value={n}>
                {n}×
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink">{t('a11y.voice')}</span>
          <select
            className="block min-h-11 w-full max-w-full rounded-xl border border-input-line bg-input px-3 text-sm text-ink focus:border-focus focus:outline-none focus:ring-2 focus:ring-ring/60"
            value={gemini ? 'gemini-ai' : r.voiceURI ?? ''}
            onChange={(e) => r.changeVoice(e.target.value)}
            disabled={!r.supported || (!gemini && r.voices.length === 0)}
          >
            {gemini && <option value="gemini-ai">{t('a11y.geminiVoice')}</option>}
            {!gemini && r.voices.length === 0 && <option value="">{t('a11y.noVoiceFound')}</option>}
            {!gemini &&
              LANGUAGES.map((lang) => {
                const list = voicesForLang(r.voices, lang.code)
                if (!list.length) return null
                return (
                  <optgroup key={lang.code} label={t(`langs.${lang.code}`)}>
                    {list.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </optgroup>
                )
              })}
          </select>
        </label>
      </div>

      <p className="mt-3 text-xs text-ink-2">
        {t('a11y.shortcuts')}
      </p>
    </Card>
  )
}
