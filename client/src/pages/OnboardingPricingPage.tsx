import { Link } from 'react-router-dom'
import { Logo } from '../components/common/Logo'
import { ThemeToggle } from '../components/common/ThemeToggle'
import { PricingExperience } from '../components/pricing/PricingExperience'

/** Post-login plan picker, Claude-style: logo header + pricing, no app chrome. */
export default function OnboardingPricingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-16 size-[28rem] rounded-full bg-orange-200/50 blur-3xl dark:bg-orange-500/10"
      />
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="text-ink" aria-label="Transly home">
          <Logo size={32} />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>
      <main className="relative z-10 px-5 pb-16 pt-6 sm:px-8">
        <PricingExperience variant="onboarding" />
      </main>
    </div>
  )
}
