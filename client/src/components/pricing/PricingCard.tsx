import { Check, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLocale } from '../../context/LocaleContext'
import { planCopy } from '../../i18n/t'
import {
  formatEtb,
  type BillingPeriod,
  type PlanDef,
  yearlyMonthlyEquivalent,
} from '../../lib/pricingCatalog'
import { buttonClass } from '../common/Button'

export function PricingCard({
  plan,
  period,
  selected,
  busy,
  amount,
  extra,
  onChoose,
}: {
  plan: PlanDef
  period: BillingPeriod
  selected?: boolean
  busy?: boolean
  amount: number
  extra?: ReactNode
  onChoose: () => void
}) {
  const { t, lang } = useLocale()
  const copy = planCopy(lang, plan.id)
  const recommended = Boolean(plan.recommended)
  const yearly = period === 'yearly' && plan.id !== 'free'
  const unitLabel =
    plan.id === 'free'
      ? t('pricing.freeForever')
      : period === 'yearly'
        ? plan.perMember
          ? t('pricing.perMemberYear')
          : t('pricing.perYear')
        : plan.perMember
          ? t('pricing.perMemberMonth')
          : t('pricing.perMonth')

  return (
    <article
      className={`relative flex h-full flex-col rounded-2xl border bg-surface p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-7 ${
        recommended
          ? 'border-orange-400 shadow-orange-500/10 dark:border-orange-500/50'
          : selected
            ? 'border-orange-300 dark:border-orange-500/40'
            : 'border-line'
      }`}
    >
      {recommended && (
        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white">
          <Sparkles size={12} aria-hidden />
          {t('pricing.popular')}
        </span>
      )}

      <h3 className="text-lg font-semibold text-ink">{copy.name}</h3>
      <p className="mt-1 text-sm text-ink-2">{copy.blurb}</p>

      <div className="mt-5 min-h-[4.5rem]">
        <p className="text-3xl font-semibold tracking-tight text-ink tabular-nums">{formatEtb(amount)}</p>
        <p className="mt-1 text-sm text-ink-2">{unitLabel}</p>
        {yearly && (
          <p className="mt-0.5 text-xs text-muted">
            {t(plan.perMember ? 'pricing.billedYearlyMember' : 'pricing.billedYearly', {
              amount: formatEtb(yearlyMonthlyEquivalent(plan.yearlyEtb)),
            })}
          </p>
        )}
      </div>

      {extra}

      <ul className="mt-6 flex-1 space-y-2.5">
        {copy.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-ink-2">
            <Check size={16} className="mt-0.5 shrink-0 text-orange-500" aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={busy}
        onClick={onChoose}
        className={buttonClass(
          recommended ? 'primary' : 'secondary',
          'lg',
          `mt-8 w-full !rounded-xl ${recommended ? '!bg-orange-500 !text-white hover:!bg-orange-600' : ''}`,
        )}
      >
        {busy ? t('pricing.working') : copy.cta}
      </button>
    </article>
  )
}
