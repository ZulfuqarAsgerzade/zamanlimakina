import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { useI18n } from '../../i18n/I18nContext.tsx'
import { generalMessage } from '../../lib/whatsapp.ts'
import { SITE_URL } from '../../lib/head.ts'
import type { RouteKey } from '../../lib/routes.ts'
import type { DictKey } from '../../i18n/az.ts'
import { IconClose, IconMenu, IconSearch } from '../ui/Icons.tsx'
import { WhatsAppButton } from '../ui/WhatsAppButton.tsx'
import { LanguageSwitcher } from './LanguageSwitcher.tsx'
import { Wordmark } from './Logo.tsx'

export const NAV: Array<{ route: RouteKey; key: DictKey }> = [
  { route: 'home', key: 'nav.home' },
  { route: 'generators', key: 'nav.generators' },
  { route: 'brands', key: 'nav.brands' },
  { route: 'parts', key: 'nav.parts' },
  { route: 'services', key: 'nav.services' },
  { route: 'about', key: 'nav.about' },
  { route: 'contact', key: 'nav.contact' },
]

export function Header() {
  const { t, path, locale } = useI18n()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [q, setQ] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setOpen(false)
    setSearching(false)
  }, [pathname])
  useEffect(() => {
    document.body.classList.toggle('is-locked', open)
    return () => document.body.classList.remove('is-locked')
  }, [open])
  useEffect(() => {
    if (searching) searchRef.current?.focus()
  }, [searching])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setSearching(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const v = q.trim()
    if (v) navigate(`${path('search')}?q=${encodeURIComponent(v)}`)
  }
  const waMessage = generalMessage(locale, `${SITE_URL}${pathname}`)

  return (
    <header className="header">
      <div className="container header__bar">
        <Wordmark />
        <nav className="nav" aria-label={t('nav.main')}>
          {NAV.map((n) => (
            <NavLink key={n.route} to={path(n.route)} end={n.route === 'home'} className="nav__link">
              {t(n.key)}
            </NavLink>
          ))}
        </nav>
        <div className="header__tools">
          <button
            type="button"
            className="icon-btn"
            aria-label={t('nav.search')}
            aria-expanded={searching}
            onClick={() => setSearching((s) => !s)}
          >
            {searching ? <IconClose /> : <IconSearch />}
          </button>
          <LanguageSwitcher />
          <WhatsAppButton message={waMessage} kind="header" className="btn btn--wa btn--sm header__wa" label={t('nav.whatsapp')}>
            <span className="header__wa-label">WhatsApp</span>
          </WhatsAppButton>
          <button
            type="button"
            className="icon-btn header__burger"
            aria-label={open ? t('nav.close') : t('nav.menu')}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>

      {searching && (
        <div className="header__search">
          <form className="container" role="search" onSubmit={submit}>
            <IconSearch aria-hidden="true" />
            <input
              ref={searchRef}
              className="header__search-input"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('search.placeholder')}
              aria-label={t('nav.search')}
            />
            <button type="submit" className="btn btn--dark btn--sm">
              {t('common.search')}
            </button>
          </form>
        </div>
      )}

      <div id="mobile-menu" className="mnav" hidden={!open}>
        <div className="container mnav__inner">
          <form className="mnav__search" role="search" onSubmit={submit}>
            <IconSearch aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('search.placeholder')}
              aria-label={t('nav.search')}
            />
          </form>
          <ul>
            {NAV.map((n) => (
              <li key={n.route}>
                <NavLink to={path(n.route)} end={n.route === 'home'} className="mnav__link">
                  {t(n.key)}
                </NavLink>
              </li>
            ))}
            <li>
              <Link to={path('faq')} className="mnav__link">
                {t('nav.faq')}
              </Link>
            </li>
          </ul>
          <div className="mnav__foot">
            <LanguageSwitcher />
            <WhatsAppButton message={waMessage} kind="header" className="btn btn--wa btn--block btn--lg" label={t('nav.whatsapp')}>
              {t('nav.whatsapp')}
            </WhatsAppButton>
          </div>
        </div>
      </div>
    </header>
  )
}
