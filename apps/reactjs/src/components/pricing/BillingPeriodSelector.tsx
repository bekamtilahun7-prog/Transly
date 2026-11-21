import { ANNUAL_DISCOUNT_PERCENT, type BillingPeriod } from '../../lib/pricingCatalog'

export function BillingPeriodSelector({
  value,
  onChange,
}: {
  value: BillingPeriod
  onChange: (v: BillingPeriod) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Billing period"
      className="inline-flex items-center rounded-full border border-line bg-bg-2 p-1"
    >
      {(['monthly', 'yearly'] as const).map((period) => {
        const active = value === period
        return (
          <button
            key={period}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(period)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium capitalize transition duration-200 ${
              active ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {period}
            {period === 'yearly' && (
              <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                Save {ANNUAL_DISCOUNT_PERCENT}%
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
