import { describe, expect, it } from 'vitest'
import { ROUTE_KEYS, buildPath, parsePath } from '../routes.ts'
import { LOCALES } from '../../data/types.ts'

describe('localized routes', () => {
  it('builds Azerbaijani paths at the root and others under a prefix', () => {
    expect(buildPath('az', 'home')).toBe('/')
    expect(buildPath('ru', 'home')).toBe('/ru')
    expect(buildPath('az', 'generators')).toBe('/generatorlar')
    expect(buildPath('ru', 'generators')).toBe('/ru/generatory')
    expect(buildPath('en', 'generator', { slug: 'perkins-1104a' })).toBe('/en/generators/perkins-1104a')
    expect(buildPath('az', 'generatorCategory', { slug: 'small' })).toBe('/generatorlar/kateqoriya/small')
  })

  it('round-trips every route in every locale', () => {
    for (const locale of LOCALES)
      for (const route of ROUTE_KEYS) {
        const params = { slug: 'some-slug' }
        const parsed = parsePath(buildPath(locale, route, params))
        expect(parsed.locale).toBe(locale)
        expect(parsed.route).toBe(route)
        if (/:slug/.test(buildPath(locale, route, { slug: ':slug' }))) expect(parsed.params.slug).toBe('some-slug')
      }
  })

  it('prefers the category route over the generator detail route', () => {
    expect(parsePath('/generatorlar/kateqoriya/small').route).toBe('generatorCategory')
    expect(parsePath('/generatorlar/kateqoriya').route).toBe('generator') // slug "kateqoriya"
  })

  it('returns null for unknown paths and switches language on the same page', () => {
    expect(parsePath('/nope/nothing').route).toBeNull()
    const p = parsePath('/ru/zapchasti/pk-oil')
    expect(buildPath('en', p.route!, p.params)).toBe('/en/spare-parts/pk-oil')
  })

  it('encodes unsafe slug characters', () => {
    expect(buildPath('az', 'brand', { slug: 'a b/c' })).toBe('/brendler/a%20b%2Fc')
    expect(parsePath('/brendler/a%20b%2Fc').params.slug).toBe('a b/c')
  })
})
