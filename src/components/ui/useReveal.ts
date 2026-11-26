import { useEffect } from 'react'

/**
 * Adds `.is-in` to [data-reveal] elements as they scroll into view. A MutationObserver picks up
 * elements rendered later (after async data loads or route changes).
 */
export function useReveal() {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        }),
      { rootMargin: '0px 0px -6% 0px', threshold: 0.04 },
    )
    const scan = (root: ParentNode) =>
      root.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)').forEach((el) => io.observe(el))
    scan(document)
    const mo = new MutationObserver(() => scan(document))
    mo.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true })
    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [])
}
