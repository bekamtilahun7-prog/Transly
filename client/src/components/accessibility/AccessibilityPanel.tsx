import { Pause, Play, Square, Volume2, X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { useAccessibility } from '../../context/AccessibilityContext'
import { LANGUAGES } from '../../lib/constants'
import { Button } from '../common/Button'

function Switch({
  id,
  checked,
  onChange,
  label,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
      <span className="text-sm font-medium text-ink">{label}</span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${checked ? 'bg-brand' : 'bg-line-strong'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition duration-150 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </label>
  )
}

export function AccessibilityPanel() {
  const a = useAccessibility()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const ids = {
    mode: useId(),
    large: useId(),
    contrast: useId(),
    auto: useId(),
  }

  useEffect(() => {
    if (!a.panelOpen) return
    panelRef.current?.querySelector<HTMLElement>('button')?.focus()
  }, [a.panelOpen])

  if (!a.panelOpen) return null

  const prefs = a.prefs
  const accessible = a.accessible

  return (
    <div
      id="a11y-panel"
      ref={panelRef}
      role="dialog"
      aria-labelledby={titleId}
      data-no-speak
      className="fixed bottom-20 right-4 z-[60] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-elevated p-4 shadow-2xl sm:bottom-24"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={titleId} className="text-base font-semibold text-ink">
            Accessibility
          </h2>
          <p className="mt-0.5 text-xs text-ink-2">Reading and display options for this browser.</p>
        </div>
        <button
          type="button"
          aria-label="Close accessibility controls"
          onClick={a.closePanel}
          className="flex size-9 items-center justify-center rounded-full text-ink-2 hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      <div className="mt-3 space-y-1 border-t border-line pt-3">
        <Switch id={ids.mode} checked={accessible} onChange={a.setAccessible} label="Accessible mode" />
        <Switch
          id={ids.large}
          checked={Boolean(accessible && prefs?.largeText)}
          onChange={(on) => {
            if (on && !accessible) a.setAccessible(true)
            a.setLargeText(on)
          }}
          label="Larger text"
        />
        <Switch
          id={ids.contrast}
          checked={Boolean(accessible && prefs?.highContrast)}
          onChange={(on) => {
            if (on && !accessible) a.setAccessible(true)
            a.setHighContrast(on)
          }}
          label="High contrast"
        />
        <Switch
          id={ids.auto}
          checked={Boolean(accessible && prefs?.autoSpeak)}
          onChange={(on) => {
            if (on && !accessible) a.setAccessible(true)
            a.setAutoSpeak(on)
          }}
          label="Read pages after I open them"
        />
      </div>

      <div className="mt-3 border-t border-line pt-3">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink">
          <Volume2 size={16} aria-hidden />
          Read this page
        </p>
        <p className="mb-2 text-xs text-ink-2">Voice language — Afaan Oromo, Amharic, or English only.</p>
        <div className="mb-3 flex rounded-xl bg-bg-2 p-1" role="group" aria-label="Reading language">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => a.setPageLang(lang.code)}
              aria-pressed={a.pageLang === lang.code}
              className={`min-h-9 flex-1 rounded-lg px-2 text-xs font-semibold transition ${
                a.pageLang === lang.code ? 'bg-brand text-white' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {lang.code === 'om' ? 'Or' : lang.code === 'am' ? 'Am' : 'En'}
            </button>
          ))}
        </div>
        {!a.pageSupported && (
          <p className="mb-2 text-xs text-warn">This browser cannot read pages aloud.</p>
        )}
        {a.pageError && <p className="mb-2 text-xs text-danger">{a.pageError}</p>}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            size="sm"
            variant="secondary"
            disabled={!a.pageSupported || a.pageStatus === 'speaking'}
            onClick={a.readPage}
            icon={<Play size={14} aria-hidden />}
          >
            Play
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={a.pageStatus !== 'speaking'}
            onClick={a.pausePage}
            icon={<Pause size={14} aria-hidden />}
          >
            Pause
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={a.pageStatus !== 'paused'}
            onClick={a.resumePage}
            icon={<Play size={14} aria-hidden />}
          >
            Resume
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={a.pageStatus === 'idle'}
            onClick={a.stopPage}
            icon={<Square size={14} aria-hidden />}
          >
            Stop
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={a.openChooser}
        className="mt-4 w-full text-left text-xs font-medium text-brand-ink hover:underline"
      >
        Choose Standard or Accessible mode again
      </button>
    </div>
  )
}
