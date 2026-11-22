import { LANGUAGES } from '../../lib/constants'
import { useLocale } from '../../context/LocaleContext'

const SHORT: Record<string, string> = { om: 'Or', am: 'Am', en: 'En' }

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useLocale()

  return (
    <div
      role="group"
      aria-label={t('nav.language')}
      className={`inline-flex rounded-full border border-line bg-surface p-0.5 ${compact ? '' : 'shadow-sm'}`}
    >
      {LANGUAGES.map((item) => {
        const on = lang === item.code
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLang(item.code)}
            aria-pressed={on}
            title={t(`langs.${item.code}`)}
            className={`min-h-8 min-w-9 rounded-full px-2 text-xs font-semibold transition duration-150 ${
              on ? 'bg-orange-500 text-white' : 'text-ink-2 hover:bg-hover hover:text-ink'
            }`}
          >
            {SHORT[item.code]}
          </button>
        )
      })}
    </div>
  )
}
