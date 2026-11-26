import { useParams } from 'react-router'
import { useData } from '../data/DataContext.tsx'
import { useI18n } from '../i18n/I18nContext.tsx'
import { useSeo } from '../lib/useSeo.ts'
import { breadcrumbLd } from '../lib/jsonld.ts'
import { exact } from '../lib/text.ts'
import { LOCALES } from '../data/types.ts'
import { WhenReady } from '../components/ui/States.tsx'
import { BrandCard, ManufacturerMark } from '../components/catalogue/bits.tsx'
import { GeneratorBrowser } from '../components/catalogue/GeneratorBrowser.tsx'
import { NotTranslatedNote } from '../components/ui/Bits.tsx'
import { Picture } from '../components/ui/Picture.tsx'
import { PageHeader } from './PageHeader.tsx'
import NotFoundPage from './NotFound.tsx'

export default function BrandsPage() {
  const { t, path } = useI18n()
  useSeo({
    title: t('brands.title'),
    description: t('brands.lead'),
    route: 'brands',
    jsonLd: [breadcrumbLd([{ name: t('nav.home'), path: path('home') }, { name: t('brands.title'), path: path('brands') }])],
  })
  return (
    <>
      <PageHeader crumbs={[{ label: t('nav.home'), to: path('home') }, { label: t('brands.title') }]} title={t('brands.title')} lead={t('brands.lead')} />
      <section className="section section--tight">
        <div className="container">
          <WhenReady>
            <BrandsGrid />
          </WhenReady>
        </div>
      </section>
    </>
  )
}

function BrandsGrid() {
  const { catalogue } = useData()
  return (
    <ul className="grid grid--brands">
      {catalogue.manufacturers.map((m) => (
        <li key={m.id}>
          <BrandCard m={m} count={catalogue.generators.filter((g) => g.manufacturerId === m.id).length} />
        </li>
      ))}
    </ul>
  )
}

export function BrandPage() {
  const { slug = '' } = useParams()
  const { t, path, text, locale, isFallback } = useI18n()
  const { index, catalogue, status } = useData()
  const m = index.mfrBySlug.get(slug)
  const count = m ? catalogue.generators.filter((g) => g.manufacturerId === m.id).length : 0
  const desc = m ? text(m.description) : ''
  useSeo({
    title: m ? (text(m.seo.title) || `${m.name} — ${t('brands.models')}`) : t('nf.title'),
    description: m ? (text(m.seo.description) || desc || undefined) : undefined,
    route: 'brand',
    params: { slug },
    noindex: status === 'ready' && !m,
    translatedLocales: m ? LOCALES.filter((l) => !!exact(m.description, l)) : undefined,
    image: m?.cover?.url,
    jsonLd: m
      ? [
          breadcrumbLd([
            { name: t('nav.home'), path: path('home') },
            { name: t('brands.title'), path: path('brands') },
            { name: m.name, path: path('brand', { slug }) },
          ]),
        ]
      : [],
  })
  if (status === 'ready' && !m) return <NotFoundPage />
  return (
    <>
      <PageHeader
        crumbs={[{ label: t('nav.home'), to: path('home') }, { label: t('brands.title'), to: path('brands') }, { label: m?.name ?? '' }]}
        title={m?.name ?? ''}
        lead={desc}
        aside={
          m && (
            <div className="brand-hero">
              {m.cover ? <Picture image={m.cover} locale={locale} alt={m.name} fit="cover" /> : m.logo ? <Picture image={m.logo} locale={locale} alt={m.name} /> : <ManufacturerMark name={m.name} className="mfr-mark--lg" />}
              <p className="brand-hero__count">{t('common.models', { n: count })}</p>
            </div>
          )
        }
      >
        {m && isFallback(m.description) && <NotTranslatedNote />}
      </PageHeader>
      <section className="section section--tight">
        <div className="container">
          <WhenReady>
            <h2 className="h2 browser__heading">{t('brands.models')}</h2>
            {count === 0 ? <p className="muted">{t('brands.noModels')}</p> : <GeneratorBrowser lock={{ manufacturer: slug }} />}
          </WhenReady>
        </div>
      </section>
    </>
  )
}
