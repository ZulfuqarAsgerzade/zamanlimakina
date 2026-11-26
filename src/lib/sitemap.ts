import { LOCALES } from '../data/types.ts'
import type { LText, Locale } from '../data/types.ts'
import { exact } from './text.ts'
import { buildPath } from './routes.ts'
import type { RouteKey } from './routes.ts'

export interface SitemapRow {
  slug: string
  updatedAt?: string
  /** Texts whose translation decides which languages list this URL. */
  texts: Array<LText | undefined>
}

export interface SitemapInput {
  siteUrl: string
  locales: Locale[]
  manufacturers: SitemapRow[]
  generators: SitemapRow[]
  parts: SitemapRow[]
  categories: SitemapRow[]
}

const STATIC: RouteKey[] = ['home', 'generators', 'brands', 'parts', 'services', 'about', 'contact', 'faq']
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * XML sitemap with hreflang alternates. Only PUBLISHED, NON-DEMO records are passed in by the caller.
 * A record is listed in a language only if that language really has its text (untranslated pages are not advertised).
 */
export function buildSitemap(input: SitemapInput): string {
  const site = input.siteUrl.replace(/\/+$/, '')
  const urls: string[] = []

  const entry = (route: RouteKey, params: Record<string, string>, locales: Locale[], lastmod?: string) => {
    if (!locales.length) return
    const links = locales
      .map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${esc(site + buildPath(l, route, params))}"/>`)
      .join('')
    const def = locales.includes('az') ? 'az' : locales[0]
    const xdef = `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(site + buildPath(def, route, params))}"/>`
    for (const l of locales) {
      urls.push(
        `<url><loc>${esc(site + buildPath(l, route, params))}</loc>${lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : ''}${links}${xdef}</url>`,
      )
    }
  }

  for (const r of STATIC) entry(r, {}, input.locales)
  // languages in which a record has real text; records without any text are still listed in the default language
  const langs = (row: SitemapRow): Locale[] => {
    const own = input.locales.filter((l) => row.texts.some((t) => !!exact(t, l)))
    if (own.length) return own
    return input.locales.includes('az') ? ['az'] : input.locales.slice(0, 1)
  }
  for (const m of input.manufacturers) entry('brand', { slug: m.slug }, langs(m), m.updatedAt)
  for (const c of input.categories) entry('generatorCategory', { slug: c.slug }, langs(c), c.updatedAt)
  for (const g of input.generators) entry('generator', { slug: g.slug }, langs(g), g.updatedAt)
  for (const p of input.parts) entry('part', { slug: p.slug }, langs(p), p.updatedAt)

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`
}

export const ALL_LOCALES: Locale[] = [...LOCALES]
