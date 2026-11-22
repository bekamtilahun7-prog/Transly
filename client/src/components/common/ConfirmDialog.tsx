import { useEffect, useRef, type ReactNode } from 'react'
import { useLocale } from '../../context/LocaleContext'
import { Button, type ButtonVariant } from './Button'

/** Modal confirmation built on <dialog>, so focus trapping and Escape come from the browser. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  confirmVariant = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel: string
  confirmVariant?: ButtonVariant
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useLocale()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onCancel()
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-elevated p-0 text-ink shadow-2xl backdrop:bg-black/50"
    >
      <div className="p-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {children && <div className="mt-2 text-sm text-ink-2">{children}</div>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {t('a11y.cancel')}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
