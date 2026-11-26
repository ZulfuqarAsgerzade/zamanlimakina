import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { useData } from '../data/DataContext.tsx'
import { partManufacturers, relatedParts } from '../data/queries.ts'
import { LOCALES } from '../data/types.ts'
import type { Generator } from '../data/types.ts'
import { useI18n } from '../i18n/I18nContext.tsx'
import { useSeo } from '../lib/useSeo.ts'
import { breadcrumbLd, productLd } from '../lib/jsonld.ts'
import { exact } from '../lib/text.ts'
import { partMessage } from '../lib/whatsapp.ts'
import { SITE_URL } from '../lib/head.ts'
import { WhenReady } from '../components/ui/States.tsx'
import { AvailabilityBadge, Breadcrumbs, DemoBadge, DemoNote, NotTranslatedNote } from '../components/ui/Bits.tsx'
import { WhatsAppButton } from '../components/ui/WhatsAppButton.tsx'
import { IconArrow } from '../components/ui/Icons.tsx'
import { Gallery } from '../components/catalogue/Gallery.tsx'
import { SpecTable, hasSpecs } from '../components/catalogue/SpecTable.tsx'
import { PartBrowser } from '../components/catalogue/PartBrowser.tsx'
import { PartCard, PriceLine } from '../components/catalogue/bits.tsx'
import { PageHeader } from './PageHeader.tsx'
import NotFoundPage from './NotFound.tsx'

export default function PartsPage() {
  const { t, path } = useI18n()
  useSeo({
    title: t('parts.title'),
    description: t('parts.lead'),
    route: 'parts',
    jsonLd: [breadcrumbLd([{ name: t('nav.home'), path: path('home') }, { name: t('parts.title'), path: path('parts') }])],
  })
  return (
    <>
      <PageHeader crumbs={[{ label: t('nav.home'), to: path('home') }, { label: t('parts.title') }]} title={t('parts.title')} lead={t('parts.lead')} />
      <section className="section section--tight">
        <div className="container">
          <WhenReady>
            <PartBrowser />
          </WhenReady>
        </div>
      </section>
    </>
  )
}

export function PartDetailPage() {
  const { slug = '' } = useParams()
  return (
    <WhenReady>
      <PartDetail slug={slug} />
    </WhenReady>
  )
}

function PartDetail({ slug }: { slug: string }) {
  const { t, locale, path, text, isFallback } = useI18n()
  const { index, catalogue } = useData()
  const p = index.partBySlug.get(slug)
  const cat = p?.categoryId ? index.catById.get(p.categoryId) : undefined
  const mfr = p?.manufacturerId ? index.mfrById.get(p.manufacturerId) : undefined
  const name = p ? text(p.name) : ''
  const url = `${SITE_URL}${path('part', { slug })}`

  const gens = useMemo(
    () =>
      p
        ? ((index.gensByPart.get(p.id) ?? []).map((id) => index.genById.get(id)).filter(Boolean) as Generator[]).sort(
            (a, b) => (index.mfrById.get(a.manufacturerId ?? '')?.name ?? '').localeCompare(index.mfrById.get(b.manufacturerId ?? '')?.name ?? '') || (a.kvaPrime ?? 0) - (b.kvaPrime ?? 0),
          )
        : [],
    [p, index],
  )
  const brands = p ? partManufacturers(p, index) : []
  const related = p ? relatedParts(p, catalogue.parts, index) : []
  const desc = p ? text(p.description) : ''

  useSeo({
    title: p ? text(p.seo.title) || `${name} — ${p.oemCode}` : t('nf.title'),
    description: p ? text(p.seo.description) || desc.slice(0, 160) || undefined : undefined,
    route: 'part',
    params: { slug },
    ogType: 'product',
    image: p?.images[0]?.url,
    noindex: !p || p.isDemo,
    translatedLocales: p ? LOCALES.filter((l) => !!exact(p.name, l)) : undefined,
    jsonLd: p
      ? [
          breadcrumbLd([
            { name: t('nav.home'), path: path('home') },
            { name: t('nav.parts'), path: path('parts') },
            { name, path: path('part', { slug }) },
          ]),
          productLd({ item: p, name, description: desc, url, images: p.images.map((i) => i.url), brand: mfr, sku: p.oemCode, mpn: p.oemCode }),
        ]
      : [],
  })
  if (!p) return <NotFoundPage />

  const modelLabel = (g: Generator) => `${index.mfrById.get(g.manufacturerId ?? '')?.name ?? ''} ${g.model}`.trim()
  const message = partMessage(locale, { name, oem: p.oemCode, compatible: gens.slice(0, 3).map(modelLabel).join(', '), url })

  return (
    <article className="detail">
      <div className="container detail__top">
        <Breadcrumbs
          items={[
            { label: t('nav.home'), to: path('home') },
            { label: t('nav.parts'), to: path('parts') },
            ...(cat ? [{ label: text(cat.name), to: `${path('parts')}?cat=${cat.slug}` }] : []),
            { label: name },
          ]}
        />
        <div className="detail__grid">
          <Gallery images={p.images} alt={name} locale={locale} badges={p.isDemo ? <DemoBadge /> : undefined} />
          <div className="detail__info">
            <div className="detail__sticky">
              {cat && (
                <Link to={`${path('parts')}?cat=${cat.slug}`} className="detail__brand">
                  {text(cat.name)}
                </Link>
              )}
              <h1 className="h1 detail__title">{name}</h1>
              <p className="oem">
                <span>{t('common.oem')}</span>
                <b className="num">{p.oemCode}</b>
              </p>
              {desc && <p className="detail__lead">{desc}</p>}
              {isFallback(p.description) && <NotTranslatedNote />}
              {brands.length > 0 && (
                <div className="detail__brands">
                  <p className="label">{t('parts.compatibleBrands')}</p>
                  <ul className="taglist">
                    {brands.map((b) => (
                      <li key={b.id}>
                        <Link to={path('brand', { slug: b.slug })}>{b.name}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="buybox">
                <div className="buybox__row">
                  <AvailabilityBadge value={p.availability} />
                  <PriceLine item={p} />
                </div>
                <WhatsAppButton kind="part" itemId={p.id} product={name} message={message} className="btn btn--wa btn--lg btn--block" />
                <p className="muted buybox__hint">{t('gen.requestHint')}</p>
              </div>
              {p.isDemo && <DemoNote />}
            </div>
          </div>
        </div>
      </div>

      {(hasSpecs(p) || gens.length > 0) && (
        <section className="section section--tight">
          <div className="container part-cols">
            {hasSpecs(p) && (
              <div>
                <h2 className="h2 detail__h2">{t('parts.info')}</h2>
                <SpecTable groups={p.specGroups} />
              </div>
            )}
            {gens.length > 0 && (
              <div>
                <h2 className="h2 detail__h2">{t('parts.compatibleWith')}</h2>
                <ul className="fits">
                  {gens.map((g) => (
                    <li key={g.id}>
                      <Link to={path('generator', { slug: g.slug })}>
                        <span>{modelLabel(g)}</span>
                        <span className="num">{g.kvaPrime} kVA</span>
                        <IconArrow />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="section section--soft section--tight">
          <div className="container">
            <h2 className="h2 detail__h2">{t('parts.related')}</h2>
            <ul className="grid grid--part">
              {related.map((r) => (
                <li key={r.id}>
                  <PartCard p={r} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="stickybar" role="region" aria-label={t('common.inquiry')}>
        <div className="stickybar__price">
          <PriceLine item={p} />
          <AvailabilityBadge value={p.availability} />
        </div>
        <WhatsAppButton kind="part" itemId={p.id} product={name} message={message} className="btn btn--wa" label={t('common.inquiryShort')}>
          {t('common.inquiryShort')}
        </WhatsAppButton>
      </div>
    </article>
  )
}
