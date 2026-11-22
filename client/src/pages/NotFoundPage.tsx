import { Link } from 'react-router-dom'
import { buttonClass } from '../components/common/Button'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-orange-500">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-ink-2">That address is not a Transly page. Check the link, or go back home.</p>
      <Link to="/" className={`${buttonClass('primary')} mt-6`}>
        Back to home
      </Link>
    </div>
  )
}
