import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useData } from '../data/DataContext.tsx'
import { generatorTitle, relatedGenerators } from '../data/queries.ts'
import { LOCALES } from '../data/types.ts'
import type { Part } from '../data/types.ts'
import { useI18n } from '../i18n/I18nContext.tsx'
import { useSeo } from '../lib/useSeo.ts'
import { breadcrumbLd, productLd } from '../lib/jsonld.ts'
import { exact } from '../lib/text.ts'
import { formatNumber } from '../lib/format.ts'
import { generatorMessage } from '../lib/whatsapp.ts'
import { SITE_URL } from '../lib/head.ts'
import { WhenReady } from '../components/ui/States.tsx'
import { AvailabilityBadge, Breadcrumbs, DemoBadge, DemoNote, NotTranslatedNote } from '../components/ui/Bits.tsx'
import { WhatsAppButton } from '../components/ui/WhatsAppButton.tsx'
import { IconArrow } from '../components/ui/Icons.tsx'
import { Gallery } from '../components/catalogue/Gallery.tsx'
import { SpecTable, hasSpecs } from '../components/catalogue/SpecTable.tsx'
import { GeneratorCard, PartCard, PriceLine } from '../components/catalogue/bits.tsx'
import NotFoundPage from './NotFound.tsx'

export default function GeneratorDetailPage() {
  const { slug = '' } = useParams()
  return (
    <WhenReady>
      <Detail slug={slug} />
    </WhenReady>
  )
}

function Detail({ slug }: { slug: string }) {
  const { t, locale, path, text, isFallback } = useI18n()
  const { index, catalogue } = useData()
  const g = index.genBySlug.get(slug)

  const mfr = g?.manufacturerId ? index.mfrById.get(g.manufacturerId) : undefined
  const cat = g?.categoryId ? index.catById.get(g.categoryId) : undefined
  const title = g ? generatorTitle(g, mfr, locale) : ''
  const url = `${SITE_URL}${path('generator', { slug })}`
  const desc = g ? text(g.shortDescription) || text(g.description) : ''

  const parts = useMemo(
    () => (g ? (index.partsByGen.get(g.id) ?? []).map((id) => index.partById.get(id)).filter((p): p is Part => !!p) : []),
    [g, index],
  )
  const related = useMemo(() => (g ? relatedGenerators(g, catalogue.generators) : []), [g, catalogue.generators])

  useSeo({
    title: g ? (text(g.seo.title) || `${title}${g.kvaPrime ? ` — ${g.kvaPrime} kVA` : ''}`) : t('nf.title'),
    description: g ? text(g.seo.description) || desc.slice(0, 160) || undefined : undefined,
    route: 'generator',
    params: { slug },
    ogType: 'product',
    image: g?.images[0]?.url,
    // never index demonstration records
    noindex: !g || g.isDemo,
    translatedLocales: g ? LOCALES.filter((l) => !!exact(g.description, l) || !!exact(g.shortDescription, l)) : undefined,
    jsonLd: g
      ? [
          breadcrumbLd([
            { name: t('nav.home'), path: path('home') },
            { name: t('nav.generators'), path: path('generators') },
            ...(mfr ? [{ name: mfr.name, path: path('brand', { slug: mfr.slug }) }] : []),
            { name: title, path: path('generator', { slug }) },
          ]),
          productLd({ item: g, name: title, description: desc, url, images: g.images.map((i) => i.url), brand: mfr, sku: g.slug, mpn: g.model }),
        ]
      : [],
  })

  if (!g) return <NotFoundPage />

  const message = generatorMessage(locale, { name: title, model: g.model, manufacturer: mfr?.name ?? '—', url })
  const facts = [
    g.kvaPrime ? { k: t('gen.primePower'), v: formatNumber(g.kvaPrime, locale), u: t('common.kva') } : null,
    g.kvaStandby ? { k: t('gen.standbyPower'), v: formatNumber(g.kvaStandby, locale), u: t('common.kva') } : null,
    g.fuelType ? { k: t('common.fuel'), v: t(`fuel.${g.fuelType}` as const) } : null,
    g.generatorType ? { k: t('common.type'), v: t(`gtype.${g.generatorType}` as const) } : null,
    g.phase ? { k: t('common.phase'), v: t(`phase.${g.phase}` as const) } : null,
    g.coolingSystem ? { k: t('common.cooling'), v: t(`cooling.${g.coolingSystem}` as const) } : null,
  ].filter(Boolean) as Array<{ k: string; v: string; u?: string }>

  const showSpecs = hasSpecs(g)
  const hasDescription = !!text(g.description)
  const adv = g.advantages.map((a) => text(a)).filter(Boolean)
  const apps = g.applications.map((a) => text(a)).filter(Boolean)
  const fallback = isFallback(g.description) || isFallback(g.shortDescription)

  return (
    <article className="detail">
      <div className="container detail__top">
        <Breadcrumbs
          items={[
            { label: t('nav.home'), to: path('home') },
            { label: t('nav.generators'), to: path('generators') },
            ...(mfr ? [{ label: mfr.name, to: path('brand', { slug: mfr.slug }) }] : []),
            { label: title },
          ]}
        />
        <div className="detail__grid">
          <Gallery images={g.images} alt={title} locale={locale} badges={g.isDemo ? <DemoBadge /> : undefined} />
          <div className="detail__info">
            <div className="detail__sticky">
              {mfr && (
                <Link to={path('brand', { slug: mfr.slug })} className="detail__brand">
                  {mfr.name}
                </Link>
              )}
              <h1 className="h1 detail__title">{title}</h1>
              <p className="detail__model">
                {t('common.model')}: <span className="num">{g.model}</span>
                {cat && (
                  <>
                    {' '}
                    · <Link to={path('generatorCategory', { slug: cat.slug })}>{text(cat.name)}</Link>
                  </>
                )}
              </p>
              {text(g.shortDescription) && <p className="detail__lead">{text(g.shortDescription)}</p>}

              <dl className="facts">
                {facts.map((f) => (
                  <div key={f.k}>
                    <dt>{f.k}</dt>
                    <dd>
                      <span className={f.u ? 'num num--lg' : ''}>{f.v}</span>
                      {f.u && <span className="unit"> {f.u}</span>}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="buybox">
                <div className="buybox__row">
                  <AvailabilityBadge value={g.availability} />
                  <PriceLine item={g} />
                </div>
                <WhatsAppButton kind="generator" itemId={g.id} product={title} message={message} className="btn btn--wa btn--lg btn--block" />
                {parts.length > 0 && (
                  <a href="#parts" className="btn btn--outline btn--block">
                    {t('gen.findParts')}
                    <IconArrow />
                  </a>
                )}
                <p className="muted buybox__hint">{t('gen.requestHint')}</p>
              </div>
              {g.isDemo && <DemoNote />}
            </div>
          </div>
        </div>
      </div>

      <nav className="subnav" aria-label={title}>
        <div className="container">
          <ul>
            {showSpecs && <li><a href="#specs">{t('gen.specs')}</a></li>}
            {(hasDescription || adv.length > 0) && <li><a href="#description">{t('gen.description')}</a></li>}
            <li><a href="#parts">{t('gen.compatibleParts')}</a></li>
            {related.length > 0 && <li><a href="#related">{t('gen.related')}</a></li>}
          </ul>
        </div>
      </nav>

      {showSpecs && (
        <section id="specs" className="section section--tight">
          <div className="container">
            <h2 className="h2 detail__h2">{t('gen.specs')}</h2>
            {g.isDemo && <p className="note note--demo"><DemoBadge /> <span>{t('gen.specDemo')}: {t('common.demoNote')}</span></p>}
            <SpecTable groups={g.specGroups} />
          </div>
        </section>
      )}

      {(hasDescription || adv.length > 0 || apps.length > 0) && (
        <section id="description" className="section section--soft section--tight">
          <div className="container detail__desc">
            <div>
              <h2 className="h2 detail__h2">{t('gen.description')}</h2>
              {fallback && <NotTranslatedNote />}
              {hasDescription && (
                <div className="prose">
                  {text(g.description)
                    .split(/\n{2,}/)
                    .map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                </div>
              )}
            </div>
            <div className="detail__lists">
              {adv.length > 0 && (
                <div>
                  <h3 className="h3">{t('gen.advantages')}</h3>
                  <ul className="ticks">
                    {adv.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {apps.length > 0 && (
                <div>
                  <h3 className="h3">{t('gen.applications')}</h3>
                  <ul className="ticks">
                    {apps.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section id="parts" className="section section--tight">
        <div className="container">
          <div className="sec-head">
            <div>
              <h2 className="h2 detail__h2">{t('gen.compatibleParts')}</h2>
              <p className="lead">{t('gen.compatibleLead')}</p>
            </div>
            {parts.length > 0 && (
              <div className="sec-head__action">
                <Link to={`${path('parts')}?model=${encodeURIComponent(g.slug)}`} className="link-arrow">
                  {t('common.viewAll')}
                  <IconArrow />
                </Link>
              </div>
            )}
          </div>
          <CompatibleParts parts={parts} />
        </div>
      </section>

      {related.length > 0 && (
        <section id="related" className="section section--soft section--tight">
          <div className="container">
            <h2 className="h2 detail__h2">{t('gen.related')}</h2>
            <ul className="grid grid--gen">
              {related.slice(0, 3).map((r) => (
                <li key={r.id}>
                  <GeneratorCard g={r} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="stickybar" role="region" aria-label={t('common.inquiry')}>
        <div className="stickybar__price">
          <PriceLine item={g} />
          <AvailabilityBadge value={g.availability} />
        </div>
        <WhatsAppButton kind="generator" itemId={g.id} product={title} message={message} className="btn btn--wa" label={t('common.inquiryShort')}>
          {t('common.inquiryShort')}
        </WhatsAppButton>
      </div>
    </article>
  )
}

function CompatibleParts({ parts }: { parts: Part[] }) {
  const { t, text } = useI18n()
  const { index } = useData()
  const [cat, setCat] = useState('')
  if (!parts.length) return <p className="muted">{t('gen.noParts')}</p>
  const cats = [...new Map(parts.map((p) => [p.categoryId ?? '', index.catById.get(p.categoryId ?? '')])).entries()].filter(([id]) => id)
  const shown = cat ? parts.filter((p) => p.categoryId === cat) : parts
  return (
    <>
      {cats.length > 1 && (
        <div className="tabs" role="group" aria-label={t('common.category')}>
          <button type="button" className="tab" aria-pressed={cat === ''} onClick={() => setCat('')}>
            {t('common.all')} <span className="count">{parts.length}</span>
          </button>
          {cats.map(([id, c]) => (
            <button key={id} type="button" className="tab" aria-pressed={cat === id} onClick={() => setCat(id)}>
              {text(c?.name)} <span className="count">{parts.filter((p) => p.categoryId === id).length}</span>
            </button>
          ))}
        </div>
      )}
      <ul className="grid grid--part">
        {shown.map((p) => (
          <li key={p.id}>
            <PartCard p={p} />
          </li>
        ))}
      </ul>
    </>
  )
}
