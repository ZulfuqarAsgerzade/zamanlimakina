import type { Locale } from '../data/types.ts'
import { DEFAULT_LOCALE } from '../data/types.ts'

/**
 * Localized URL structure. Azerbaijani lives at the root, other languages under /ru and /en.
 *   /generatorlar/perkins-1106a   (az)     /ru/generatory/...     /en/generators/...
 * Slugs are language-neutral; only the fixed path segments are translated.
 */
export type RouteKey =
  | 'home'
  | 'generators'
  | 'generator'
  | 'generatorCategory'
  | 'brands'
  | 'brand'
  | 'parts'
  | 'part'
  | 'services'
  | 'about'
  | 'contact'
  | 'faq'
  | 'search'

type Segments = Record<Locale, string>

const seg = (az: string, ru: string, en: string): Segments => ({ az, ru, en })

/** Path templates per locale (without the language prefix). */
export const ROUTE_PATHS: Record<RouteKey, Segments> = {
  home: seg('', '', ''),
  generators: seg('generatorlar', 'generatory', 'generators'),
  generator: seg('generatorlar/:slug', 'generatory/:slug', 'generators/:slug'),
  generatorCategory: seg('generatorlar/kateqoriya/:slug', 'generatory/kategoriya/:slug', 'generators/category/:slug'),
  brands: seg('brendler', 'brendy', 'brands'),
  brand: seg('brendler/:slug', 'brendy/:slug', 'brands/:slug'),
  parts: seg('ehtiyat-hisseleri', 'zapchasti', 'spare-parts'),
  part: seg('ehtiyat-hisseleri/:slug', 'zapchasti/:slug', 'spare-parts/:slug'),
  services: seg('xidmetler', 'uslugi', 'services'),
  about: seg('sirket-haqqinda', 'o-kompanii', 'about'),
  contact: seg('elaqe', 'kontakty', 'contact'),
  faq: seg('tez-tez-verilen-suallar', 'voprosy-i-otvety', 'faq'),
  search: seg('axtaris', 'poisk', 'search'),
}

export const ROUTE_KEYS = Object.keys(ROUTE_PATHS) as RouteKey[]

export const localePrefix = (locale: Locale): string => (locale === DEFAULT_LOCALE ? '' : `/${locale}`)

export type RouteParams = Record<string, string | undefined>

/** Absolute path for a route in a locale, filling `:param` placeholders. */
export function buildPath(locale: Locale, route: RouteKey, params: RouteParams = {}): string {
  const tpl = ROUTE_PATHS[route][locale]
  const filled = tpl.replace(/:([a-zA-Z]+)/g, (_, k: string) => encodeURIComponent(params[k] ?? ''))
  const path = `${localePrefix(locale)}/${filled}`.replace(/\/+$/, '')
  return path === '' ? '/' : path
}

/** Route definition (react-router pattern) for a route in a locale. */
export function routePattern(locale: Locale, route: RouteKey): string {
  const tpl = ROUTE_PATHS[route][locale]
  const p = `${localePrefix(locale)}/${tpl}`.replace(/\/+$/, '')
  return p === '' ? '/' : p
}

export interface ParsedLocation {
  locale: Locale
  route: RouteKey | null
  params: RouteParams
}

/** Resolve a pathname to its locale / route key / params (used by the language switcher and tests). */
export function parsePath(pathname: string): ParsedLocation {
  const clean = pathname.replace(/\/+$/, '') || '/'
  const m = clean.match(/^\/(ru|en)(?=\/|$)/)
  const locale = (m ? m[1] : DEFAULT_LOCALE) as Locale
  const rest = (m ? clean.slice(m[0].length) : clean).replace(/^\//, '')
  // longer templates first so "generatorlar/kateqoriya/x" wins over "generatorlar/:slug"
  const keys = [...ROUTE_KEYS].sort((a, b) => ROUTE_PATHS[b][locale].length - ROUTE_PATHS[a][locale].length)
  for (const key of keys) {
    const tpl = ROUTE_PATHS[key][locale]
    const names: string[] = []
    const re = new RegExp(
      '^' + tpl.replace(/:([a-zA-Z]+)/g, (_, n: string) => (names.push(n), '([^/]+)')) + '$',
    )
    const mm = rest.match(re)
    if (mm) {
      const params: RouteParams = {}
      names.forEach((n, i) => (params[n] = decodeURIComponent(mm[i + 1])))
      return { locale, route: key, params }
    }
  }
  return { locale, route: null, params: {} }
}

export function absoluteUrl(siteUrl: string, path: string): string {
  return `${siteUrl.replace(/\/+$/, '')}${path === '/' ? '/' : path}`
}
