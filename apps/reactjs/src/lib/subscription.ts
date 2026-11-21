import {
  type BillingPeriod,
  type PlanId,
  type PricingCategory,
  FREE_ALLOWANCE,
  lineTotal,
  planById,
} from './pricingCatalog'

const KEY = 'transly.subscription.v1'
const INTENT_KEY = 'transly.subscription.intent'
const PERIOD_KEY = 'transly.billingPeriod'
const CATEGORY_KEY = 'transly.pricingCategory'
const DOWNLOAD_KEY = 'transly.free.downloads.v1'

export type SubscriptionStatus = 'free' | 'pending_payment'

export interface SubscriptionSelection {
  planId: PlanId
  category: PricingCategory
  billingPeriod: BillingPeriod
  seats: number
  amountEtb: number
  currency: 'ETB'
  status: SubscriptionStatus
  selectedAt: string
}

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((fn) => fn())
}

function readJson<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null
  } catch {
    return null
  }
}

export function getSelection(): SubscriptionSelection | null {
  return readJson<SubscriptionSelection>(KEY)
}

export function hasCompletedPlanChoice(): boolean {
  return getSelection() != null
}

/** Paid plans are never treated as active on the client. Payment must be verified by a backend. */
export function hasVerifiedPaidAccess(): boolean {
  return false
}

export function getBillingPeriod(): BillingPeriod {
  const stored = localStorage.getItem(PERIOD_KEY)
  if (stored === 'monthly' || stored === 'yearly') return stored
  return getSelection()?.billingPeriod ?? 'monthly'
}

export function setBillingPeriod(period: BillingPeriod) {
  localStorage.setItem(PERIOD_KEY, period)
  emit()
}

export function getPricingCategory(): PricingCategory {
  const stored = localStorage.getItem(CATEGORY_KEY)
  if (stored === 'individual' || stored === 'organization') return stored
  return getSelection()?.category ?? 'individual'
}

export function setPricingCategory(category: PricingCategory) {
  localStorage.setItem(CATEGORY_KEY, category)
  emit()
}

export function rememberIntent(planId: PlanId, billingPeriod: BillingPeriod, seats: number) {
  localStorage.setItem(INTENT_KEY, JSON.stringify({ planId, billingPeriod, seats }))
}

export function takeIntent(): { planId: PlanId; billingPeriod: BillingPeriod; seats: number } | null {
  const v = readJson<{ planId: PlanId; billingPeriod: BillingPeriod; seats: number }>(INTENT_KEY)
  if (v) localStorage.removeItem(INTENT_KEY)
  return v
}

let inflight: string | null = null

export function commitSelection(planId: PlanId, billingPeriod: BillingPeriod, seats: number): SubscriptionSelection {
  const plan = planById(planId)
  const key = `${planId}:${billingPeriod}:${plan.perMember ? seats : 1}`
  if (inflight === key) {
    const current = getSelection()
    if (current) return current
  }
  inflight = key
  const amountEtb = lineTotal(plan, billingPeriod, seats)
  const next: SubscriptionSelection = {
    planId,
    category: plan.category,
    billingPeriod,
    seats: plan.perMember ? seats : 1,
    amountEtb,
    currency: 'ETB',
    status: planId === 'free' ? 'free' : 'pending_payment',
    selectedAt: new Date().toISOString(),
  }
  localStorage.setItem(KEY, JSON.stringify(next))
  localStorage.setItem(PERIOD_KEY, billingPeriod)
  localStorage.setItem(CATEGORY_KEY, plan.category)
  inflight = null
  emit()
  return next
}

export function subscribeToSelection(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function isSeedDocumentId(id: string): boolean {
  return id.startsWith('mock-seed-')
}

export function countsTowardFreeAllowance(documentId: string): boolean {
  return !isSeedDocumentId(documentId)
}

export function freeEditLimit(): number {
  return FREE_ALLOWANCE.editFiles
}

export function freeDownloadLimit(): number {
  return FREE_ALLOWANCE.downloadFiles
}

function readDownloads(): string[] {
  const v = readJson<string[]>(DOWNLOAD_KEY)
  return Array.isArray(v) ? v : []
}

export function canDownloadIssued(verificationId: string): { ok: boolean; used: number; limit: number } {
  if (hasVerifiedPaidAccess()) return { ok: true, used: 0, limit: freeDownloadLimit() }
  const ids = readDownloads()
  const used = ids.length
  const limit = freeDownloadLimit()
  if (ids.includes(verificationId)) return { ok: true, used, limit }
  return { ok: used < limit, used, limit }
}

export function recordFreeDownload(verificationId: string): { ok: boolean; used: number; limit: number } {
  const check = canDownloadIssued(verificationId)
  if (!check.ok) return check
  const ids = readDownloads()
  if (!ids.includes(verificationId)) {
    ids.push(verificationId)
    localStorage.setItem(DOWNLOAD_KEY, JSON.stringify(ids))
  }
  return { ok: true, used: ids.length, limit: freeDownloadLimit() }
}

export function afterAuthPath(): string {
  return '/onboarding'
}

export function countableDocumentCount(ids: string[]): number {
  return ids.filter(countsTowardFreeAllowance).length
}

/** Named handler used by the pricing UI so plan commits stay in one place. */
export const SubscriptionSelectionHandler = {
  commit: commitSelection,
  rememberIntent,
}
