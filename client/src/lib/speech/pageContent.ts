const SKIP_SEL = '[data-no-speak], [aria-hidden="true"], nav, footer, script, style, svg, noscript, [role="dialog"]'

function visible(el: Element): boolean {
  const s = window.getComputedStyle(el)
  if (s.display === 'none' || s.visibility === 'hidden') return false
  return (el as HTMLElement).offsetParent !== null || s.position === 'fixed'
}

function blockOf(node: Node): Element | null {
  const el = node.parentElement
  if (!el) return null
  return el.closest('h1,h2,h3,h4,h5,h6,p,li,button,a,label,td,th,dt,dd,blockquote,figcaption,legend,[role="alert"],[role="status"],[data-speak-block]')
}

/** Meaningful text on the current page, skipping chrome and decorative nodes. */
export function collectPageSegments(): string[] {
  const root =
    document.querySelector<HTMLElement>('[data-page-content]') ??
    document.querySelector('main') ??
    document.body
  if (!root) return []

  const grouped = new Map<Element, string[]>()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (parent.closest(SKIP_SEL)) return NodeFilter.FILTER_REJECT
      if (!visible(parent)) return NodeFilter.FILTER_REJECT
      const t = node.textContent?.replace(/\s+/g, ' ').trim()
      if (!t || t.length < 2) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })

  let n: Node | null
  while ((n = walker.nextNode())) {
    const block = blockOf(n) ?? n.parentElement
    if (!block) continue
    const t = n.textContent?.replace(/\s+/g, ' ').trim()
    if (!t) continue
    const arr = grouped.get(block) ?? []
    arr.push(t)
    grouped.set(block, arr)
  }

  const out: string[] = []
  grouped.forEach((parts) => {
    const text = parts.join(' ').replace(/\s+/g, ' ').trim()
    if (text.length >= 2) out.push(text)
  })
  return out
}
