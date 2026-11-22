import { Accessibility, Eye } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { useAccessibility } from '../../context/AccessibilityContext'
import { Button } from '../common/Button'
import { Logo } from '../common/Logo'

export function ModeChoiceModal() {
  const { ready, chooserOpen, chooseMode, closeChooser, prefs } = useAccessibility()
  const titleId = useId()
  const descId = useId()
  const firstRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (chooserOpen) firstRef.current?.focus()
  }, [chooserOpen])

  useEffect(() => {
    if (!chooserOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && prefs) closeChooser()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [chooserOpen, prefs, closeChooser])

  if (!ready || !chooserOpen) return null

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto" role="presentation">
      <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" />
      <div className="relative flex min-h-dvh items-center justify-center p-4 py-8">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          data-no-speak
          className="w-full max-w-2xl rounded-3xl border border-line bg-surface p-4 shadow-2xl sm:p-8"
        >
          <Logo size={32} />
          <h1 id={titleId} className="mt-3 text-xl font-semibold tracking-tight text-ink sm:mt-4 sm:text-[28px]">
            How would you like to use Transly?
          </h1>
          <p id={descId} className="mt-2 text-sm text-ink-2 sm:text-base">
            Choose once. You can change this later from the accessibility button.
          </p>

          <div className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2">
            <button
              ref={firstRef}
              type="button"
              onClick={() => chooseMode('standard')}
              className="flex gap-3 rounded-2xl border border-line bg-bg p-4 text-left transition duration-150 hover:border-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:block sm:p-5"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft-2 text-brand-ink">
                <Eye size={22} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="mt-0 block text-base font-semibold text-ink sm:mt-3">Standard Mode</span>
                <span className="mt-1 block text-sm text-ink-2 sm:mt-1.5">
                  The usual Transly layout, colours, and controls.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => chooseMode('accessible')}
              className="flex gap-3 rounded-2xl border border-line bg-bg p-4 text-left transition duration-150 hover:border-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:block sm:p-5"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft-2 text-brand-ink">
                <Accessibility size={22} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="mt-0 block text-base font-semibold text-ink sm:mt-3">Accessible Mode</span>
                <span className="mt-1 block text-sm text-ink-2 sm:mt-1.5">
                  Larger text, high contrast, stronger focus, and a page reader for screen and keyboard use.
                </span>
              </span>
            </button>
          </div>

          {prefs && (
            <div className="mt-5 flex justify-end">
              <Button variant="ghost" onClick={closeChooser}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
