import { useEffect, useMemo, useState } from 'react'
import { useData } from '../../data/DataContext.tsx'
import { activePartFilterCount, emptyPartFilters, filterParts, partManufacturers } from '../../data/queries.ts'
import type { PartFilters, PartSort } from '../../data/queries.ts'
import { AVAILABILITIES } from '../../data/types.ts'
import { useI18n } from '../../i18n/I18nContext.tsx'
import { EmptyState } from '../ui/Bits.tsx'
import { IconFilter, IconSearch } from '../ui/Icons.tsx'
import { PartCard } from './bits.tsx'
import { ActiveChips, Drawer, FilterGroup, toggle } from './FilterUI.tsx'
import type { FacetOption } from './FilterUI.tsx'
import { usePartFilters } from './params.ts'

const PAGE = 12

/** Spare-parts catalogue: search by name / OEM / manufacturer / generator model; filter by category, brand, model. */
export function PartBrowser() {
  const { t, locale, text } = useI18n()
  const { catalogue, index } = useData()
  const [f, setFilters] = usePartFilters()
  const [drawer, setDrawer] = useState(false)
  const [visible, setVisible] = useState(PAGE)

  const results = useMemo(() => filterParts(catalogue.parts, f, index, locale), [catalogue.parts, f, index, locale])
  useEffect(() => setVisible(PAGE), [f])
  const update = (patch: Partial<PartFilters>) => setFilters({ ...f, ...patch })
  const clearAll = () => setFilters({ ...emptyPartFilters(), sort: f.sort })
  const activeCount = activePartFilterCount(f)

  const facet = (clear: Partial<PartFilters>) => filterParts(catalogue.parts, { ...f, ...clear }, index, locale)

  const catOpts: FacetOption[] = useMemo(() => {
    const base = facet({ categories: [] })
    return catalogue.categories
      .filter((c) => c.kind === 'part')
      .map((c) => ({ value: c.slug, label: text(c.name), count: base.filter((p) => p.categoryId === c.id).length }))
      .filter((o) => o.count > 0 || f.categories.includes(o.value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue, f, index, locale])
  const mfrOpts: FacetOption[] = useMemo(() => {
    const base = facet({ manufacturers: [] })
    return catalogue.manufacturers
      .map((m) => ({ value: m.slug, label: m.name, count: base.filter((p) => partManufacturers(p, index).some((x) => x.id === m.id)).length }))
      .filter((o) => o.count > 0 || f.manufacturers.includes(o.value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue, f, index, locale])
  const availOpts: FacetOption[] = useMemo(() => {
    const base = facet({ availability: [] })
    return AVAILABILITIES.map((a) => ({ value: a, label: t(`availability.${a}` as const), count: base.filter((p) => p.availability === a).length })).filter(
      (o) => o.count > 0 || f.availability.includes(o.value as never),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue, f, index, locale])

  const genOptions = useMemo(
    () =>
      [...catalogue.generators]
        .filter((g) => (index.partsByGen.get(g.id)?.length ?? 0) > 0)
        .sort((a, b) => (index.mfrById.get(a.manufacturerId ?? '')?.name ?? '').localeCompare(index.mfrById.get(b.manufacturerId ?? '')?.name ?? '') || (a.kvaPrime ?? 0) - (b.kvaPrime ?? 0)),
    [catalogue.generators, index],
  )

  const chips = [
    ...(f.q.trim() ? [{ key: 'q', label: `“${f.q.trim()}”`, remove: () => update({ q: '' }) }] : []),
    ...f.manufacturers.map((s) => ({ key: `b-${s}`, label: index.mfrBySlug.get(s)?.name ?? s, remove: () => update({ manufacturers: f.manufacturers.filter((x) => x !== s) }) })),
    ...f.categories.map((s) => ({ key: `c-${s}`, label: text(index.catBySlug.get(`part:${s}`)?.name), remove: () => update({ categories: f.categories.filter((x) => x !== s) }) })),
    ...(f.generator ? [{ key: 'g', label: index.genBySlug.get(f.generator)?.model ?? f.generator, remove: () => update({ generator: '' }) }] : []),
    ...f.availability.map((v) => ({ key: `a-${v}`, label: t(`availability.${v}` as const), remove: () => update({ availability: f.availability.filter((x) => x !== v) }) })),
  ]

  const panel = (suffix: string) => (
    <div className="fpanel">
      <div className="field fpanel__model">
        <label htmlFor={`part-model-${suffix}`}>{t('parts.generatorModel')}</label>
        <select id={`part-model-${suffix}`} className="select" value={f.generator} onChange={(e) => update({ generator: e.target.value })}>
          <option value="">{t('common.all')}</option>
          {genOptions.map((g) => (
            <option key={g.id} value={g.slug}>
              {index.mfrById.get(g.manufacturerId ?? '')?.name} {g.model}
            </option>
          ))}
        </select>
      </div>
      <FilterGroup title={t('common.category')} options={catOpts} selected={f.categories} onToggle={(v) => update({ categories: toggle(f.categories, v) })} />
      <FilterGroup title={t('common.manufacturer')} options={mfrOpts} selected={f.manufacturers} onToggle={(v) => update({ manufacturers: toggle(f.manufacturers, v) })} />
      <FilterGroup title={t('common.availability')} options={availOpts} selected={f.availability} onToggle={(v) => update({ availability: toggle(f.availability, v as never) })} />
    </div>
  )

  const sorts: PartSort[] = ['name', 'oem', 'newest']
  return (
    <div className="browser">
      <div className="browser__toolbar">
        <div className="searchbox">
          <IconSearch aria-hidden="true" />
          <input
            className="searchbox__input"
            type="search"
            value={f.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder={t('parts.searchPlaceholder')}
            aria-label={t('parts.searchPlaceholder')}
          />
        </div>
        <button type="button" className="btn btn--outline browser__filter-btn" onClick={() => setDrawer(true)}>
          <IconFilter />
          {t('cat.filters')}
          {activeCount > 0 && <span className="pill">{activeCount}</span>}
        </button>
        <label className="sortbox">
          <span className="sr-only">{t('common.sortBy')}</span>
          <select className="select" value={f.sort} onChange={(e) => update({ sort: e.target.value as PartSort })}>
            {sorts.map((s) => (
              <option key={s} value={s}>
                {t(`parts.sort.${s}` as const)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="browser__layout">
        <aside className="browser__side" aria-label={t('cat.filters')}>
          <div className="browser__side-head">
            <h2 className="h3">{t('cat.filters')}</h2>
            {activeCount > 0 && (
              <button type="button" className="textbtn" onClick={clearAll}>
                {t('cat.clearAll')}
              </button>
            )}
          </div>
          {panel('side')}
        </aside>
        <div className="browser__main">
          <div className="browser__meta" aria-live="polite">
            <p>{t('common.results', { n: results.length })}</p>
          </div>
          <ActiveChips chips={chips} onClear={clearAll} clearLabel={t('cat.clearAll')} />
          {results.length === 0 ? (
            <EmptyState title={t('parts.empty')} hint={t('cat.emptyHint')} action={activeCount > 0 ? <button type="button" className="btn btn--dark btn--sm" onClick={clearAll}>{t('cat.clearAll')}</button> : undefined} />
          ) : (
            <>
              <ul className="grid grid--part">
                {results.slice(0, visible).map((p) => (
                  <li key={p.id}>
                    <PartCard p={p} />
                  </li>
                ))}
              </ul>
              {visible < results.length && (
                <div className="loadmore">
                  <p className="muted">{t('common.showing', { shown: Math.min(visible, results.length), total: results.length })}</p>
                  <button type="button" className="btn btn--outline" onClick={() => setVisible((v) => v + PAGE)}>
                    {t('common.loadMore')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title={t('cat.filters')}
        footer={
          <>
            <button type="button" className="btn btn--outline" onClick={clearAll} disabled={activeCount === 0}>
              {t('common.clear')}
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setDrawer(false)}>
              {t('common.results', { n: results.length })}
            </button>
          </>
        }
      >
        {panel('drawer')}
      </Drawer>
    </div>
  )
}
