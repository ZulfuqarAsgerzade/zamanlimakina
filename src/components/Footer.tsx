import { Logo } from './Logo'
import { getContactItems } from '../config/contact'
import { siteConfig } from '../config/site'
import { IconInstagram, IconWhatsApp } from './Icons'
import './Footer.css'

export function Footer() {
  const year = new Date().getFullYear()
  const socials = getContactItems().filter((c) => c.kind === 'instagram' || c.kind === 'whatsapp')

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <Logo size="lg" />
            <p>{siteConfig.brand.footerDescription}</p>
          </div>

          <nav className="footer__nav" aria-label="Altlıq naviqasiya">
            <ul>
              <li>
                <a href="#ana">Ana səhifə</a>
              </li>
              <li>
                <a href="#haqqimizda">Haqqımızda</a>
              </li>
              <li>
                <a href="#elaqe">Əlaqə</a>
              </li>
            </ul>
          </nav>

          {socials.length > 0 && (
            <ul className="footer__social" aria-label="Sosial şəbəkələr">
              {socials.map((s) => (
                <li key={s.kind}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    title={s.label}
                  >
                    {s.kind === 'instagram' ? <IconInstagram /> : <IconWhatsApp />}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="footer__bottom">
          <p>© {year} Zamanlı Makina. Bütün hüquqlar qorunur.</p>
        </div>
      </div>
    </footer>
  )
}
