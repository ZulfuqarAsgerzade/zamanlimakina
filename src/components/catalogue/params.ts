import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import {
  AVAILABILITIES,
  COOLING_SYSTEMS,
  FUEL_TYPES,
  GENERATOR_TYPES,
} from '../../data/types.ts'
import type { Availability, CoolingSystem, FuelType, GeneratorType, Phase } from '../../data/types.ts'
import { emptyGeneratorFilters, emptyPartFilters } from '../../data/queries.ts'
import type { GeneratorFilters, GeneratorSort, PartFilters, PartSort } from '../../data/queries.ts'

const csv = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])
const only = <T extends string>(vals: string[], allowed: readonly T[]) => vals.filter((x): x is T => (allowed as readonly string[]).includes(x))
const num = (v: string | null) => {
  if (v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}
const SORTS: GeneratorSort[] = ['featured', 'powerAsc', 'powerDesc', 'name', 'newest']
const PART_SORTS: PartSort[] = ['name', 'oem', 'newest']

export function parseGeneratorFilters(sp: URLSearchParams): GeneratorFilters {
  const sort = sp.get('sort') as GeneratorSort
  return {
    ...emptyGeneratorFilters(),
    q: sp.get('q') ?? '',
    manufacturers: csv(sp.get('brand')),
    categories: csv(sp.get('cat')),
    types: only<GeneratorType>(csv(sp.get('type')), GENERATOR_TYPES),
    fuels: only<FuelType>(csv(sp.get('fuel')), FUEL_TYPES),
    phases: csv(sp.get('phase')).map(Number).filter((n): n is Phase => n === 1 || n === 3),
    coolings: only<CoolingSystem>(csv(sp.get('cool')), COOLING_SYSTEMS),
    availability: only<Availability>(csv(sp.get('avail')), AVAILABILITIES),
    kvaMin: num(sp.get('min')),
    kvaMax: num(sp.get('max')),
    sort: SORTS.includes(sort) ? sort : 'featured',
  }
}

export function serializeGeneratorFilters(f: GeneratorFilters, prev: URLSearchParams): URLSearchParams {
  const sp = new URLSearchParams()
  const set = (k: string, v: string | number | null | undefined | string[]) => {
    const s = Array.isArray(v) ? v.join(',') : v === null || v === undefined ? '' : String(v)
    if (s) sp.set(k, s)
  }
  set('q', f.q.trim())
  set('brand', f.manufacturers)
  set('cat', f.categories)
  set('type', f.types)
  set('fuel', f.fuels)
  set('phase', f.phases.map(String))
  set('cool', f.coolings)
  set('avail', f.availability)
  set('min', f.kvaMin)
  set('max', f.kvaMax)
  if (f.sort !== 'featured') set('sort', f.sort)
  void prev
  return sp
}

export function parsePartFilters(sp: URLSearchParams): PartFilters {
  const sort = sp.get('sort') as PartSort
  return {
    ...emptyPartFilters(),
    q: sp.get('q') ?? '',
    manufacturers: csv(sp.get('brand')),
    categories: csv(sp.get('cat')),
    generator: sp.get('model') ?? '',
    availability: only<Availability>(csv(sp.get('avail')), AVAILABILITIES),
    sort: PART_SORTS.includes(sort) ? sort : 'name',
  }
}

export function serializePartFilters(f: PartFilters): URLSearchParams {
  const sp = new URLSearchParams()
  if (f.q.trim()) sp.set('q', f.q.trim())
  if (f.manufacturers.length) sp.set('brand', f.manufacturers.join(','))
  if (f.categories.length) sp.set('cat', f.categories.join(','))
  if (f.generator) sp.set('model', f.generator)
  if (f.availability.length) sp.set('avail', f.availability.join(','))
  if (f.sort !== 'name') sp.set('sort', f.sort)
  return sp
}

/** Filter state kept in the URL (shareable links, back button works, SEO-friendly category links). */
export function useGeneratorFilters() {
  const [sp, setSp] = useSearchParams()
  const filters = useMemo(() => parseGeneratorFilters(sp), [sp])
  const setFilters = useCallback(
    (next: GeneratorFilters) => setSp(serializeGeneratorFilters(next, sp), { replace: true, preventScrollReset: true }),
    [sp, setSp],
  )
  return [filters, setFilters] as const
}

export function usePartFilters() {
  const [sp, setSp] = useSearchParams()
  const filters = useMemo(() => parsePartFilters(sp), [sp])
  const setFilters = useCallback(
    (next: PartFilters) => setSp(serializePartFilters(next), { replace: true, preventScrollReset: true }),
    [setSp],
  )
  return [filters, setFilters] as const
}
