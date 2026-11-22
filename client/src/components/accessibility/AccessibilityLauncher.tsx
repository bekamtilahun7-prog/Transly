import { Accessibility } from 'lucide-react'
import { useAccessibility } from '../../context/AccessibilityContext'
import { useLocale } from '../../context/LocaleContext'

export function AccessibilityLauncher({ className = '' }: { className?: string }) {
  const { togglePanel, panelOpen, accessible } = useAccessibility()
  const { t } = useLocale()
  return (
    <button
      type="button"
      onClick={togglePanel}
      aria-label={panelOpen ? t('a11y.close') : t('a11y.open')}
      aria-expanded={panelOpen}
      aria-controls="a11y-panel"
      title={t('a11y.title')}
      className={`inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition duration-150 hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${accessible ? 'border-brand text-brand-ink' : ''} ${className}`}
    >
      <Accessibility size={18} aria-hidden />
    </button>
  )
}
