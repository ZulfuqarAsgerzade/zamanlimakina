import { useParams } from 'react-router'
import { useData } from '../data/DataContext.tsx'
import { useI18n } from '../i18n/I18nContext.tsx'
import { useSeo } from '../lib/useSeo.ts'
import { breadcrumbLd } from '../lib/jsonld.ts'
import { WhenReady } from '../components/ui/States.tsx'
import { GeneratorBrowser } from '../components/catalogue/GeneratorBrowser.tsx'
import { PageHeader } from './PageHeader.tsx'
import NotFoundPage from './NotFound.tsx'

export default function GeneratorsPage() {
  const { t, path } = useI18n()
  useSeo({
    title: t('cat.title'),
    description: t('cat.lead'),
    route: 'generators',
    jsonLd: [breadcrumbLd([{ name: t('nav.home'), path: path('home') }, { name: t('cat.title'), path: path('generators') }])],
  })
  return (
    <>
      <PageHeader crumbs={[{ label: t('nav.home'), to: path('home') }, { label: t('cat.title') }]} title={t('cat.title')} lead={t('cat.lead')} />
      <section className="section section--tight">
        <div className="container">
          <WhenReady>
            <GeneratorBrowser />
          </WhenReady>
        </div>
      </section>
    </>
  )
}

export function GeneratorCategoryPage() {
  const { slug = '' } = useParams()
  const { t, path, text } = useI18n()
  const { index, status } = useData()
  const cat = index.catBySlug.get(`generator:${slug}`)
  const name = cat ? text(cat.name) : ''
  useSeo({
    title: cat ? t('cat.categoryTitle', { name }) : t('nf.title'),
    description: cat ? text(cat.description) : undefined,
    route: 'generatorCategory',
    params: { slug },
    noindex: status === 'ready' && !cat,
    jsonLd: cat
      ? [
          breadcrumbLd([
            { name: t('nav.home'), path: path('home') },
            { name: t('cat.title'), path: path('generators') },
            { name, path: path('generatorCategory', { slug }) },
          ]),
        ]
      : [],
  })
  if (status === 'ready' && !cat) return <NotFoundPage />
  return (
    <>
      <PageHeader
        crumbs={[{ label: t('nav.home'), to: path('home') }, { label: t('cat.title'), to: path('generators') }, { label: name }]}
        title={name || t('cat.title')}
        lead={cat ? text(cat.description) : undefined}
      />
      <section className="section section--tight">
        <div className="container">
          <WhenReady>
            <GeneratorBrowser lock={{ category: slug }} />
          </WhenReady>
        </div>
      </section>
    </>
  )
}
