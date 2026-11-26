import { Link } from 'react-router'
import { useData } from '../data/DataContext.tsx'
import { useI18n } from '../i18n/I18nContext.tsx'
import { useSeo } from '../lib/useSeo.ts'
import { Picture } from '../components/ui/Picture.tsx'
import { SectionHead } from '../components/ui/Bits.tsx'
import { WhenReady } from '../components/ui/States.tsx'
import { IconArrow, IconByKey } from '../components/ui/Icons.tsx'
import { WhatsAppButton } from '../components/ui/WhatsAppButton.tsx'
import { BrandCard, GeneratorCard, PartCard } from '../components/catalogue/bits.tsx'
import { Accordion } from '../components/catalogue/Accordion.tsx'
import { generalMessage } from '../lib/whatsapp.ts'
import { SITE_URL } from '../lib/head.ts'
import { MasterMark } from '../components/layout/Logo.tsx'
import type { ImageRef } from '../data/types.ts'
import { resolveHeroFacts } from '../lib/heroFacts.ts'

const HERO_FALLBACK: ImageRef = {
  url: '/demo/gen-canopy-side.svg',
  width: 1200,
  height: 800,
  alt: {
    az: 'Səssiz korpuslu dizel generator qurğusu (illüstrasiya)',
    ru: 'Дизель-генераторная установка в шумоизолирующем кожухе (иллюстрация)',
    en: 'Silent canopy diesel generator set (illustration)',
  },
}

export default function HomePage() {
  const { t, text, locale } = useI18n()
  const { content, settings } = useData()
  const facts = resolveHeroFacts(content, text)
  useSeo({
    title: `${text(content.hero.title)} — ${settings.companyName}`,
    description: text(settings.seoDefaults.description),
    route: 'home',
    jsonLd: [],
  })
  return (
    <>
      <section className="hero on-dark" aria-labelledby="hero-title">
        <div className="hero__grid" aria-hidden="true" />
        <div className="container hero__inner">
          <div className="hero__copy">
            <p className="eyebrow">{text(content.hero.eyebrow) || t('home.heroEyebrow')}</p>
            <h1 id="hero-title" className="h-display">
              {text(content.hero.title) || t('home.heroTitle')}
            </h1>
            <p className="lead">{text(content.hero.text) || t('home.heroText')}</p>
            <div className="hero__cta">
              <HeroLinks />
            </div>
          </div>
          <div className="hero__visual">
            <Picture image={content.hero.image ?? HERO_FALLBACK} locale={locale} alt={t('home.heroTitle')} priority sizes="(min-width: 1024px) 52vw, 100vw" />
          </div>
        </div>
        {facts.length > 0 && (
          <div className="container">
            <dl className="hero__facts" style={{ '--facts': facts.length } as React.CSSProperties}>
              {facts.map((f) => (
                <div key={f.id}>
                  {f.label && <dt>{f.label}</dt>}
                  <dd className="num">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>
      <WhenReady>
        <HomeBody />
      </WhenReady>
    </>
  )
}

function HeroLinks() {
  const { t, path } = useI18n()
  return (
    <>
      <Link to={path('generators')} className="btn btn--primary btn--lg">
        {t('home.ctaGenerators')}
        <IconArrow />
      </Link>
      <Link to={path('contact')} className="btn btn--outline btn--lg">
        {t('home.ctaContact')}
      </Link>
    </>
  )
}

function HomeBody() {
  const { t, path, text, locale } = useI18n()
  const { catalogue, content, settings } = useData()

  const countByMfr = (id: string) => catalogue.generators.filter((g) => g.manufacturerId === id).length
  const brands = catalogue.manufacturers.filter((m) => countByMfr(m.id) > 0).slice(0, 6)
  // most recently updated featured items first, so a newly featured generator always shows up
  const featured = catalogue.generators.filter((g) => g.featured).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const popular = (featured.length ? featured : catalogue.generators).slice(0, 6)
  const genCats = catalogue.categories.filter((c) => c.kind === 'generator' && catalogue.generators.some((g) => g.categoryId === c.id))
  const featuredParts = catalogue.parts.filter((p) => p.featured).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const parts = (featuredParts.length ? featuredParts : catalogue.parts).slice(0, 4)
  const faq = content.faq.filter((f) => text(f.question) && text(f.answer)).slice(0, 5)

  const why = [1, 2, 3, 4] as const

  return (
    <>
      {brands.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHead
              eyebrow={t('nav.brands')}
              title={t('home.brandsTitle')}
              lead={t('home.brandsLead')}
              action={
                <Link to={path('brands')} className="link-arrow">
                  {t('common.viewAll')}
                  <IconArrow />
                </Link>
              }
            />
            <ul className="grid grid--brands">
              {brands.map((m, i) => (
                <li key={m.id} data-reveal style={{ '--d': `${i * 50}ms` } as React.CSSProperties}>
                  <BrandCard m={m} count={countByMfr(m.id)} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section className="section section--soft">
          <div className="container">
            <SectionHead
              eyebrow={t('nav.generators')}
              title={t('home.popularTitle')}
              lead={t('home.popularLead')}
              action={
                <Link to={path('generators')} className="link-arrow">
                  {t('common.viewAll')}
                  <IconArrow />
                </Link>
              }
            />
            <ul className="grid grid--gen home-popular">
              {popular.map((g, i) => (
                <li key={g.id} data-reveal style={{ '--d': `${(i % 3) * 60}ms` } as React.CSSProperties}>
                  <GeneratorCard g={g} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {genCats.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHead eyebrow={t('common.category')} title={t('home.categoriesTitle')} lead={t('home.categoriesLead')} />
            <ol className="cat-list">
              {genCats.map((c, i) => {
                const n = catalogue.generators.filter((g) => g.categoryId === c.id).length
                return (
                  <li key={c.id} data-reveal>
                    <Link to={path('generatorCategory', { slug: c.slug })} className="cat-row">
                      <span className="cat-row__idx num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="cat-row__name">{text(c.name)}</span>
                      <span className="cat-row__desc">{text(c.description)}</span>
                      <span className="cat-row__count">{t('common.models', { n })}</span>
                      <IconArrow />
                    </Link>
                  </li>
                )
              })}
            </ol>
          </div>
        </section>
      )}

      <section className="section section--dark on-dark">
        <div className="container">
          <SectionHead eyebrow={settings.companyName} title={t('home.whyTitle')} lead={t('home.whyLead')} />
          <ul className="why">
            {why.map((n, i) => (
              <li key={n} className="why__item" data-reveal style={{ '--d': `${i * 70}ms` } as React.CSSProperties}>
                <span className="why__idx num">{String(n).padStart(2, '0')}</span>
                <h3 className="h3">{t(`home.why${n}.title` as const)}</h3>
                <p>{t(`home.why${n}.text` as const)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {parts.length > 0 && (
        <section className="section section--soft">
          <div className="container">
            <SectionHead
              eyebrow={t('nav.parts')}
              title={t('home.partsTitle')}
              lead={t('home.partsLead')}
              action={
                <Link to={path('parts')} className="link-arrow">
                  {t('common.viewAll')}
                  <IconArrow />
                </Link>
              }
            />
            <ul className="grid grid--part">
              {parts.map((p, i) => (
                <li key={p.id} data-reveal style={{ '--d': `${i * 50}ms` } as React.CSSProperties}>
                  <PartCard p={p} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow={t('nav.services')}
            title={t('home.servicesTitle')}
            lead={t('home.servicesLead')}
            action={
              <Link to={path('services')} className="link-arrow">
                {t('common.viewAll')}
                <IconArrow />
              </Link>
            }
          />
          <ul className="svc-grid">
            {content.services
              .filter((s) => text(s.title))
              .map((s, i) => (
                <li key={s.id} className="svc" data-reveal style={{ '--d': `${i * 60}ms` } as React.CSSProperties}>
                  <span className="svc__icon">
                    <IconByKey name={s.icon} />
                  </span>
                  <h3 className="h3">{text(s.title)}</h3>
                  <p>{text(s.text)}</p>
                </li>
              ))}
          </ul>
        </div>
      </section>

      <section className="section section--soft">
        <div className="container about-split">
          <div data-reveal>
            <p className="eyebrow">{t('home.aboutTitle')}</p>
            <h2 className="h2">{text(content.about.title)}</h2>
            <div className="prose">
              {content.about.paragraphs.slice(0, 2).map((p, i) => (
                <p key={i}>{text(p)}</p>
              ))}
            </div>
            <Link to={path('about')} className="link-arrow" style={{ marginTop: 28 }}>
              {t('nav.about')}
              <IconArrow />
            </Link>
          </div>
          <div className="about-split__mark" data-reveal>
            {content.about.image ? <Picture image={content.about.image} locale={locale} alt={settings.companyName} fit="cover" /> : <MasterMark size={240} />}
          </div>
        </div>
      </section>

      {faq.length > 0 && (
        <section className="section">
          <div className="container faq-split">
            <div data-reveal>
              <p className="eyebrow">{t('nav.faq')}</p>
              <h2 className="h2">{t('home.faqTitle')}</h2>
              <Link to={path('faq')} className="link-arrow" style={{ marginTop: 24 }}>
                {t('common.viewAll')}
                <IconArrow />
              </Link>
            </div>
            <div data-reveal>
              <Accordion items={faq.map((f) => ({ id: f.id, title: text(f.question), body: <p>{text(f.answer)}</p> }))} />
            </div>
          </div>
        </section>
      )}

      <section className="cta on-dark">
        <div className="container cta__inner">
          <div>
            <h2 className="h2">{t('home.ctaTitle')}</h2>
            <p className="lead">{t('home.ctaText')}</p>
          </div>
          <div className="cta__actions">
            <WhatsAppButton
              kind="general"
              className="btn btn--primary btn--lg"
              message={generalMessage(locale, `${SITE_URL}${path('home')}`)}
            >
              {t('contact.whatsappCta')}
            </WhatsAppButton>
            <Link to={path('contact')} className="btn btn--outline btn--lg">
              {t('nav.contact')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
