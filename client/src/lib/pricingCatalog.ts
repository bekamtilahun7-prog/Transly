/** Source of truth for displayed Transly prices. Checkout must re-validate on a backend when one exists. */

export type BillingPeriod = 'monthly' | 'yearly'
export type PricingCategory = 'individual' | 'organization'
export type PlanId = 'free' | 'pro' | 'premium' | 'team_pro' | 'enterprise_premium'

export const CURRENCY = 'ETB' as const
export const ANNUAL_DISCOUNT_PERCENT = 10
export const ORG_MARKUP_PERCENT = 30

/**
 * Free-file allowance. Reset policy is not assumed: the backend must define
 * whether this is lifetime or periodic. The UI only states the count.
 */
export const FREE_ALLOWANCE = {
  editFiles: 3,
  downloadFiles: 3,
  reset: 'unspecified' as const,
}

/** Proposed org seat ranges — defaults only, not subscription architecture. */
export const SEAT_DEFAULTS = {
  team_pro: { min: 5, max: 25, default: 5, hint: '5–25' },
  enterprise_premium: { min: 25, max: 500, default: 25, hint: '25+' },
} as const

export const ORG_ROLES = ['owner', 'administrator', 'editor', 'viewer'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

export const DOC_VISIBILITY = ['private', 'team_shared', 'organization'] as const
export type DocVisibility = (typeof DOC_VISIBILITY)[number]

export interface PlanDef {
  id: PlanId
  category: PricingCategory
  name: string
  blurb: string
  monthlyEtb: number
  yearlyEtb: number
  perMember: boolean
  recommended?: boolean
  cta: string
  features: string[]
  seatKey?: keyof typeof SEAT_DEFAULTS
}

export const PLANS: PlanDef[] = [
  {
    id: 'free',
    category: 'individual',
    name: 'Free',
    blurb: 'Free forever.',
    monthlyEtb: 0,
    yearlyEtb: 0,
    perMember: false,
    cta: 'Get Started',
    features: [
      `Edit up to ${FREE_ALLOWANCE.editFiles} files.`,
      `Download up to ${FREE_ALLOWANCE.downloadFiles} files.`,
      'Access to basic translation functionality.',
      'Basic document management.',
      'Access to essential Transly features.',
    ],
  },
  {
    id: 'pro',
    category: 'individual',
    name: 'Pro',
    blurb: 'For regular document work.',
    monthlyEtb: 299,
    yearlyEtb: 3229,
    perMember: false,
    recommended: true,
    cta: 'Choose Pro',
    features: [
      'Everything included in Free.',
      'Higher document processing limits.',
      'Advanced OCR capabilities.',
      'Advanced document editing.',
      'Increased download allowance.',
      'Priority document processing.',
      'Enhanced translation capabilities.',
    ],
  },
  {
    id: 'premium',
    category: 'individual',
    name: 'Premium',
    blurb: 'Highest individual limits.',
    monthlyEtb: 799,
    yearlyEtb: 8629,
    perMember: false,
    cta: 'Choose Premium',
    features: [
      'Everything included in Pro.',
      'Highest document processing limits.',
      'Advanced document management.',
      'Enhanced OCR capabilities.',
      'Premium translation capabilities.',
      'Priority support.',
      'Access to premium functionality.',
    ],
  },
  {
    id: 'team_pro',
    category: 'organization',
    name: 'Team Pro',
    blurb: 'Shared workspace for small teams.',
    monthlyEtb: 389,
    yearlyEtb: 4198,
    perMember: true,
    recommended: true,
    cta: 'Choose Team Pro',
    seatKey: 'team_pro',
    features: [
      'Everything included in Individual Pro.',
      'Shared organization workspace.',
      'Team document management.',
      'Member invitations and removal.',
      'Team administrator controls.',
      'Shared document access.',
      'Organization usage dashboard.',
      'Centralized subscription management.',
    ],
  },
  {
    id: 'enterprise_premium',
    category: 'organization',
    name: 'Enterprise Premium',
    blurb: 'For larger organizations.',
    monthlyEtb: 1039,
    yearlyEtb: 11218,
    perMember: true,
    cta: 'Choose Enterprise',
    seatKey: 'enterprise_premium',
    features: [
      'Everything included in Team Pro.',
      'Advanced organization management.',
      'Multiple administrators.',
      'Customizable member permissions.',
      'Organization-wide document management.',
      'Advanced usage analytics.',
      'Centralized billing.',
      'Priority support.',
      'Audit logs and access controls, where supported.',
      'Scalable member management.',
    ],
  },
]

export function planById(id: PlanId): PlanDef {
  const p = PLANS.find((x) => x.id === id)
  if (!p) throw new Error(`Unknown plan: ${id}`)
  return p
}

export function plansFor(category: PricingCategory): PlanDef[] {
  return PLANS.filter((p) => p.category === category)
}

export function unitPrice(plan: PlanDef, period: BillingPeriod): number {
  return period === 'yearly' ? plan.yearlyEtb : plan.monthlyEtb
}

export function lineTotal(plan: PlanDef, period: BillingPeriod, seats: number): number {
  const n = plan.perMember ? Math.max(1, seats) : 1
  return unitPrice(plan, period) * n
}

export function yearlyMonthlyEquivalent(yearlyEtb: number): number {
  return Math.round(yearlyEtb / 12)
}

export function formatEtb(amount: number): string {
  return `${new Intl.NumberFormat('en-US').format(amount)} ETB`
}

export function priceCaption(plan: PlanDef, period: BillingPeriod): string {
  if (plan.id === 'free') return 'Free forever.'
  if (period === 'yearly') {
    return plan.perMember ? 'per member / year' : 'per year'
  }
  return plan.perMember ? 'per member / month' : 'per month'
}
