import { Link } from 'react-router-dom'
import { FREE_ALLOWANCE } from '../../lib/pricingCatalog'
import { hasVerifiedPaidAccess } from '../../lib/subscription'

export function FreeAllowanceNotice({ usedEdits }: { usedEdits?: number }) {
  if (hasVerifiedPaidAccess()) return null
  const limit = FREE_ALLOWANCE.editFiles
  const remaining = usedEdits == null ? null : Math.max(0, limit - usedEdits)
  return (
    <p className="rounded-xl border border-line bg-bg-2 px-3.5 py-2.5 text-sm text-ink-2">
      Free plan: edit and download up to {limit} files.
      {remaining != null && (
        <>
          {' '}
          <span className="font-medium text-ink">
            {remaining} of {limit} edit slots left.
          </span>
        </>
      )}{' '}
      <Link to="/onboarding" className="font-medium text-brand-ink hover:underline">
        View plans
      </Link>
    </p>
  )
}
