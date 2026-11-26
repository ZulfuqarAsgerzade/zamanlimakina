import { describe, expect, it } from 'vitest'
import { buildSitemap } from '../sitemap.ts'

describe('sitemap', () => {
  const xml = buildSitemap({
    siteUrl: 'https://example.az/',
    locales: ['az', 'ru', 'en'],
    manufacturers: [{ slug: 'perkins', texts: [{ az: 'a', en: 'b' }] }],
    categories: [],
    generators: [{ slug: 'g1', updatedAt: '2026-02-03T10:00:00Z', texts: [{ az: 'a', ru: 'b', en: 'c' }] }, { slug: 'g2', texts: [{ az: 'only az' }] }],
    parts: [{ slug: 'p1', texts: [{ az: 'ad' }] }],
  })
  it('lists static pages for every language with hreflang', () => {
    expect(xml).toContain('<loc>https://example.az/</loc>')
    expect(xml).toContain('<loc>https://example.az/ru/generatory</loc>')
    expect(xml).toContain('hreflang="x-default"')
  })
  it('lists a record only in the languages it is translated into', () => {
    expect(xml).toContain('https://example.az/generatorlar/g1')
    expect(xml).toContain('https://example.az/ru/generatory/g1')
    expect(xml).toContain('https://example.az/generatorlar/g2')
    expect(xml).not.toContain('/ru/generatory/g2')
    expect(xml).not.toContain('/en/generators/g2')
    expect(xml).toContain('<lastmod>2026-02-03</lastmod>')
    expect(xml).not.toContain('/ru/brendy/perkins')
    expect(xml).toContain('/en/brands/perkins')
  })
  it('is well-formed XML', () => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    expect(doc.querySelector('parsererror')).toBeNull()
    expect(doc.getElementsByTagName('url').length).toBeGreaterThan(20)
  })
})
