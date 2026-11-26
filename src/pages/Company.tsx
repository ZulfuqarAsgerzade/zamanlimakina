import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useData } from '../data/DataContext.tsx'
import { getStore } from '../data/index.ts'
import { ValidationError } from '../data/schema.ts'
import { useI18n } from '../i18n/I18nContext.tsx'
import { useSeo } from '../lib/useSeo.ts'
import { breadcrumbLd } from '../lib/jsonld.ts'
import { buildWhatsAppUrl, generalMessage } from '../lib/whatsapp.ts'
import { SITE_URL } from '../lib/head.ts'
import { trackEvent } from '../lib/analytics.ts'
import { WhenReady } from '../components/ui/States.tsx'
import { Accordion } from '../components/catalogue/Accordion.tsx'
import { Picture } from '../components/ui/Picture.tsx'
import { WhatsAppButton } from '../components/ui/WhatsAppButton.tsx'
import { IconArrow, IconByKey, IconClock, IconMail, IconPhone, IconPin } from '../components/ui/Icons.tsx'
import { MasterMark } from '../components/layout/Logo.tsx'
import { PageHeader } from './PageHeader.tsx'

export function ServicesPage() {
  const { t, path, text, locale } = useI18n()
  const { content } = useData()
  useSeo({
    title: t('services.title'),
    description: t('services.lead'),
    route: 'services',
    jsonLd: [breadcrumbLd([{ name: t('nav.home'), path: path('home') }, { name: t('services.title'), path: path('services') }])],
  })
  return (
    <>
      <PageHeader crumbs={[{ label: t('nav.home'), to: path('home') }, { label: t('services.title') }]} title={t('services.title')} lead={t('services.lead')} />
      <section className="section section--tight">
        <div className="container">
          <WhenReady>
            <ul className="svc-grid svc-grid--lg">
              {content.services
                .filter((s) => text(s.title))
                .map((s) => (
                  <li key={s.id} className="svc">
                    <span className="svc__icon">
                      <IconByKey name={s.icon} />
                    </span>
                    <h2 className="h3">{text(s.title)}</h2>
                    <p>{text(s.text)}</p>
                  </li>
                ))}
            </ul>
            <div className="inline-cta">
              <WhatsAppButton kind="general" className="btn btn--wa btn--lg" message={generalMessage(locale, `${SITE_URL}${path('services')}`)} label={t('contact.whatsappCta')}>
                {t('contact.whatsappCta')}
              </WhatsAppButton>
              <Link to={path('contact')} className="btn btn--outline btn--lg">
                {t('nav.contact')}
                <IconArrow />
              </Link>
            </div>
          </WhenReady>
        </div>
      </section>
    </>
  )
}

export function AboutPage() {
  const { t, path, text, locale } = useI18n()
  const { content, settings } = useData()
  useSeo({
    title: t('about.title'),
    description: text(content.about.paragraphs[0]) || t('about.lead'),
    route: 'about',
    jsonLd: [breadcrumbLd([{ name: t('nav.home'), path: path('home') }, { name: t('about.title'), path: path('about') }])],
  })
  return (
    <>
      <PageHeader crumbs={[{ label: t('nav.home'), to: path('home') }, { label: t('about.title') }]} title={t('about.title')} lead={text(content.about.title) || t('about.lead')} />
      <section className="section section--tight">
        <div className="container about-split">
          <div className="prose prose--lg">
            {content.about.paragraphs.map((p, i) => (text(p) ? <p key={i}>{text(p)}</p> : null))}
            <p style={{ marginTop: 28 }}>
              <Link to={path('contact')} className="link-arrow">
                {t('nav.contact')}
                <IconArrow />
              </Link>
            </p>
          </div>
          <div className="about-split__mark">
            {content.about.image ? <Picture image={content.about.image} locale={locale} alt={settings.companyName} fit="cover" /> : <MasterMark size={240} />}
          </div>
        </div>
      </section>
    </>
  )
}

export function FaqPage() {
  const { t, path, text } = useI18n()
  const { content } = useData()
  const items = content.faq.filter((f) => text(f.question) && text(f.answer))
  useSeo({
    title: t('faq.title'),
    description: t('faq.lead'),
    route: 'faq',
    jsonLd: [
      breadcrumbLd([{ name: t('nav.home'), path: path('home') }, { name: t('faq.title'), path: path('faq') }]),
      ...(items.length
        ? [
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: items.map((f) => ({ '@type': 'Question', name: text(f.question), acceptedAnswer: { '@type': 'Answer', text: text(f.answer) } })),
            },
          ]
        : []),
    ],
  })
  return (
    <>
      <PageHeader crumbs={[{ label: t('nav.home'), to: path('home') }, { label: t('faq.title') }]} title={t('faq.title')} lead={t('faq.lead')} />
      <section className="section section--tight">
        <div className="container container--narrow">
          <WhenReady>
            <Accordion items={items.map((f) => ({ id: f.id, title: text(f.question), body: <p>{text(f.answer)}</p> }))} />
          </WhenReady>
        </div>
      </section>
    </>
  )
}

export function ContactPage() {
  const { t, path, text, locale } = useI18n()
  const { settings, content } = useData()
  const [sp] = useSearchParams()
  useSeo({
    title: t('contact.title'),
    description: text(content.contactIntro) || t('contact.lead'),
    route: 'contact',
    jsonLd: [breadcrumbLd([{ name: t('nav.home'), path: path('home') }, { name: t('contact.title'), path: path('contact') }])],
  })
  const wa = buildWhatsAppUrl(settings.whatsapp)
  const address = text(settings.address)
  const hours = text(settings.workingHours)
  const hasAny = !!(settings.phone || settings.email || wa || address || hours)
  return (
    <>
      <PageHeader crumbs={[{ label: t('nav.home'), to: path('home') }, { label: t('contact.title') }]} title={t('contact.title')} lead={text(content.contactIntro) || t('contact.lead')} />
      <section className="section section--tight">
        <div className="container contact-grid">
          <div className="contact-card">
            {wa && (
              <WhatsAppButton kind="general" className="btn btn--wa btn--lg btn--block" message={generalMessage(locale, `${SITE_URL}${path('contact')}`)}>
                {t('contact.whatsappCta')}
              </WhatsAppButton>
            )}
            <ul className="contact-list">
              {settings.phone && (
                <li>
                  <IconPhone />
                  <div>
                    <p className="label">{t('contact.call')}</p>
                    <a href={`tel:+${settings.phone.replace(/\D/g, '')}`}>{settings.phone}</a>
                  </div>
                </li>
              )}
              {settings.email && (
                <li>
                  <IconMail />
                  <div>
                    <p className="label">{t('contact.email')}</p>
                    <a href={`mailto:${settings.email}`}>{settings.email}</a>
                  </div>
                </li>
              )}
              {address && (
                <li>
                  <IconPin />
                  <div>
                    <p className="label">{t('contact.address')}</p>
                    <p>{address}</p>
                  </div>
                </li>
              )}
              {hours && (
                <li>
                  <IconClock />
                  <div>
                    <p className="label">{t('contact.hours')}</p>
                    <p>{hours}</p>
                  </div>
                </li>
              )}
            </ul>
            {!hasAny && <p className="muted">{t('contact.notConfigured')}</p>}
          </div>
          <InquiryForm defaultProduct={sp.get('product') ?? ''} defaultMessage={sp.get('message') ?? ''} />
        </div>
      </section>
    </>
  )
}

function InquiryForm({ defaultProduct, defaultMessage }: { defaultProduct: string; defaultMessage: string }) {
  const { t, locale } = useI18n()
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget // React clears currentTarget after the first await
    const f = new FormData(form)
    if (f.get('website')) return // honeypot — bots fill hidden fields
    setState('sending')
    setErrors({})
    try {
      const store = await getStore()
      await store.submitInquiry({
        name: String(f.get('name') ?? ''),
        phone: String(f.get('phone') ?? ''),
        product: String(f.get('product') ?? ''),
        message: String(f.get('message') ?? ''),
        locale,
      })
      trackEvent('inquiry_form_submit', { locale })
      setState('sent')
      form.reset()
    } catch (err) {
      if (err instanceof ValidationError) {
        setErrors(err.errors)
        // any other field error (e.g. message too long) must still be visible
        const known = ['name', 'phone', 'product', 'message']
        const other = Object.entries(err.errors).filter(([k]) => !known.includes(k))
        if (other.length) setErrors({ ...err.errors, message: err.errors.message ?? other[0][1] })
        setState('idle')
      } else {
        setState('error')
      }
    }
  }

  return (
    <form className="form-card" onSubmit={onSubmit} noValidate>
      <h2 className="h3">{t('contact.formTitle')}</h2>
      <p className="muted">{t('contact.formLead')}</p>
      <div className="field">
        <label htmlFor="cf-name">{t('contact.fullName')}</label>
        <input id="cf-name" name="name" className="input" autoComplete="name" required maxLength={120} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'cf-name-e' : undefined} />
        {errors.name && <p id="cf-name-e" className="field-error">{errors.name}</p>}
      </div>
      <div className="field">
        <label htmlFor="cf-phone">{t('contact.phone')}</label>
        <input id="cf-phone" name="phone" type="tel" className="input" autoComplete="tel" required aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'cf-phone-e' : undefined} />
        {errors.phone && <p id="cf-phone-e" className="field-error">{errors.phone}</p>}
      </div>
      <div className="field">
        <label htmlFor="cf-product">{t('contact.product')}</label>
        <input id="cf-product" name="product" className="input" defaultValue={defaultProduct} maxLength={200} aria-invalid={!!errors.product} aria-describedby={errors.product ? 'cf-product-e' : undefined} />
        {errors.product && <p id="cf-product-e" className="field-error">{errors.product}</p>}
      </div>
      <div className="field">
        <label htmlFor="cf-message">{t('contact.message')}</label>
        <textarea id="cf-message" name="message" className="textarea" defaultValue={defaultMessage} maxLength={2000} aria-invalid={!!errors.message} aria-describedby={errors.message ? 'cf-message-e' : undefined} />
        {errors.message && <p id="cf-message-e" className="field-error">{errors.message}</p>}
      </div>
      <div className="hp" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <button type="submit" className="btn btn--dark btn--lg" disabled={state === 'sending'}>
        {state === 'sending' ? t('contact.sending') : t('contact.send')}
      </button>
      {state === 'sent' && <p className="note note--ok" role="status">{t('contact.sent')}</p>}
      {state === 'error' && <p className="note note--err" role="alert">{t('contact.sendError')}</p>}
    </form>
  )
}
