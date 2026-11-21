/** Transly paper-plane mark + wordmark. Works on light and dark surfaces. */
export function Logo({ size = 32, className = '', wordmark = true }: { size?: number; className?: string; wordmark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img src="/assets/transly-mark.png" alt="" width={size} height={size} style={{ width: size, height: size }} />
      {wordmark && (
        <span className="font-semibold tracking-tight" style={{ fontSize: Math.round(size * 0.66) }}>
          Transly
        </span>
      )}
      {!wordmark && <span className="sr-only">Transly</span>}
    </span>
  )
}
