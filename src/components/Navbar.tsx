import { useEffect, useRef, useState } from 'react'
import { Logo } from './Logo'
import { IconClose, IconMenu } from './Icons'
import { useScrollSpy } from '../hooks/useScrollSpy'
import './Navbar.css'

const links = [
  { id: 'ana', label: 'Ana səhifə' },
  { id: 'haqqimizda', label: 'Haqqımızda' },
  { id: 'elaqe', label: 'Əlaqə' },
] as const

const sectionIds = ['ana', 'haqqimizda', 'gozlentiler', 'tezlikle', 'elaqe']

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const active = useScrollSpy(sectionIds)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Mobil menyu: scroll kilidi, Esc ilə bağlama, geniş ekranda avtomatik bağlama
  useEffect(() => {
    document.body.classList.toggle('is-locked', open)
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    const mq = window.matchMedia('(min-width: 900px)')
    const onMq = () => mq.matches && setOpen(false)
    // Menyu açıq ikən arxadakı məzmun Tab ilə əlçatan olmasın (fokus görünməz hissəyə keçməsin)
    const behind = document.querySelectorAll<HTMLElement>('main, footer')
    behind.forEach((el) => el.setAttribute('inert', ''))
    window.addEventListener('keydown', onKey)
    mq.addEventListener('change', onMq)
    return () => {
      behind.forEach((el) => el.removeAttribute('inert'))
      document.body.classList.remove('is-locked')
      window.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onMq)
    }
  }, [open])

  const close = () => setOpen(false)
  const activeNav = active === 'gozlentiler' || active === 'tezlikle' ? 'haqqimizda' : active

  return (
    <header className={`nav ${scrolled || open ? 'nav--solid' : ''} ${open ? 'nav--open' : ''}`}>
      <div className="container nav__inner">
        <Logo />

        <nav className="nav__links" aria-label="Əsas naviqasiya">
          <ul>
            {links.map((l) => (
              <li key={l.id}>
                <a
                  href={`#${l.id}`}
                  className={activeNav === l.id ? 'is-active' : undefined}
                  aria-current={activeNav === l.id ? 'true' : undefined}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a className="btn btn--primary btn--sm nav__cta" href="#elaqe">
          Əlaqə
        </a>

        <button
          ref={toggleRef}
          type="button"
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Menyunu bağla' : 'Menyunu aç'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <IconClose /> : <IconMenu />}
        </button>
      </div>

      <div id="mobile-menu" className="nav__panel" hidden={!open}>
        <nav aria-label="Mobil naviqasiya">
          <ul>
            {links.map((l, i) => (
              <li key={l.id} style={{ ['--i' as string]: i }}>
                <a href={`#${l.id}`} onClick={close}>
                  <span className="nav__num">0{i + 1}</span>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <a className="btn btn--primary" href="#elaqe" onClick={close}>
          Əlaqə
        </a>
      </div>
    </header>
  )
}
