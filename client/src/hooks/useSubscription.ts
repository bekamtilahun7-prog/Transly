import { useCallback, useSyncExternalStore } from 'react'
import type { BillingPeriod, PricingCategory } from '../lib/pricingCatalog'
import {
  getBillingPeriod,
  getPricingCategory,
  getSelection,
  setBillingPeriod,
  setPricingCategory,
  subscribeToSelection,
  type SubscriptionSelection,
} from '../lib/subscription'

function snapshot() {
  return {
    selection: getSelection(),
    billingPeriod: getBillingPeriod(),
    category: getPricingCategory(),
  }
}

let cache = snapshot()
function getSnapshot() {
  const next = snapshot()
  if (
    cache.billingPeriod === next.billingPeriod &&
    cache.category === next.category &&
    JSON.stringify(cache.selection) === JSON.stringify(next.selection)
  ) {
    return cache
  }
  cache = next
  return cache
}

export function useSubscription(): {
  selection: SubscriptionSelection | null
  billingPeriod: BillingPeriod
  category: PricingCategory
  setPeriod: (p: BillingPeriod) => void
  setCategory: (c: PricingCategory) => void
} {
  const state = useSyncExternalStore(subscribeToSelection, getSnapshot, getSnapshot)
  const setPeriod = useCallback((p: BillingPeriod) => setBillingPeriod(p), [])
  const setCategory = useCallback((c: PricingCategory) => setPricingCategory(c), [])
  return { ...state, setPeriod, setCategory }
}
