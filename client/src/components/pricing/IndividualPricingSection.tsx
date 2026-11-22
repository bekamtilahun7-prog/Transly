import { lineTotal, plansFor, type BillingPeriod, type PlanId } from '../../lib/pricingCatalog'
import { PricingCard } from './PricingCard'

export function IndividualPricingSection({
  period,
  selectedPlan,
  busyId,
  onChoose,
}: {
  period: BillingPeriod
  selectedPlan?: PlanId | null
  busyId?: PlanId | null
  onChoose: (id: PlanId, seats: number) => void
}) {
  const plans = plansFor('individual')
  return (
    <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
      {plans.map((plan) => (
        <PricingCard
          key={plan.id}
          plan={plan}
          period={period}
          amount={lineTotal(plan, period, 1)}
          selected={selectedPlan === plan.id}
          busy={busyId === plan.id}
          onChoose={() => onChoose(plan.id, 1)}
        />
      ))}
    </div>
  )
}
