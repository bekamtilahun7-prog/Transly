import { Moon, Sun } from 'lucide-react'
import { useLocale } from '../../context/LocaleContext'
import { useTheme } from '../../context/ThemeContext'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const { t } = useLocale()
  const dark = theme === 'dark'
  const label = dark ? t('ui.light') : t('ui.dark')
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition duration-150 hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      {dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  )
}
