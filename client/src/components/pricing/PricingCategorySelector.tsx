import { useLocale } from '../../context/LocaleContext'
import type { PricingCategory } from '../../lib/pricingCatalog'

export function PricingCategorySelector({
  value,
  onChange,
}: {
  value: PricingCategory
  onChange: (v: PricingCategory) => void
}) {
  const { t } = useLocale()
  const options: { id: PricingCategory; label: string }[] = [
    { id: 'individual', label: t('pricing.individual') },
    { id: 'organization', label: t('pricing.team') },
  ]

  return (
    <div role="tablist" aria-label={t('pricing.category')} className="inline-flex rounded-full border border-line bg-bg-2 p-1">
      {options.map((opt) => {
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
