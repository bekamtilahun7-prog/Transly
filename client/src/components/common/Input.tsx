import { useId, type ReactElement, type ReactNode, cloneElement } from 'react'

export const inputClass =
  'block w-full min-h-11 rounded-xl border border-input-line bg-input px-3 text-sm text-ink placeholder:text-muted ' +
  'transition duration-150 focus:outline-none focus:border-focus focus:ring-2 focus:ring-ring/60 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed'

/** Label + control + hint/error, wired together for screen readers. */
export function Field({
  label,
  icon,
  hint,
  error,
  children,
}: {
  label: string
  icon?: ReactNode
  hint?: ReactNode
  error?: string | null
  /** A single input/select/textarea element. */
  children: ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>
}) {
  const id = useId()
  const noteId = `${id}-note`
  const note = error ?? hint
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-2 text-sm font-medium text-ink">
        {icon}
        {label}
      </label>
      {cloneElement(children, {
        id,
        'aria-describedby': note ? noteId : undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {note && (
        <p id={noteId} className={`mt-1.5 text-xs ${error ? 'text-danger' : 'text-ink-2'}`}>
          {note}
        </p>
      )}
    </div>
  )
}
