import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildDemoDataset } from '../../demo/dataset.ts'
import { validateEntity } from '../schema.ts'

const d = buildDemoDataset()
const publicDir = path.resolve(import.meta.dirname, '../../../public')

describe('demo dataset', () => {
  it('meets the requested minimums', () => {
    expect(d.manufacturers.length).toBeGreaterThanOrEqual(5)
    expect(d.generators.length).toBeGreaterThanOrEqual(15)
    expect(d.parts.length).toBeGreaterThanOrEqual(20)
    expect(d.categories.filter((c) => c.kind === 'generator').length).toBeGreaterThanOrEqual(3)
    expect(d.generators.some((g) => g.featured)).toBe(true)
    expect(d.manufacturers.map((m) => m.name)).toEqual(expect.arrayContaining(['Perkins', 'Cummins', 'Baudouin', 'Volvo Penta']))
  })

  it('every record is flagged as demo, with unique ids and slugs', () => {
    const all = [...d.manufacturers, ...d.categories, ...d.generators, ...d.parts, ...d.media]
    expect(all.every((r) => r.isDemo)).toBe(true)
    expect(new Set(all.map((r) => r.id)).size).toBe(all.length)
    for (const list of [d.manufacturers, d.generators, d.parts]) expect(new Set(list.map((r) => r.slug)).size).toBe(list.length)
  })

  it('passes the same validation the admin uses', () => {
    for (const [entity, list] of [
      ['manufacturers', d.manufacturers],
      ['categories', d.categories],
      ['generators', d.generators],
      ['parts', d.parts],
      ['media', d.media],
    ] as const)
      for (const r of list) {
        const v = validateEntity(entity, r)
        expect(v.ok, `${entity}/${(r as { slug?: string }).slug}: ${JSON.stringify(v)}`).toBe(true)
      }
  })

  it('has consistent relationships', () => {
    const mfr = new Set(d.manufacturers.map((m) => m.id))
    const cat = new Map(d.categories.map((c) => [c.id, c.kind]))
    for (const g of d.generators) {
      expect(mfr.has(g.manufacturerId!)).toBe(true)
      expect(cat.get(g.categoryId!)).toBe('generator')
    }
    for (const p of d.parts) {
      if (p.manufacturerId) expect(mfr.has(p.manufacturerId)).toBe(true)
      expect(cat.get(p.categoryId!)).toBe('part')
    }
    const gens = new Set(d.generators.map((g) => g.id))
    const parts = new Set(d.parts.map((p) => p.id))
    for (const c of d.compat) {
      expect(gens.has(c.generatorId)).toBe(true)
      expect(parts.has(c.partId)).toBe(true)
    }
    // every generator has compatible parts and every part fits something
    for (const g of d.generators) expect(d.compat.some((c) => c.generatorId === g.id)).toBe(true)
    for (const p of d.parts) expect(d.compat.some((c) => c.partId === p.id)).toBe(true)
    // a part is compatible with several generator models
    expect(d.compat.filter((c) => c.partId === d.parts[0].id).length).toBeGreaterThan(1)
  })

  it('never passes invented data off as real', () => {
    expect(d.parts.every((p) => p.oemCode.startsWith('DEMO-'))).toBe(true)
    expect(d.generators.every((g) => /DEMO|demo|NÜMAYİŞ|ДЕМО|DEMONSTRATION/.test(g.description.az ?? ''))).toBe(true)
    // fixed demo prices exist for only a minority; the rest is "price on request"
    const fixed = d.generators.filter((g) => g.price.type === 'fixed').length
    expect(fixed).toBeLessThan(d.generators.length / 2)
    expect(d.generators.some((g) => g.price.type === 'request')).toBe(true)
    expect(d.generators.some((g) => g.price.type === 'hidden')).toBe(true)
  })

  it('references only artwork files that exist, with alt text', () => {
    for (const r of [...d.generators, ...d.parts])
      for (const img of r.images) {
        expect(fs.existsSync(path.join(publicDir, img.url)), img.url).toBe(true)
        expect(img.alt?.az).toBeTruthy()
      }
  })

  it('spec rows all carry a value (empty ones would be hidden anyway)', () => {
    for (const g of d.generators) for (const grp of g.specGroups) for (const it of grp.items) expect(it.value.az).toBeTruthy()
  })

  it('leaves some Russian text missing on purpose to exercise the fallback notice', () => {
    expect(d.generators.some((g) => !g.description.ru)).toBe(true)
    expect(d.generators.some((g) => !!g.description.ru)).toBe(true)
  })
})
