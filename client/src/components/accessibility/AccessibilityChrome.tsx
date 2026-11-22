import { Accessibility } from 'lucide-react'
import { useAccessibility } from '../../context/AccessibilityContext'
import { useLocale } from '../../context/LocaleContext'
import { AccessibilityPanel } from './AccessibilityPanel'
import { ModeChoiceModal } from './ModeChoiceModal'
import { SkipLink } from './SkipLink'

/** Global skip link, first-visit mode chooser, and floating accessibility controls. */
export function AccessibilityChrome() {
  const { togglePanel, panelOpen, accessible } = useAccessibility()
  const { t } = useLocale()
  return (
    <>
      <SkipLink />
      <ModeChoiceModal />
      <div className="no-print" data-no-speak>
        <button
          type="button"
          onClick={togglePanel}
          aria-label={panelOpen ? t('a11y.close') : t('a11y.open')}
          aria-expanded={panelOpen}
          aria-controls="a11y-panel"
          className={`fixed bottom-4 right-4 z-[60] flex size-12 items-center justify-center rounded-full border border-line bg-primary text-on-primary shadow-lg shadow-orange-500/30 transition duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:bottom-6 sm:right-6 ${accessible ? 'ring-2 ring-brand-soft-2' : ''}`}
        >
          <Accessibility size={22} aria-hidden />
        </button>
        <AccessibilityPanel />
      </div>
    </>
  )
}
