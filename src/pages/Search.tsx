import { useMemo } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useData } from '../data/DataContext.tsx'
import { searchAll } from '../data/queries.ts'
import { useI18n } from '../i18n/I18nContext.tsx'
import { useSeo } from '../lib/useSeo.ts'
import { WhenReady } from '../components/ui/States.tsx'
import { EmptyState } from '../components/ui/Bits.tsx'
import { IconSearch } from '../components/ui/Icons.tsx'
import { BrandCard, GeneratorCard, PartCard } from '../components/catalogue/bits.tsx'
import { PageHeader } from './PageHeader.tsx'

export default function SearchPage() {
  const { t, path } = useI18n()
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const q = (sp.get('q') ?? '').trim()
  useSeo({ title: q ? t('search.for', { q }) : t('search.title'), route: 'search', noindex: true })
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const v = String(new FormData(e.currentTarget).get('q') ?? '').trim()
    navigate(`${path('search')}?q=${encodeURIComponent(v)}`, { replace: true })
  }
  return (
    <>
      <PageHeader crumbs={[{ label: t('nav.home'), to: path('home') }, { label: t('search.title') }]} title={q ? t('search.for', { q }) : t('search.title')}>
        <form className="searchbox searchbox--lg" role="search" onSubmit={submit} key={q}>
          <IconSearch aria-hidden="true" />
          <input className="searchbox__input" name="q" type="search" defaultValue={q} placeholder={t('search.placeholder')} aria-label={t('search.placeholder')} />
          <button type="submit" className="btn btn--dark btn--sm">
            {t('common.search')}
          </button>
        </form>
      </PageHeader>
      <section className="section section--tight">
        <div className="container">
          <WhenReady>
            <Results q={q} />
          </WhenReady>
        </div>
      </section>
    </>
  )
}

function Results({ q }: { q: string }) {
  const { t, locale, path } = useI18n()
  const { catalogue, index } = useData()
  const res = useMemo(() => searchAll(catalogue, q, index, locale), [catalogue, q, index, locale])
  if (q.length < 2) return <p className="muted">{t('search.prompt')}</p>
  const total = res.generators.length + res.parts.length + res.manufacturers.length
  if (!total) return <EmptyState title={t('search.empty')} hint={t('search.emptyHint')} action={<Link to={path('generators')} className="btn btn--dark btn--sm">{t('nav.generators')}</Link>} />
  return (
    <div className="search-results">
      {res.manufacturers.length > 0 && (
        <section>
          <h2 className="h3">{t('search.brands')}</h2>
          <ul className="grid grid--brands">
            {res.manufacturers.map((m) => (
              <li key={m.id}>
                <BrandCard m={m} count={catalogue.generators.filter((g) => g.manufacturerId === m.id).length} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {res.generators.length > 0 && (
        <section>
          <h2 className="h3">
            {t('search.generators')} <span className="count">{res.generators.length}</span>
          </h2>
          <ul className="grid grid--gen">
            {res.generators.slice(0, 12).map((g) => (
              <li key={g.id}>
                <GeneratorCard g={g} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {res.parts.length > 0 && (
        <section>
          <h2 className="h3">
            {t('search.parts')} <span className="count">{res.parts.length}</span>
          </h2>
          <ul className="grid grid--part">
            {res.parts.slice(0, 12).map((p) => (
              <li key={p.id}>
                <PartCard p={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
