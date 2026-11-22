import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import { useSpeechQueue } from '../hooks/useSpeechQueue'
import {
  applyA11yClasses,
  readA11yPrefs,
  writeA11yPrefs,
  type A11yMode,
  type A11yPrefs,
} from '../lib/speech/a11yPrefs'
import { useLocale } from './LocaleContext'
import { collectPageSegments } from '../lib/speech/pageContent'
import { bestVoiceForLang, langToBcp47 } from '../lib/speech/voices'
import type { LangCode } from '../types'

interface A11yState {
  ready: boolean
  prefs: A11yPrefs | null
  mode: A11yMode | null
  accessible: boolean
  panelOpen: boolean
  chooserOpen: boolean
  pageStatus: 'idle' | 'speaking' | 'paused'
  pageSupported: boolean
  pageError: string | null
  liveMessage: string
  pageLang: LangCode
  setPageLang: (lang: LangCode) => void
  chooseMode: (mode: A11yMode) => void
  setAccessible: (on: boolean) => void
  setLargeText: (on: boolean) => void
  setHighContrast: (on: boolean) => void
  setAutoSpeak: (on: boolean) => void
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
  openChooser: () => void
  closeChooser: () => void
  readPage: () => void
  pausePage: () => void
  resumePage: () => void
  stopPage: () => void
}

const Ctx = createContext<A11yState | null>(null)

const defaultAccessible: A11yPrefs = {
  mode: 'accessible',
  largeText: true,
  highContrast: true,
  autoSpeak: false,
}

const defaultStandard: A11yPrefs = {
  mode: 'standard',
  largeText: false,
  highContrast: false,
  autoSpeak: false,
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const loc = useLocation()
  const page = useSpeechQueue('page')
  const [prefs, setPrefs] = useState<A11yPrefs | null>(null)
  const [ready, setReady] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [chooserOpen, setChooserOpen] = useState(false)
  const [liveMessage, setLiveMessage] = useState('')
  const { lang: pageLang, setLang, t } = useLocale()

  useEffect(() => {
    const stored = readA11yPrefs()
    setPrefs(stored)
    applyA11yClasses(stored)
    setChooserOpen(stored === null)
    setReady(true)
  }, [])

  const persist = useCallback((next: A11yPrefs) => {
    setPrefs(next)
    writeA11yPrefs(next)
    applyA11yClasses(next)
  }, [])

  const chooseMode = useCallback(
    (mode: A11yMode) => {
      persist(mode === 'accessible' ? defaultAccessible : defaultStandard)
      setChooserOpen(false)
      setLiveMessage(mode === 'accessible' ? t('live.accessibleOn') : t('live.standardOn'))
      if (mode === 'accessible') setPanelOpen(true)
    },
    [persist, t],
  )

  const patch = useCallback(
    (partial: Partial<A11yPrefs>) => {
      const base = prefs ?? defaultStandard
      persist({ ...base, ...partial })
    },
    [prefs, persist],
  )

  const readPage = useCallback(() => {
    const parts = collectPageSegments()
    if (!parts.length) {
      setLiveMessage(t('live.none'))
      return
    }
    const voice = bestVoiceForLang(page.voices, pageLang)
    page.voiceRef.current = voice?.voiceURI ?? null
    setLiveMessage(t('live.reading'))
    page.play(parts.map((text, i) => ({ id: `p${i}`, text, lang: langToBcp47(pageLang) })))
  }, [page, pageLang, t])

  const pausePage = useCallback(() => {
    page.pause()
    setLiveMessage(t('live.paused'))
  }, [page, t])

  const resumePage = useCallback(() => {
    page.resume()
    setLiveMessage(t('live.resumed'))
  }, [page, t])

  const stopPage = useCallback(() => {
    page.stop()
    setLiveMessage(t('live.stopped'))
  }, [page, t])

  useEffect(() => {
    page.stop()
    if (!prefs || prefs.mode !== 'accessible' || !prefs.autoSpeak) return
    const t = window.setTimeout(() => readPage(), 450)
    return () => window.clearTimeout(t)
    // Read after navigation only; readPage is recreated often.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname, loc.search, prefs?.mode, prefs?.autoSpeak])

  const value = useMemo<A11yState>(
    () => ({
      ready,
      prefs,
      mode: prefs?.mode ?? null,
      accessible: prefs?.mode === 'accessible',
      panelOpen,
      chooserOpen,
      pageStatus: page.status,
      pageSupported: page.supported,
      pageError: page.error,
      liveMessage,
      pageLang,
      setPageLang: (next: LangCode) => {
        setLang(next)
        setLiveMessage(t('live.readingLang', { lang: t(`langs.${next}`) }))
      },
      chooseMode,
      setAccessible: (on) => {
        persist(on ? { ...(prefs ?? defaultAccessible), mode: 'accessible' } : { ...(prefs ?? defaultStandard), mode: 'standard' })
        setLiveMessage(on ? t('live.accessibleOn') : t('live.accessibleOff'))
      },
      setLargeText: (on) => {
        patch({ largeText: on, mode: 'accessible' })
        setLiveMessage(on ? t('live.largerOn') : t('live.largerOff'))
      },
      setHighContrast: (on) => {
        patch({ highContrast: on, mode: 'accessible' })
        setLiveMessage(on ? t('live.contrastOn') : t('live.contrastOff'))
      },
      setAutoSpeak: (on) => {
        patch({ autoSpeak: on, mode: 'accessible' })
        setLiveMessage(on ? t('live.autoOn') : t('live.autoOff'))
      },
      openPanel: () => setPanelOpen(true),
      closePanel: () => setPanelOpen(false),
      togglePanel: () => setPanelOpen((o) => !o),
      openChooser: () => setChooserOpen(true),
      closeChooser: () => {
        if (prefs) setChooserOpen(false)
      },
      readPage,
      pausePage,
      resumePage,
      stopPage,
    }),
    [
      ready,
      prefs,
      panelOpen,
      chooserOpen,
      page.status,
      page.supported,
      page.error,
      liveMessage,
      pageLang,
      chooseMode,
      persist,
      patch,
      readPage,
      pausePage,
      resumePage,
      stopPage,
      t,
      setLang,
    ],
  )

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
    </Ctx.Provider>
  )
}

export function useAccessibility(): A11yState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAccessibility must be used inside <AccessibilityProvider>')
  return v
}
