import { Link } from 'react-router'
import type { Generator, Manufacturer, Part } from '../../data/types.ts'
import { useData } from '../../data/DataContext.tsx'
import { generatorTitle } from '../../data/queries.ts'
import { useI18n } from '../../i18n/I18nContext.tsx'
import { formatNumber, formatPrice } from '../../lib/format.ts'
import { generatorMessage, partMessage } from '../../lib/whatsapp.ts'
import { SITE_URL } from '../../lib/head.ts'
import { Picture } from '../ui/Picture.tsx'
import { AvailabilityBadge, DemoBadge } from '../ui/Bits.tsx'
import { WhatsAppButton } from '../ui/WhatsAppButton.tsx'
import { IconArrow } from '../ui/Icons.tsx'

/** Typographic wordmark used wherever a manufacturer has no uploaded logo (we do not ship third-party trademarks). */
export function ManufacturerMark({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`mfr-mark ${className}`} aria-hidden="true">
      {name}
    </span>
  )
}

export function PriceLine({ item }: { item: Generator | Part }) {
  const { t, locale } = useI18n()
  const formatted = formatPrice(item.price, locale)
  if (!formatted) return <p className="price price--request">{t('common.priceOnRequest')}</p>
  return (
    <p className="price">
      <span className="num">{formatted}</span>
      {item.isDemo && <small> · {t('common.demo').toLowerCase()}</small>}
    </p>
  )
}

export function useGeneratorView(g: Generator) {
  const { index } = useData()
  const { locale, path } = useI18n()
  const mfr = g.manufacturerId ? index.mfrById.get(g.manufacturerId) : undefined
  const title = generatorTitle(g, mfr, locale)
  const url = `${SITE_URL}${path('generator', { slug: g.slug })}`
  return { mfr, title, url, href: path('generator', { slug: g.slug }) }
}

export function GeneratorCard({ g }: { g: Generator }) {
  const { t, locale } = useI18n()
  const { mfr, title, url, href } = useGeneratorView(g)
  const meta = [
    g.fuelType && t(`fuel.${g.fuelType}` as const),
    g.generatorType && t(`gtype.${g.generatorType}` as const),
    g.phase && t(`phase.${g.phase}` as const),
  ].filter(Boolean) as string[]
  return (
    <article className="card gen-card">
      <div className="gen-card__media">
        <Picture image={g.images[0]} locale={locale} alt={title} sizes="(min-width: 1024px) 28vw, (min-width: 600px) 45vw, 92vw" />
        <div className="gen-card__badges">
          <AvailabilityBadge value={g.availability} />
          {g.isDemo && <DemoBadge />}
        </div>
      </div>
      <div className="gen-card__body">
        <p className="gen-card__brand">{mfr?.name}</p>
        <h3 className="gen-card__title">
          <Link to={href} className="stretched">
            {title}
          </Link>
        </h3>
        <p className="gen-card__power">
          {g.kvaPrime ? (
            <>
              <span className="num">{formatNumber(g.kvaPrime, locale)}</span> <span className="unit">{t('common.kva')}</span>
            </>
          ) : null}
        </p>
        <ul className="gen-card__meta">
          {meta.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <PriceLine item={g} />
      </div>
      <div className="gen-card__actions">
        <Link to={href} className="btn btn--outline btn--sm gen-card__more" tabIndex={-1} aria-hidden="true">
          {t('common.viewDetails')}
          <IconArrow />
        </Link>
        <WhatsAppButton
          kind="generator"
          itemId={g.id}
          product={title}
          iconOnly
          className="btn btn--wa btn--sm btn--icon"
          message={generatorMessage(locale, { name: title, model: g.model, manufacturer: mfr?.name ?? '—', url })}
        />
      </div>
    </article>
  )
}

export function PartCard({ p }: { p: Part }) {
  const { t, locale, path, text } = useI18n()
  const { index } = useData()
  const href = path('part', { slug: p.slug })
  const name = text(p.name)
  const mfr = p.manufacturerId ? index.mfrById.get(p.manufacturerId) : undefined
  const cat = p.categoryId ? index.catById.get(p.categoryId) : undefined
  const fits = (index.gensByPart.get(p.id) ?? []).map((id) => index.genById.get(id)).filter(Boolean) as Generator[]
  const url = `${SITE_URL}${href}`
  return (
    <article className="card part-card">
      <div className="part-card__media">
        <Picture image={p.images[0]} locale={locale} alt={name} sizes="(min-width: 1024px) 22vw, (min-width: 600px) 45vw, 92vw" />
        <div className="gen-card__badges">
          <AvailabilityBadge value={p.availability} />
          {p.isDemo && <DemoBadge />}
        </div>
      </div>
      <div className="part-card__body">
        <p className="gen-card__brand">{cat ? text(cat.name) : t('parts.part')}</p>
        <h3 className="part-card__title">
          <Link to={href} className="stretched">
            {name}
          </Link>
        </h3>
        <p className="part-card__oem">
          <span className="muted">{t('common.oem')}:</span> <span className="num">{p.oemCode}</span>
        </p>
        <p className="part-card__fits muted">{fits.length ? t('parts.compatCount', { n: fits.length }) : mfr?.name ?? ''}</p>
      </div>
      <div className="gen-card__actions">
        <Link to={href} className="btn btn--outline btn--sm gen-card__more" tabIndex={-1} aria-hidden="true">
          {t('common.viewDetails')}
          <IconArrow />
        </Link>
        <WhatsAppButton
          kind="part"
          itemId={p.id}
          product={name}
          iconOnly
          className="btn btn--wa btn--sm btn--icon"
          message={partMessage(locale, {
            name,
            oem: p.oemCode,
            compatible: fits
              .slice(0, 3)
              .map((g) => `${index.mfrById.get(g.manufacturerId ?? '')?.name ?? ''} ${g.model}`.trim())
              .join(', '),
            url,
          })}
        />
      </div>
    </article>
  )
}

export function BrandCard({ m, count }: { m: Manufacturer; count: number }) {
  const { t, path, locale } = useI18n()
  return (
    <Link to={path('brand', { slug: m.slug })} className="card brand-card">
      <div className="brand-card__logo">
        {m.logo ? <Picture image={m.logo} locale={locale} alt={m.name} fit="contain" /> : <ManufacturerMark name={m.name} />}
        {m.logo ? null : <span className="sr-only">{m.name}</span>}
      </div>
      <div className="brand-card__foot">
        <span>{t('common.models', { n: count })}</span>
        <IconArrow />
      </div>
    </Link>
  )
}
