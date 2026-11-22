import { useLocale } from '../../context/LocaleContext'

export function SkipLink() {
  const { t } = useLocale()
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-on-primary"
    >
      {t('ui.skip')}
    </a>
  )
}
