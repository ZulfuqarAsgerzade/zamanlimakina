import { Link } from 'react-router'
import { useI18n } from '../../i18n/I18nContext.tsx'
import { useData } from '../../data/DataContext.tsx'
import { buildWhatsAppUrl } from '../../lib/whatsapp.ts'
import { safeHttpUrl } from '../../lib/safeUrl.ts'
import {
  IconFacebook,
  IconInstagram,
  IconLinkedin,
  IconMail,
  IconPhone,
  IconPin,
  IconTag,
  IconTiktok,
  IconWhatsApp,
  IconYoutube,
} from '../ui/Icons.tsx'
import { MasterMark } from './Logo.tsx'

const SOCIAL = [
  { key: 'instagram', Icon: IconInstagram, label: 'Instagram' },
  { key: 'facebook', Icon: IconFacebook, label: 'Facebook' },
  { key: 'linkedin', Icon: IconLinkedin, label: 'LinkedIn' },
  { key: 'youtube', Icon: IconYoutube, label: 'YouTube' },
  { key: 'tiktok', Icon: IconTiktok, label: 'TikTok' },
  { key: 'tapaz', Icon: IconTag, label: 'Tap.az' },
] as const

export function Footer() {
  const { t, path, text } = useI18n()
  const { settings, content } = useData()
  const wa = buildWhatsAppUrl(settings.whatsapp)
  const socials = SOCIAL.map((s) => ({ ...s, href: safeHttpUrl(settings.social[s.key]) })).filter((s) => s.href)
  const address = text(settings.address)
  const hours = text(settings.workingHours)

  return (
    <footer className="footer on-dark">
      <div className="container footer__grid">
        <div className="footer__brand">
          <MasterMark size={120} />
          <p className="footer__tagline">{t('footer.tagline')}</p>
          <p className="footer__about">{text(content.footerText)}</p>
        </div>
        <nav aria-label={t('footer.catalogue')}>
          <h2 className="footer__h">{t('footer.catalogue')}</h2>
          <ul>
            <li><Link to={path('generators')}>{t('nav.generators')}</Link></li>
            <li><Link to={path('brands')}>{t('nav.brands')}</Link></li>
            <li><Link to={path('parts')}>{t('nav.parts')}</Link></li>
            <li><Link to={path('search')}>{t('nav.search')}</Link></li>
          </ul>
        </nav>
        <nav aria-label={t('footer.company')}>
          <h2 className="footer__h">{t('footer.company')}</h2>
          <ul>
            <li><Link to={path('about')}>{t('nav.about')}</Link></li>
            <li><Link to={path('services')}>{t('nav.services')}</Link></li>
            <li><Link to={path('faq')}>{t('nav.faq')}</Link></li>
            <li><Link to={path('contact')}>{t('nav.contact')}</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="footer__h">{t('footer.contact')}</h2>
          <ul className="footer__contact">
            {settings.phone && (
              <li>
                <IconPhone />
                <a href={`tel:+${settings.phone.replace(/\D/g, '')}`}>{settings.phone}</a>
              </li>
            )}
            {settings.email && (
              <li>
                <IconMail />
                <a href={`mailto:${settings.email}`}>{settings.email}</a>
              </li>
            )}
            {wa && (
              <li>
                <IconWhatsApp />
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </li>
            )}
            {address && (
              <li>
                <IconPin />
                <span>{address}</span>
              </li>
            )}
            {hours && <li><span className="footer__hours">{hours}</span></li>}
          </ul>
          {socials.length > 0 && (
            <ul className="footer__social">
              {socials.map(({ key, Icon, label, href }) => (
                <li key={key}>
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
                    <Icon />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="container footer__legal">
        <p suppressHydrationWarning>
          © {new Date().getFullYear()} {settings.companyName}. {t('footer.rights')}
        </p>
      </div>
    </footer>
  )
}
