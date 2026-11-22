import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AccessibilityLauncher } from '../components/accessibility/AccessibilityLauncher'
import { Alert } from '../components/common/Alert'
import { buttonClass } from '../components/common/Button'
import { LanguageSwitcher } from '../components/common/LanguageSwitcher'
import { Logo } from '../components/common/Logo'
import { ThemeToggle } from '../components/common/ThemeToggle'
import { useLocale } from '../context/LocaleContext'
import { useSubscription } from '../hooks/useSubscription'
import { planCopy } from '../i18n/t'
import { formatEtb, planById } from '../lib/pricingCatalog'
import { commitSelection } from '../lib/subscription'

export default function CheckoutPage() {
  const { selection } = useSubscription()
  const { t, lang } = useLocale()
  const nav = useNavigate()

  if (!selection || selection.status === 'free') {
    return (
      <CheckoutShell>
        <Alert tone="info" title={t('checkout.none')}>
          {t('checkout.noneBody')}
        </Alert>
        <Link to="/onboarding" className={buttonClass('primary', 'md', 'mt-6')}>
          {t('checkout.viewPlans')}
        </Link>
      </CheckoutShell>
    )
  }

  const plan = planById(selection.planId)
  const copy = planCopy(lang, plan.id)
  const periodLabel = t(`checkout.${selection.billingPeriod === 'yearly' ? 'yearly' : 'monthly'}`)

  return (
    <CheckoutShell>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">{t('checkout.title')}</h1>
      <p className="mt-2 text-sm text-ink-2">{t('checkout.sub')}</p>

      <div className="mt-8 rounded-2xl border border-line bg-surface p-6 text-left">
        <dl className="space-y-3 text-sm">
          <Row label={t('checkout.plan')} value={copy.name} />
          <Row label={t('checkout.billing')} value={periodLabel} />
          {plan.perMember && <Row label={t('checkout.seats')} value={String(selection.seats)} />}
          <Row label={t('checkout.currency')} value={selection.currency} />
          <Row label={t('checkout.amount')} value={formatEtb(selection.amountEtb)} strong />
          <Row label={t('list.status')} value={t('checkout.pending')} />
        </dl>
      </div>

      <div className="mt-5 text-left">
        <Alert tone="warn" title={t('checkout.payOff')}>
          {t('checkout.payOffBody')}
        </Alert>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link to="/onboarding" className={buttonClass('secondary', 'md', 'flex-1')}>
          {t('checkout.change')}
        </Link>
        <button
          type="button"
          disabled
          title={t('checkout.payOff')}
          className={buttonClass('primary', 'md', 'flex-1 !bg-orange-500 !text-white opacity-60')}
        >
          {t('checkout.pay', { amount: formatEtb(selection.amountEtb) })}
        </button>
      </div>

      <button
        type="button"
        className="mt-5 text-sm font-medium text-brand-ink hover:underline"
        onClick={() => {
          commitSelection('free', selection.billingPeriod, 1)
          nav('/dashboard', { replace: true })
        }}
      >
        {t('checkout.continueFree')}
      </button>
    </CheckoutShell>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
      <dt className="text-ink-2">{label}</dt>
      <dd className={strong ? 'text-base font-semibold tabular-nums text-ink' : 'text-ink'}>{value}</dd>
    </div>
  )
}

function CheckoutShell({ children }: { children: ReactNode }) {
  const { t } = useLocale()
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="text-ink" aria-label={t('nav.home')}>
          <Logo size={32} />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <AccessibilityLauncher />
          <ThemeToggle />
        </div>
      </header>
      <main id="main" data-page-content className="mx-auto w-full max-w-lg px-5 pb-16 text-center">{children}</main>
      <p className="pb-8 text-center">
        <Link to="/onboarding" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft size={16} aria-hidden /> {t('checkout.backPlans')}
        </Link>
      </p>
    </div>
  )
}
