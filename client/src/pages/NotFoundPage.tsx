import { Link } from 'react-router-dom'
import { buttonClass } from '../components/common/Button'
import { useLocale } from '../context/LocaleContext'

export default function NotFoundPage() {
  const { t } = useLocale()
  return (
    <div className="mx-auto max-w-md text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-orange-500">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">{t('ui.notFound')}</h1>
      <p className="mt-2 text-sm text-ink-2">{t('ui.notFoundBody')}</p>
      <Link to="/" className={`${buttonClass('primary')} mt-6`}>
        {t('ui.backHome')}
      </Link>
    </div>
  )
}
