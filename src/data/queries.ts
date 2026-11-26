import { pickText } from '../lib/text.ts'
import { slugify } from '../lib/slug.ts'
import type {
  Availability,
  Catalogue,
  Category,
  CoolingSystem,
  FuelType,
  Generator,
  GeneratorType,
  Locale,
  Manufacturer,
  Part,
  Phase,
} from './types.ts'

/* ───────────── search normalisation ───────────── */

/** Lowercase, fold Azerbaijani/Russian letters to latin, drop punctuation: "1104A-44TG2" ≈ "1104a 44tg2". */
export function fold(input: string): string {
  return slugify(input).replace(/-/g, ' ')
}
const compact = (s: string) => s.replace(/\s+/g, '')

export function matchesQuery(haystacks: string[], query: string): boolean {
  const q = fold(query).trim()
  if (!q) return true
  const hay = haystacks.map(fold).join(' ')
  const hayCompact = compact(hay)
  return q.split(' ').every((tok) => hay.includes(tok) || hayCompact.includes(compact(tok)))
}

/* ───────────── indexes ───────────── */

export interface CatalogueIndex {
  mfrById: Map<string, Manufacturer>
  mfrBySlug: Map<string, Manufacturer>
  catById: Map<string, Category>
  catBySlug: Map<string, Category>
  genById: Map<string, Generator>
  genBySlug: Map<string, Generator>
  partById: Map<string, Part>
  partBySlug: Map<string, Part>
  partsByGen: Map<string, string[]>
  gensByPart: Map<string, string[]>
}

export function indexCatalogue(c: Catalogue): CatalogueIndex {
  const idx: CatalogueIndex = {
    mfrById: new Map(c.manufacturers.map((m) => [m.id, m])),
    mfrBySlug: new Map(c.manufacturers.map((m) => [m.slug, m])),
    catById: new Map(c.categories.map((x) => [x.id, x])),
    catBySlug: new Map(c.categories.map((x) => [`${x.kind}:${x.slug}`, x])),
    genById: new Map(c.generators.map((g) => [g.id, g])),
    genBySlug: new Map(c.generators.map((g) => [g.slug, g])),
    partById: new Map(c.parts.map((p) => [p.id, p])),
    partBySlug: new Map(c.parts.map((p) => [p.slug, p])),
    partsByGen: new Map(),
    gensByPart: new Map(),
  }
  for (const { partId, generatorId } of c.compat) {
    if (!idx.partById.has(partId) || !idx.genById.has(generatorId)) continue
    ;(idx.partsByGen.get(generatorId) ?? idx.partsByGen.set(generatorId, []).get(generatorId)!).push(partId)
    ;(idx.gensByPart.get(partId) ?? idx.gensByPart.set(partId, []).get(partId)!).push(generatorId)
  }
  return idx
}

export function generatorTitle(g: Generator, mfr: Manufacturer | undefined, locale: Locale): string {
  const custom = pickText(g.title, locale)
  return custom || [mfr?.name, g.model].filter(Boolean).join(' ')
}

/* ───────────── generator filtering ───────────── */

export type GeneratorSort = 'featured' | 'powerAsc' | 'powerDesc' | 'name' | 'newest'

export interface GeneratorFilters {
  q: string
  manufacturers: string[] // slugs
  categories: string[] // slugs
  types: GeneratorType[]
  fuels: FuelType[]
  phases: Phase[]
  coolings: CoolingSystem[]
  availability: Availability[]
  kvaMin: number | null
  kvaMax: number | null
  sort: GeneratorSort
}

export const emptyGeneratorFilters = (): GeneratorFilters => ({
  q: '',
  manufacturers: [],
  categories: [],
  types: [],
  fuels: [],
  phases: [],
  coolings: [],
  availability: [],
  kvaMin: null,
  kvaMax: null,
  sort: 'featured',
})

export function activeGeneratorFilterCount(f: GeneratorFilters): number {
  return (
    (f.q.trim() ? 1 : 0) +
    f.manufacturers.length +
    f.categories.length +
    f.types.length +
    f.fuels.length +
    f.phases.length +
    f.coolings.length +
    f.availability.length +
    (f.kvaMin !== null ? 1 : 0) +
    (f.kvaMax !== null ? 1 : 0)
  )
}

const inList = <T>(list: T[], v: T | null | undefined) => list.length === 0 || (v !== null && v !== undefined && list.includes(v))

export function generatorSearchText(g: Generator, idx: CatalogueIndex): string[] {
  const m = g.manufacturerId ? idx.mfrById.get(g.manufacturerId) : undefined
  return [g.model, m?.name ?? '', g.slug, g.kvaPrime ? `${g.kvaPrime} kva` : '']
}

export function filterGenerators(gens: Generator[], f: GeneratorFilters, idx: CatalogueIndex, locale: Locale): Generator[] {
  const out = gens.filter((g) => {
    const m = g.manufacturerId ? idx.mfrById.get(g.manufacturerId) : undefined
    const c = g.categoryId ? idx.catById.get(g.categoryId) : undefined
    if (f.manufacturers.length && !(m && f.manufacturers.includes(m.slug))) return false
    if (f.categories.length && !(c && f.categories.includes(c.slug))) return false
    if (!inList(f.types, g.generatorType)) return false
    if (!inList(f.fuels, g.fuelType)) return false
    if (!inList(f.phases, g.phase)) return false
    if (!inList(f.coolings, g.coolingSystem)) return false
    if (!inList(f.availability, g.availability)) return false
    if (f.kvaMin !== null && (g.kvaPrime ?? 0) < f.kvaMin) return false
    if (f.kvaMax !== null && (g.kvaPrime ?? Infinity) > f.kvaMax) return false
    return matchesQuery(generatorSearchText(g, idx), f.q)
  })
  const nameOf = (g: Generator) => generatorTitle(g, g.manufacturerId ? idx.mfrById.get(g.manufacturerId) : undefined, locale)
  const sorters: Record<GeneratorSort, (a: Generator, b: Generator) => number> = {
    featured: (a, b) => Number(b.featured) - Number(a.featured) || (a.kvaPrime ?? 0) - (b.kvaPrime ?? 0),
    powerAsc: (a, b) => (a.kvaPrime ?? 0) - (b.kvaPrime ?? 0),
    powerDesc: (a, b) => (b.kvaPrime ?? 0) - (a.kvaPrime ?? 0),
    name: (a, b) => nameOf(a).localeCompare(nameOf(b), locale),
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  }
  return [...out].sort(sorters[f.sort])
}

/* ───────────── parts filtering ───────────── */

export type PartSort = 'name' | 'oem' | 'newest'

export interface PartFilters {
  q: string
  manufacturers: string[] // slugs
  categories: string[] // slugs
  generator: string // generator slug or ''
  availability: Availability[]
  sort: PartSort
}

export const emptyPartFilters = (): PartFilters => ({
  q: '',
  manufacturers: [],
  categories: [],
  generator: '',
  availability: [],
  sort: 'name',
})

export function activePartFilterCount(f: PartFilters): number {
  return (f.q.trim() ? 1 : 0) + f.manufacturers.length + f.categories.length + (f.generator ? 1 : 0) + f.availability.length
}

/** Manufacturers a part is compatible with: its own + those of the generators it fits. */
export function partManufacturers(p: Part, idx: CatalogueIndex): Manufacturer[] {
  const ids = new Set<string>()
  if (p.manufacturerId) ids.add(p.manufacturerId)
  for (const gid of idx.gensByPart.get(p.id) ?? []) {
    const g = idx.genById.get(gid)
    if (g?.manufacturerId) ids.add(g.manufacturerId)
  }
  return [...ids].map((id) => idx.mfrById.get(id)).filter((m): m is Manufacturer => !!m)
}

export function filterParts(parts: Part[], f: PartFilters, idx: CatalogueIndex, locale: Locale): Part[] {
  const gen = f.generator ? idx.genBySlug.get(f.generator) : undefined
  const fitsGen = gen ? new Set(idx.partsByGen.get(gen.id) ?? []) : null
  const out = parts.filter((p) => {
    if (f.generator && !(fitsGen && fitsGen.has(p.id))) return false
    if (f.categories.length) {
      const c = p.categoryId ? idx.catById.get(p.categoryId) : undefined
      if (!(c && f.categories.includes(c.slug))) return false
    }
    if (f.manufacturers.length) {
      const slugs = partManufacturers(p, idx).map((m) => m.slug)
      if (!f.manufacturers.some((s) => slugs.includes(s))) return false
    }
    if (!inList(f.availability, p.availability)) return false
    const compatModels = (idx.gensByPart.get(p.id) ?? []).map((gid) => idx.genById.get(gid)?.model ?? '')
    return matchesQuery(
      [
        p.name.az ?? '',
        p.name.ru ?? '',
        p.name.en ?? '',
        p.oemCode,
        ...partManufacturers(p, idx).map((m) => m.name),
        ...compatModels,
        p.categoryId ? pickText(idx.catById.get(p.categoryId)?.name, locale) : '',
      ],
      f.q,
    )
  })
  const sorters: Record<PartSort, (a: Part, b: Part) => number> = {
    name: (a, b) => pickText(a.name, locale).localeCompare(pickText(b.name, locale), locale),
    oem: (a, b) => a.oemCode.localeCompare(b.oemCode),
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  }
  return [...out].sort(sorters[f.sort])
}

/* ───────────── relations ───────────── */

export function relatedGenerators(g: Generator, all: Generator[], limit = 4): Generator[] {
  const score = (o: Generator) => {
    let s = 0
    if (g.manufacturerId && o.manufacturerId === g.manufacturerId) s += 3
    if (g.categoryId && o.categoryId === g.categoryId) s += 2
    if (g.kvaPrime && o.kvaPrime) s += Math.max(0, 1 - Math.abs(Math.log(o.kvaPrime / g.kvaPrime)))
    return s
  }
  return all
    .filter((o) => o.id !== g.id)
    .map((o) => ({ o, s: score(o) }))
    .filter((x) => x.s >= 2)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.o)
}

/** Parts that share a category or compatible generators with `p`. */
export function relatedParts(p: Part, all: Part[], idx: CatalogueIndex, limit = 4): Part[] {
  const mine = new Set(idx.gensByPart.get(p.id) ?? [])
  return all
    .filter((o) => o.id !== p.id)
    .map((o) => {
      const shared = (idx.gensByPart.get(o.id) ?? []).filter((id) => mine.has(id)).length
      return { o, s: shared * 2 + (o.categoryId === p.categoryId ? 1 : 0) }
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.o)
}

/* ───────────── global search ───────────── */

export interface SearchResults {
  generators: Generator[]
  parts: Part[]
  manufacturers: Manufacturer[]
}

export function searchAll(c: Catalogue, q: string, idx: CatalogueIndex, locale: Locale): SearchResults {
  if (fold(q).trim().length < 2) return { generators: [], parts: [], manufacturers: [] }
  return {
    generators: filterGenerators(c.generators, { ...emptyGeneratorFilters(), q }, idx, locale),
    parts: filterParts(c.parts, { ...emptyPartFilters(), q }, idx, locale),
    manufacturers: c.manufacturers.filter((m) => matchesQuery([m.name], q)),
  }
}
