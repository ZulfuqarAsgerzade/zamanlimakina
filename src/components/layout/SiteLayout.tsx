import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { I18nProvider, useI18n } from '../../i18n/I18nContext.tsx'
import { useData } from '../../data/DataContext.tsx'
import type { Locale } from '../../data/types.ts'
import { useReveal } from '../ui/useReveal.ts'
import { FloatingWhatsApp } from './FloatingWhatsApp.tsx'
import { Footer } from './Footer.tsx'
import { Header } from './Header.tsx'

function DemoBanner() {
  const { mode } = useData()
  const { t } = useI18n()
  if (mode !== 'demo') return null
  return (
    <div className="demo-banner" role="note">
      <div className="container">{t('common.demoBanner')}</div>
    </div>
  )
}

function Shell() {
  const { t, locale, switchPath } = useI18n()
  const { pathname } = useLocation()
  const { status, settings } = useData()
  useReveal()
  // reset scroll on navigation (not on filter / query changes)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  // re-run reveal scan once data (and its sections) is rendered
  useEffect(() => {
    if (status === 'ready') window.dispatchEvent(new Event('zm:ready'))
  }, [status])
  // a language switched off in Admin → Settings no longer serves pages: send visitors to the default language
  if (status === 'ready' && !settings.languages.enabled.includes(locale)) return <Navigate to={switchPath(settings.languages.default)} replace />
  return (
    <>
      <a className="skip-link" href="#main">
        {t('nav.skip')}
      </a>
      <DemoBanner />
      <Header />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  )
}

export function SiteLayout({ locale }: { locale: Locale }) {
  return (
    <I18nProvider locale={locale}>
      <Shell />
    </I18nProvider>
  )
}
