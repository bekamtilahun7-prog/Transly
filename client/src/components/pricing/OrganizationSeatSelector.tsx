import { Minus, Plus } from 'lucide-react'
import { useLocale } from '../../context/LocaleContext'
import { SEAT_DEFAULTS } from '../../lib/pricingCatalog'

export function OrganizationSeatSelector({
  planId,
  value,
  onChange,
  disabled,
}: {
  planId: 'team_pro' | 'enterprise_premium'
  value: number
  onChange: (n: number) => void
  disabled?: boolean
}) {
  const { t } = useLocale()
  const cfg = SEAT_DEFAULTS[planId]
  const dec = () => onChange(Math.max(cfg.min, value - 1))
  const inc = () => onChange(Math.min(cfg.max, value + 1))

  return (
    <div className="mt-5 rounded-xl border border-line bg-bg-2/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-ink">{t('pricing.members')}</p>
          <p className="text-[11px] text-ink-2">{t('pricing.membersHint', { hint: cfg.hint })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t('pricing.decrease')}
            onClick={dec}
            disabled={disabled || value <= cfg.min}
            className="flex size-8 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:bg-hover disabled:opacity-40"
          >
            <Minus size={14} aria-hidden />
          </button>
          <input
            type="number"
            min={cfg.min}
            max={cfg.max}
            value={value}
            disabled={disabled}
            aria-label={t('pricing.memberCount')}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (!Number.isFinite(n)) return
              onChange(Math.min(cfg.max, Math.max(cfg.min, Math.round(n))))
            }}
            className="h-8 w-14 rounded-lg border border-input-line bg-input text-center text-sm font-semibold text-ink tabular-nums focus:border-focus focus:outline-none focus:ring-2 focus:ring-ring/60"
          />
          <button
            type="button"
            aria-label={t('pricing.increase')}
            onClick={inc}
            disabled={disabled || value >= cfg.max}
            className="flex size-8 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:bg-hover disabled:opacity-40"
          >
            <Plus size={14} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
