import { buildSitemap, ALL_LOCALES } from '../../src/lib/sitemap.ts'
import type { SitemapRow } from '../../src/lib/sitemap.ts'
import type { LText, Locale } from '../../src/data/types.ts'

/**
 * Dynamic /sitemap.xml. Reads PUBLISHED, NON-DEMO rows from Supabase through the public REST API with the
 * ANON key (same access any visitor has), so new products appear without a redeploy.
 * Netlify env vars: SUPABASE_URL and SUPABASE_ANON_KEY (VITE_* names are accepted too).
 * Without them only the static pages are listed.
 */
export const config = { path: '/sitemap.xml' }

const SITE = (process.env.SITE_URL || process.env.URL || 'https://zamanlimakina.az').replace(/\/+$/, '')

type Row = Record<string, unknown>

async function rest(base: string, key: string, table: string, select: string, filter: string): Promise<Row[]> {
  const out: Row[] = []
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${base}/rest/v1/${table}?select=${select}&${filter}&order=id`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}`, 'Range-Unit': 'items' },
    })
    if (!res.ok) throw new Error(`${table}: ${res.status}`)
    const rows = (await res.json()) as Row[]
    out.push(...rows)
    if (rows.length < 1000) break
  }
  return out
}

export default async function handler(): Promise<Response> {
  const base = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  let locales: Locale[] = ALL_LOCALES
  let manufacturers: SitemapRow[] = []
  let generators: SitemapRow[] = []
  let parts: SitemapRow[] = []
  let categories: SitemapRow[] = []

  if (base && key) {
    try {
      const pub = 'status=eq.published&is_demo=eq.false'
      const [mf, ca, ge, pa, st] = await Promise.all([
        rest(base, key, 'manufacturers', 'slug,updated_at,description', pub),
        rest(base, key, 'categories', 'id,slug,updated_at,name,kind', `${pub}&kind=eq.generator`),
        rest(base, key, 'generators', 'slug,updated_at,description,short_description,category_id', pub),
        rest(base, key, 'parts', 'slug,updated_at,name', pub),
        rest(base, key, 'site_settings', 'value', 'key=eq.settings'),
      ])
      const enabled = (st[0]?.value as { languages?: { enabled?: Locale[] } } | undefined)?.languages?.enabled
      if (enabled?.length) locales = ALL_LOCALES.filter((l) => enabled.includes(l))
      const row = (r: Row, ...fields: string[]): SitemapRow => ({
        slug: String(r.slug),
        updatedAt: r.updated_at as string | undefined,
        texts: fields.map((f) => r[f] as LText | undefined),
      })
      manufacturers = mf.map((r) => row(r, 'description'))
      // like the prerender step: only categories that contain at least one published generator
      const used = new Set(ge.map((g) => g.category_id))
      categories = ca.filter((c) => used.has(c.id)).map((r) => row(r, 'name'))
      generators = ge.map((r) => row(r, 'description', 'short_description'))
      parts = pa.map((r) => row(r, 'name'))
    } catch (e) {
      console.error('[sitemap] Supabase unavailable, serving static pages only:', e)
    }
  }

  const xml = buildSitemap({ siteUrl: SITE, locales, manufacturers, generators, parts, categories })
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=900, s-maxage=900' },
  })
}
