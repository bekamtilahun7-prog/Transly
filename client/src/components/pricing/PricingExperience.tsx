import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { SEAT_DEFAULTS, planById, type PlanId } from '../../lib/pricingCatalog'
import { SubscriptionSelectionHandler, rememberIntent, takeIntent } from '../../lib/subscription'
import { useSubscription } from '../../hooks/useSubscription'
import { BillingPeriodSelector } from './BillingPeriodSelector'
import { IndividualPricingSection } from './IndividualPricingSection'
import { OrganizationPricingSection } from './OrganizationPricingSection'
import { useLocale } from '../../context/LocaleContext'
import { PricingCategorySelector } from './PricingCategorySelector'

export function PricingExperience({
  variant,
}: {
  variant: 'section' | 'page' | 'onboarding'
}) {
  const { user } = useAuth()
  const { t } = useLocale()
  const nav = useNavigate()
  const { selection, billingPeriod, category, setPeriod, setCategory } = useSubscription()
  const [seats, setSeats] = useState({
    team_pro: SEAT_DEFAULTS.team_pro.default,
    enterprise_premium: SEAT_DEFAULTS.enterprise_premium.default,
  })
  const [busyId, setBusyId] = useState<PlanId | null>(null)

  useEffect(() => {
    if (variant !== 'onboarding') return
    const intent = takeIntent()
    if (!intent) return
    setPeriod(intent.billingPeriod)
    setCategory(planById(intent.planId).category)
    if (intent.planId === 'team_pro' || intent.planId === 'enterprise_premium') {
      setSeats((s) => ({ ...s, [intent.planId]: intent.seats }))
    }
  }, [variant, setCategory, setPeriod])

  async function onChoose(planId: PlanId, memberCount: number) {
    if (busyId) return
    setBusyId(planId)
    try {
      if (!user) {
        rememberIntent(planId, billingPeriod, memberCount)
        nav('/register')
        return
      }
      const next = SubscriptionSelectionHandler.commit(planId, billingPeriod, memberCount)
      if (next.status === 'free') nav('/dashboard', { replace: variant === 'onboarding' })
      else nav('/checkout')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={variant === 'section' ? 'pt-8' : ''}>
      <header className="mx-auto max-w-2xl text-center">
        <h2 className={`${variant === 'section' ? 'text-4xl sm:text-5xl' : 'text-4xl sm:text-[52px]'} font-semibold tracking-tight text-ink`}>
          {t('pricing.title')}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-2 sm:text-base">{t('pricing.sub')}</p>
      </header>

      <div className="mt-8 flex flex-col items-center gap-4">
        <PricingCategorySelector value={category} onChange={setCategory} />
        <BillingPeriodSelector value={billingPeriod} onChange={setPeriod} />
      </div>

      <div className="mt-10">
        {category === 'individual' ? (
          <IndividualPricingSection
            period={billingPeriod}
            selectedPlan={selection?.planId}
            busyId={busyId}
            onChoose={onChoose}
          />
        ) : (
          <OrganizationPricingSection
            period={billingPeriod}
            seats={seats}
            onSeatsChange={(plan, n) => setSeats((s) => ({ ...s, [plan]: n }))}
            selectedPlan={selection?.planId}
            busyId={busyId}
            onChoose={onChoose}
          />
        )}
      </div>

      <p className="mx-auto mt-8 max-w-xl text-center text-xs text-muted">
        {t('pricing.note')}
      </p>
    </div>
  )
}
