import { useEffect, useState } from 'react'

/** Görünən bölmənin id-sini qaytarır (naviqasiyada aktiv linki vurğulamaq üçün). */
export function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? '')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const visible = new Map<string, number>()
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.set(e.target.id, e.intersectionRatio)
          else visible.delete(e.target.id)
        })
        if (visible.size) {
          const best = [...visible.entries()].sort((a, b) => b[1] - a[1])[0][0]
          setActive(best)
        }
      },
      { rootMargin: '-35% 0px -45% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join('|')])

  return active
}
