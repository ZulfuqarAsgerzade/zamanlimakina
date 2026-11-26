import { useEffect, useMemo, useState } from 'react'
import { useData } from '../../data/DataContext.tsx'
import { activeGeneratorFilterCount, emptyGeneratorFilters, filterGenerators } from '../../data/queries.ts'
import type { GeneratorFilters, GeneratorSort } from '../../data/queries.ts'
import {
  AVAILABILITIES,
  COOLING_SYSTEMS,
  FUEL_TYPES,
  GENERATOR_TYPES,
  PHASES,
} from '../../data/types.ts'
import { useI18n } from '../../i18n/I18nContext.tsx'
import { EmptyState } from '../ui/Bits.tsx'
import { IconFilter, IconSearch } from '../ui/Icons.tsx'
import { GeneratorCard } from './bits.tsx'
import { ActiveChips, Drawer, FilterGroup, toggle } from './FilterUI.tsx'
import type { FacetOption } from './FilterUI.tsx'
import { useGeneratorFilters } from './params.ts'

const PAGE = 12

interface Lock {
  manufacturer?: string
  category?: string
}

function countBy<T>(items: T[], key: (i: T) => string | number | null | undefined): Map<string, number> {
  const m = new Map<string, number>()
  for (const i of items) {
    const k = key(i)
    if (k === null || k === undefined) continue
    m.set(String(k), (m.get(String(k)) ?? 0) + 1)
  }
  return m
}

/**
 * Searchable / filterable / sortable generator grid (filter sidebar on desktop, drawer on mobile).
 * Optionally locked to a manufacturer or category (brand & category pages).
 */
export function GeneratorBrowser({ lock = {} }: { lock?: Lock }) {
  const { t, locale, text } = useI18n()
  const { catalogue, index } = useData()
  const [raw, setFilters] = useGeneratorFilters()
  const [drawer, setDrawer] = useState(false)
  const [visible, setVisible] = useState(PAGE)

  const filters: GeneratorFilters = useMemo(
    () => ({
      ...raw,
      manufacturers: lock.manufacturer ? [lock.manufacturer] : raw.manufacturers,
      categories: lock.category ? [lock.category] : raw.categories,
    }),
    [raw, lock.manufacturer, lock.category],
  )
  const scoped = useMemo(
    () =>
      catalogue.generators.filter((g) => {
        if (lock.manufacturer && index.mfrById.get(g.manufacturerId ?? '')?.slug !== lock.manufacturer) return false
        if (lock.category && index.catById.get(g.categoryId ?? '')?.slug !== lock.category) return false
        return true
      }),
    [catalogue.generators, index, lock.manufacturer, lock.category],
  )
  const results = useMemo(() => filterGenerators(scoped, filters, index, locale), [scoped, filters, index, locale])
  useEffect(() => setVisible(PAGE), [raw])

  const update = (patch: Partial<GeneratorFilters>) => setFilters({ ...raw, ...patch })
  const clearAll = () => setFilters({ ...emptyGeneratorFilters(), sort: raw.sort })

  /** facet counts: apply every filter except the facet's own, so users see what each choice would yield */
  const facet = (clear: Partial<GeneratorFilters>) => filterGenerators(scoped, { ...filters, ...clear }, index, locale)

  const mfrOpts: FacetOption[] = useMemo(() => {
    const counts = countBy(facet({ manufacturers: [] }), (g) => index.mfrById.get(g.manufacturerId ?? '')?.slug)
    return catalogue.manufacturers
      .filter((m) => scoped.some((g) => g.manufacturerId === m.id))
      .map((m) => ({ value: m.slug, label: m.name, count: counts.get(m.slug) ?? 0 }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue.manufacturers, scoped, filters, index, locale])
  const catOpts: FacetOption[] = useMemo(() => {
    const counts = countBy(facet({ categories: [] }), (g) => index.catById.get(g.categoryId ?? '')?.slug)
    return catalogue.categories
      .filter((c) => c.kind === 'generator' && scoped.some((g) => g.categoryId === c.id))
      .map((c) => ({ value: c.slug, label: text(c.name), count: counts.get(c.slug) ?? 0 }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue.categories, scoped, filters, index, locale])
  const enumOpts = <T extends string | number>(all: readonly T[], clear: Partial<GeneratorFilters>, get: (g: (typeof scoped)[number]) => T | null, label: (v: T) => string): FacetOption[] => {
    const counts = countBy(facet(clear), get)
    return all.filter((v) => scoped.some((g) => get(g) === v)).map((v) => ({ value: String(v), label: label(v), count: counts.get(String(v)) ?? 0 }))
  }
  const typeOpts = enumOpts(GENERATOR_TYPES, { types: [] }, (g) => g.generatorType, (v) => t(`gtype.${v}` as const))
  const fuelOpts = enumOpts(FUEL_TYPES, { fuels: [] }, (g) => g.fuelType, (v) => t(`fuel.${v}` as const))
  const phaseOpts = enumOpts(PHASES, { phases: [] }, (g) => g.phase, (v) => t(`phase.${v}` as const))
  const coolOpts = enumOpts(COOLING_SYSTEMS, { coolings: [] }, (g) => g.coolingSystem, (v) => t(`cooling.${v}` as const))
  const availOpts = enumOpts(AVAILABILITIES, { availability: [] }, (g) => g.availability, (v) => t(`availability.${v}` as const))

  const activeCount = activeGeneratorFilterCount({ ...raw, manufacturers: lock.manufacturer ? [] : raw.manufacturers, categories: lock.category ? [] : raw.categories })

  const chips = [
    ...(raw.q.trim() ? [{ key: 'q', label: `“${raw.q.trim()}”`, remove: () => update({ q: '' }) }] : []),
    ...(lock.manufacturer ? [] : raw.manufacturers.map((s) => ({ key: `b-${s}`, label: index.mfrBySlug.get(s)?.name ?? s, remove: () => update({ manufacturers: raw.manufacturers.filter((x) => x !== s) }) }))),
    ...(lock.category ? [] : raw.categories.map((s) => ({ key: `c-${s}`, label: text(index.catBySlug.get(`generator:${s}`)?.name), remove: () => update({ categories: raw.categories.filter((x) => x !== s) }) }))),
    ...raw.types.map((v) => ({ key: `t-${v}`, label: t(`gtype.${v}` as const), remove: () => update({ types: raw.types.filter((x) => x !== v) }) })),
    ...raw.fuels.map((v) => ({ key: `f-${v}`, label: t(`fuel.${v}` as const), remove: () => update({ fuels: raw.fuels.filter((x) => x !== v) }) })),
    ...raw.phases.map((v) => ({ key: `p-${v}`, label: t(`phase.${v}` as const), remove: () => update({ phases: raw.phases.filter((x) => x !== v) }) })),
    ...raw.coolings.map((v) => ({ key: `o-${v}`, label: t(`cooling.${v}` as const), remove: () => update({ coolings: raw.coolings.filter((x) => x !== v) }) })),
    ...raw.availability.map((v) => ({ key: `a-${v}`, label: t(`availability.${v}` as const), remove: () => update({ availability: raw.availability.filter((x) => x !== v) }) })),
    ...(raw.kvaMin !== null ? [{ key: 'min', label: `≥ ${raw.kvaMin} ${t('common.kva')}`, remove: () => update({ kvaMin: null }) }] : []),
    ...(raw.kvaMax !== null ? [{ key: 'max', label: `≤ ${raw.kvaMax} ${t('common.kva')}`, remove: () => update({ kvaMax: null }) }] : []),
  ]

  const panel = (
    <div className="fpanel">
      {!lock.manufacturer && <FilterGroup title={t('common.manufacturer')} options={mfrOpts} selected={raw.manufacturers} onToggle={(v) => update({ manufacturers: toggle(raw.manufacturers, v) })} />}
      {!lock.category && <FilterGroup title={t('common.category')} options={catOpts} selected={raw.categories} onToggle={(v) => update({ categories: toggle(raw.categories, v) })} defaultOpen={false} />}
      <details className="fgroup" open>
        <summary>
          <span>{t('cat.power')}</span>
        </summary>
        <div className="range">
          <RangeInput label={t('cat.powerFrom')} value={raw.kvaMin} onCommit={(v) => update({ kvaMin: v })} />
          <span aria-hidden="true">–</span>
          <RangeInput label={t('cat.powerTo')} value={raw.kvaMax} onCommit={(v) => update({ kvaMax: v })} />
        </div>
      </details>
      <FilterGroup title={t('common.type')} options={typeOpts} selected={raw.types} onToggle={(v) => update({ types: toggle(raw.types, v as never) })} />
      <FilterGroup title={t('common.fuel')} options={fuelOpts} selected={raw.fuels} onToggle={(v) => update({ fuels: toggle(raw.fuels, v as never) })} defaultOpen={fuelOpts.length > 1} />
      <FilterGroup title={t('common.phase')} options={phaseOpts} selected={raw.phases.map(String)} onToggle={(v) => update({ phases: toggle(raw.phases, Number(v) as never) })} defaultOpen={phaseOpts.length > 1} />
      <FilterGroup title={t('common.cooling')} options={coolOpts} selected={raw.coolings} onToggle={(v) => update({ coolings: toggle(raw.coolings, v as never) })} defaultOpen={coolOpts.length > 1} />
      <FilterGroup title={t('common.availability')} options={availOpts} selected={raw.availability} onToggle={(v) => update({ availability: toggle(raw.availability, v as never) })} />
    </div>
  )

  const sorts: GeneratorSort[] = ['featured', 'powerAsc', 'powerDesc', 'name', 'newest']

  return (
    <div className="browser">
      <div className="browser__toolbar">
        <div className="searchbox">
          <IconSearch aria-hidden="true" />
          <input
            className="searchbox__input"
            type="search"
            value={raw.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder={t('cat.searchPlaceholder')}
            aria-label={t('cat.searchPlaceholder')}
          />
        </div>
        <button type="button" className="btn btn--outline browser__filter-btn" onClick={() => setDrawer(true)}>
          <IconFilter />
          {t('cat.filters')}
          {activeCount > 0 && <span className="pill">{activeCount}</span>}
        </button>
        <label className="sortbox">
          <span className="sr-only">{t('common.sortBy')}</span>
          <select className="select" value={raw.sort} onChange={(e) => update({ sort: e.target.value as GeneratorSort })}>
            {sorts.map((s) => (
              <option key={s} value={s}>
                {t(`cat.sort.${s}` as const)}
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
          {panel}
        </aside>

        <div className="browser__main">
          <div className="browser__meta" aria-live="polite">
            <p>{t('common.results', { n: results.length })}</p>
          </div>
          <ActiveChips chips={chips} onClear={clearAll} clearLabel={t('cat.clearAll')} />
          {results.length === 0 ? (
            <EmptyState
              title={t('cat.empty')}
              hint={t('cat.emptyHint')}
              action={
                activeCount > 0 ? (
                  <button type="button" className="btn btn--dark btn--sm" onClick={clearAll}>
                    {t('cat.clearAll')}
                  </button>
                ) : undefined
              }
            />
          ) : (
            <>
              <ul className="grid grid--gen">
                {results.slice(0, visible).map((g) => (
                  <li key={g.id}>
                    <GeneratorCard g={g} />
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
        {panel}
      </Drawer>
    </div>
  )
}

function RangeInput({ label, value, onCommit }: { label: string; value: number | null; onCommit: (v: number | null) => void }) {
  const [v, setV] = useState(value === null ? '' : String(value))
  useEffect(() => setV(value === null ? '' : String(value)), [value])
  const commit = () => {
    const n = v.trim() === '' ? null : Number(v)
    onCommit(n !== null && Number.isFinite(n) && n >= 0 ? n : null)
  }
  return (
    <label className="range__field">
      <span className="sr-only">{label}</span>
      <input
        className="input"
        inputMode="numeric"
        type="number"
        min={0}
        placeholder={label}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
      />
    </label>
  )
}
