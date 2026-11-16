import { useEffect, useRef } from 'react'

/**
 * Elementə `is-visible` sinfi əlavə edir (bir dəfə) — scroll ilə açılan animasiyalar üçün.
 * IntersectionObserver olmayan mühitdə element dərhal görünür.
 */
export function useReveal<T extends HTMLElement>(threshold = 0.18) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible')
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return ref
}
