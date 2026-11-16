import type { ReactNode } from 'react'
import { getContactItems, type ContactKind } from '../config/contact'
import { IconArrow, IconInstagram, IconMail, IconPhone, IconPin, IconWhatsApp } from './Icons'
import { useReveal } from '../hooks/useReveal'
import './Contact.css'

const icons: Record<ContactKind, ReactNode> = {
  phone: <IconPhone />,
  email: <IconMail />,
  whatsapp: <IconWhatsApp />,
  instagram: <IconInstagram />,
  location: <IconPin />,
}

export function Contact() {
  const ref = useReveal<HTMLDivElement>(0.12)
  const items = getContactItems()

  return (
    <section id="elaqe" className="contact" aria-labelledby="contact-title">
      <div className="container" ref={ref}>
        <header className="contact__head">
          <p className="eyebrow reveal">Əlaqə</p>
          <h2 id="contact-title" className="display contact__title">
            <span className="reveal" style={{ ['--d' as string]: '0.08s' }}>
              BİZİMLƏ
            </span>{' '}
            <span className="reveal text-yellow" style={{ ['--d' as string]: '0.18s' }}>
              ƏLAQƏDƏ QALIN
            </span>
          </h2>
          <p className="contact__desc reveal" style={{ ['--d' as string]: '0.3s' }}>
            Əməkdaşlıq və məlumat üçün bizimlə əlaqə saxlayın.
          </p>
        </header>

        {items.length > 0 ? (
          <ul className="contact__grid">
            {items.map((item, i) => {
              const inner = (
                <>
                  <span className="contact-card__icon">{icons[item.kind]}</span>
                  <span className="contact-card__body">
                    <span className="contact-card__label">{item.label}</span>
                    <span className="contact-card__value">{item.display}</span>
                  </span>
                  {item.href && <IconArrow className="contact-card__arrow" />}
                </>
              )
              const style = { ['--d' as string]: `${0.2 + i * 0.08}s` }
              return (
                <li key={item.kind} className="reveal" style={style}>
                  {item.href ? (
                    <a
                      className="contact-card"
                      href={item.href}
                      {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className="contact-card contact-card--static">{inner}</div>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="contact__empty reveal" style={{ ['--d' as string]: '0.3s' }}>
            Əlaqə məlumatları tezliklə burada yerləşdiriləcək.
          </p>
        )}
      </div>
    </section>
  )
}
