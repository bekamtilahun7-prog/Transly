import type { PricingCategory } from '../../lib/pricingCatalog'

const OPTIONS: { id: PricingCategory; label: string }[] = [
  { id: 'individual', label: 'Individual' },
  { id: 'organization', label: 'Team & Enterprise' },
]

export function PricingCategorySelector({
  value,
  onChange,
}: {
  value: PricingCategory
  onChange: (v: PricingCategory) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Pricing category"
      className="inline-flex rounded-full border border-line bg-bg-2 p-1"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition duration-200 sm:px-5 ${
              active ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
