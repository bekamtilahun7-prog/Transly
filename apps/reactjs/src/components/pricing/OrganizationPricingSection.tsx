import { formatEtb, lineTotal, plansFor, unitPrice, type BillingPeriod, type PlanId } from '../../lib/pricingCatalog'
import { OrganizationSeatSelector } from './OrganizationSeatSelector'
import { PricingCard } from './PricingCard'

export function OrganizationPricingSection({
  period,
  seats,
  onSeatsChange,
  selectedPlan,
  busyId,
  onChoose,
}: {
  period: BillingPeriod
  seats: { team_pro: number; enterprise_premium: number }
  onSeatsChange: (plan: 'team_pro' | 'enterprise_premium', n: number) => void
  selectedPlan?: PlanId | null
  busyId?: PlanId | null
  onChoose: (id: PlanId, seats: number) => void
}) {
  const plans = plansFor('organization')
  return (
    <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2">
      {plans.map((plan) => {
        const seatKey = plan.seatKey ?? 'team_pro'
        const n = seats[seatKey]
        const total = lineTotal(plan, period, n)
        return (
          <PricingCard
            key={plan.id}
            plan={plan}
            period={period}
            amount={unitPrice(plan, period)}
            selected={selectedPlan === plan.id}
            busy={busyId === plan.id}
            extra={
              <>
                <OrganizationSeatSelector
                  planId={seatKey}
                  value={n}
                  onChange={(v) => onSeatsChange(seatKey, v)}
                  disabled={busyId === plan.id}
                />
                <p className="mt-3 text-sm text-ink">
                  Total{' '}
                  <span className="font-semibold tabular-nums">{formatEtb(total)}</span>
                  <span className="text-ink-2">
                    {' '}
                    for {n} {n === 1 ? 'member' : 'members'}
                  </span>
                </p>
              </>
            }
            onChoose={() => onChoose(plan.id, n)}
          />
        )
      })}
    </div>
  )
}
