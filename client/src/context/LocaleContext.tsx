import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { t as translate, faqsFor } from '../i18n/t'
import { langToBcp47 } from '../lib/speech/voices'
import { readTtsPrefs, writeTtsPrefs } from '../lib/speech/a11yPrefs'
import { stopSpeech } from '../lib/speech/speechManager'
import type { LangCode } from '../types'

const KEY = 'transly.locale.v1'

function isLang(v: unknown): v is LangCode {
  return v === 'om' || v === 'am' || v === 'en'
}

function readLang(): LangCode {
  try {
    const stored = localStorage.getItem(KEY)
    if (isLang(stored)) return stored
    const fromTts = readTtsPrefs().pageLang
    if (isLang(fromTts)) return fromTts
  } catch {
    /* ignore */
  }
  return 'en'
}

interface LocaleState {
  lang: LangCode
  setLang: (lang: LangCode) => void
  t: (path: string, vars?: Record<string, string | number>) => string
  faqs: { q: string; a: string }[]
}

const Ctx = createContext<LocaleState | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(readLang)

  useEffect(() => {
    document.documentElement.lang = langToBcp47(lang)
    try {
      localStorage.setItem(KEY, lang)
    } catch {
      /* ignore */
    }
    writeTtsPrefs({ ...readTtsPrefs(), pageLang: lang })
  }, [lang])

  const setLang = useCallback((next: LangCode) => {
    stopSpeech()
    setLangState(next)
  }, [])

  const value = useMemo<LocaleState>(
    () => ({
      lang,
      setLang,
      t: (path, vars) => translate(lang, path, vars),
      faqs: faqsFor(lang),
    }),
    [lang, setLang],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLocale(): LocaleState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLocale must be used inside <LocaleProvider>')
  return v
}
