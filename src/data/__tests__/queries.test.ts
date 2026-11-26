import { describe, expect, it } from 'vitest'
import { buildDemoDataset } from '../../demo/dataset.ts'
import {
  emptyGeneratorFilters,
  emptyPartFilters,
  filterGenerators,
  filterParts,
  fold,
  indexCatalogue,
  matchesQuery,
  relatedGenerators,
  searchAll,
} from '../queries.ts'

const data = buildDemoDataset()
const cat = { manufacturers: data.manufacturers, categories: data.categories, generators: data.generators.filter((g) => g.status === 'published'), parts: data.parts.filter((p) => p.status === 'published'), compat: data.compat }
const idx = indexCatalogue(cat)
const gf = (patch: object) => ({ ...emptyGeneratorFilters(), ...patch })

describe('search normalisation', () => {
  it('folds case, diacritics and punctuation', () => {
    expect(fold('Yağ FİLTRİ')).toBe('yag filtri')
    expect(matchesQuery(['1104A-44TG2'], '1104a44tg2')).toBe(true)
    expect(matchesQuery(['Perkins', '1104A-44TG2'], 'perkins 1104')).toBe(true)
    expect(matchesQuery(['Perkins'], 'cummins')).toBe(false)
    expect(matchesQuery(['x'], '   ')).toBe(true)
  })
})

describe('generator filters', () => {
  it('filters by manufacturer slug', () => {
    const r = filterGenerators(cat.generators, gf({ manufacturers: ['perkins'] }), idx, 'az')
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((g) => idx.mfrById.get(g.manufacturerId!)!.slug === 'perkins')).toBe(true)
  })
  it('filters by power range, type, phase, fuel, cooling and availability', () => {
    const r = filterGenerators(cat.generators, gf({ kvaMin: 100, kvaMax: 250, types: ['canopy'], phases: [3], fuels: ['diesel'], coolings: ['water'], availability: ['in_stock'] }), idx, 'az')
    expect(r.length).toBeGreaterThan(0)
    for (const g of r) {
      expect(g.kvaPrime).toBeGreaterThanOrEqual(100)
      expect(g.kvaPrime).toBeLessThanOrEqual(250)
      expect(g.generatorType).toBe('canopy')
      expect(g.availability).toBe('in_stock')
    }
    expect(filterGenerators(cat.generators, gf({ fuels: ['gas'] }), idx, 'az')).toHaveLength(0)
  })
  it('searches by model and by manufacturer name', () => {
    expect(filterGenerators(cat.generators, gf({ q: '1106a' }), idx, 'az').map((g) => g.model)).toEqual(['1106A-70TAG4'])
    expect(filterGenerators(cat.generators, gf({ q: 'cummins' }), idx, 'az').length).toBe(cat.generators.filter((g) => idx.mfrById.get(g.manufacturerId!)!.name === 'Cummins').length)
  })
  it('sorts by power both ways and by name', () => {
    const asc = filterGenerators(cat.generators, gf({ sort: 'powerAsc' }), idx, 'az').map((g) => g.kvaPrime!)
    expect(asc).toEqual([...asc].sort((a, b) => a - b))
    const desc = filterGenerators(cat.generators, gf({ sort: 'powerDesc' }), idx, 'az').map((g) => g.kvaPrime!)
    expect(desc).toEqual([...desc].sort((a, b) => b - a))
    expect(filterGenerators(cat.generators, gf({ sort: 'featured' }), idx, 'az')[0].featured).toBe(true)
  })
})

describe('spare part search & compatibility', () => {
  const pf = (patch: object) => ({ ...emptyPartFilters(), ...patch })
  it('finds parts by OEM code, name, manufacturer and generator model', () => {
    expect(filterParts(cat.parts, pf({ q: 'DEMO-PK-OF-1100' }), idx, 'az').map((p) => p.slug)).toEqual(['pk-oil-1100'])
    expect(filterParts(cat.parts, pf({ q: 'yağ filtri' }), idx, 'az').length).toBeGreaterThan(3)
    expect(filterParts(cat.parts, pf({ q: 'volvo penta' }), idx, 'az').length).toBeGreaterThan(0)
    expect(filterParts(cat.parts, pf({ q: 'TAD734GE' }), idx, 'az').length).toBeGreaterThan(0)
  })
  it('filters by generator model and by category', () => {
    const g = idx.genBySlug.get('perkins-1104a-44tg2')!
    const fits = filterParts(cat.parts, pf({ generator: g.slug }), idx, 'az')
    expect(fits.length).toBe(idx.partsByGen.get(g.id)!.length)
    expect(fits.length).toBeGreaterThan(3)
    const oil = filterParts(cat.parts, pf({ categories: ['oil-filters'] }), idx, 'az')
    expect(oil.every((p) => idx.catById.get(p.categoryId!)!.slug === 'oil-filters')).toBe(true)
  })
  it('a part can be compatible with several generators', () => {
    const p = idx.partBySlug.get('cm-oil')!
    expect(idx.gensByPart.get(p.id)!.length).toBeGreaterThan(2)
  })
})

describe('relations & global search', () => {
  it('related generators share manufacturer or category and exclude the item itself', () => {
    const g = idx.genBySlug.get('perkins-1104a-44tg2')!
    const r = relatedGenerators(g, cat.generators)
    expect(r.length).toBeGreaterThan(0)
    expect(r.some((x) => x.id === g.id)).toBe(false)
    expect(r.every((x) => x.manufacturerId === g.manufacturerId || x.categoryId === g.categoryId)).toBe(true)
  })
  it('global search needs 2+ characters and spans generators, parts and brands', () => {
    expect(searchAll(cat, 'p', idx, 'az').generators).toHaveLength(0)
    const r = searchAll(cat, 'perkins', idx, 'az')
    expect(r.manufacturers).toHaveLength(1)
    expect(r.generators.length).toBeGreaterThan(0)
    expect(r.parts.length).toBeGreaterThan(0)
  })
})
