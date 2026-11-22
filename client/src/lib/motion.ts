import { useEffect, useState } from 'react'

function motionAllowed() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  if (document.documentElement.classList.contains('a11y-mode')) return false
  return true
}

/** False when the user prefers reduced motion or Accessible Mode is on. */
export function useMotionOk() {
  const [ok, setOk] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setOk(motionAllowed())
    sync()
    mq.addEventListener('change', sync)
    const obs = new MutationObserver(sync)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => {
      mq.removeEventListener('change', sync)
      obs.disconnect()
    }
  }, [])

  return ok
}

export function useLoopIndex(length: number, ms: number) {
  const ok = useMotionOk()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!ok || length < 2) return
    const id = window.setInterval(() => setIndex((n) => (n + 1) % length), ms)
    return () => window.clearInterval(id)
  }, [ok, length, ms])

  return ok ? index : 0
}
