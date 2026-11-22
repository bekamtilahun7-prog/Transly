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
import { collectPageSegments } from '../lib/speech/pageContent'

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
      setLiveMessage(mode === 'accessible' ? 'Accessible mode on.' : 'Standard mode on.')
      if (mode === 'accessible') setPanelOpen(true)
    },
    [persist],
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
      setLiveMessage('No readable content on this page.')
      return
    }
    setLiveMessage('Reading this page.')
    page.play(parts.map((text, i) => ({ id: `p${i}`, text, lang: document.documentElement.lang || 'en' })))
  }, [page])

  const pausePage = useCallback(() => {
    page.pause()
    setLiveMessage('Page reading paused.')
  }, [page])

  const resumePage = useCallback(() => {
    page.resume()
    setLiveMessage('Page reading resumed.')
  }, [page])

  const stopPage = useCallback(() => {
    page.stop()
    setLiveMessage('Page reading stopped.')
  }, [page])

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
      chooseMode,
      setAccessible: (on) => {
        persist(on ? { ...(prefs ?? defaultAccessible), mode: 'accessible' } : { ...(prefs ?? defaultStandard), mode: 'standard' })
        setLiveMessage(on ? 'Accessible mode on.' : 'Accessible mode off.')
      },
      setLargeText: (on) => {
        patch({ largeText: on, mode: 'accessible' })
        setLiveMessage(on ? 'Larger text on.' : 'Larger text off.')
      },
      setHighContrast: (on) => {
        patch({ highContrast: on, mode: 'accessible' })
        setLiveMessage(on ? 'High contrast on.' : 'High contrast off.')
      },
      setAutoSpeak: (on) => {
        patch({ autoSpeak: on, mode: 'accessible' })
        setLiveMessage(on ? 'Pages will be read after you open them.' : 'Pages will not be read automatically.')
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
      chooseMode,
      persist,
      patch,
      readPage,
      pausePage,
      resumePage,
      stopPage,
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
