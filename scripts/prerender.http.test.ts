import fs from 'node:fs'
import path from 'node:path'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDistServer } from './lib/netlifyEmu.ts'
import { loadSnapshot } from './lib/loadSnapshot.ts'
import { buildSitemap } from '../src/lib/sitemap.ts'
import { ROUTE_KEYS, buildPath } from '../src/lib/routes.ts'
import { LOCALES } from '../src/data/types.ts'

/**
 * End-to-end check of the PRERENDERED output over real HTTP (no browser, no JavaScript): what a crawler receives.
 * Requires a prior `npm run build`; skipped when dist/ is missing.
 */
const dist = path.resolve(import.meta.dirname, '..', 'dist')
const built = fs.existsSync(path.join(dist, '_redirects')) && fs.existsSync(path.join(dist, '404.html'))

describe.skipIf(!built)('prerendered site over HTTP', () => {
  let server: Server
  let base = ''
  const get = async (p: string) => {
    // Connection: close — idle keep-alive sockets are dropped by the server after 5 s, which showed up as ECONNRESET in long runs
    const r = await fetch(base + p, { headers: { connection: 'close' } })
    return { status: r.status, type: r.headers.get('content-type') ?? '', html: await r.text() }
  }
  const tag = (html: string, re: RegExp) => html.match(re)?.[1]
  const ld = (html: string) => [...html.matchAll(/<script type="application\/ld\+json" data-zm-ld="1">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]))

  beforeAll(async () => {
    server = createDistServer(dist)
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterAll(() => new Promise<void>((r) => server.close(() => r())))

  it('generator page: full content and metadata in the first response', async () => {
    const { status, html } = await get('/generatorlar/perkins-1104a-44tg2')
    expect(status).toBe(200)
    expect(html).toContain('<html lang="az"')
    expect(tag(html, /<title>([^<]*)<\/title>/)).toBe('Perkins 1104A-44TG2 — 100 kVA | Zamanlı Makina')
    expect(tag(html, /<link rel="canonical" href="([^"]*)"/)).toBe('https://zamanlimakina.az/generatorlar/perkins-1104a-44tg2')
    for (const l of ['az', 'ru', 'en', 'x-default']) expect(html).toContain(`hreflang="${l}"`)
    expect(html).toContain('href="https://zamanlimakina.az/ru/generatory/perkins-1104a-44tg2"')
    expect(tag(html, /<meta property="og:title" content="([^"]*)"/)).toContain('Perkins 1104A-44TG2')
    expect(tag(html, /<meta property="og:url" content="([^"]*)"/)).toBe('https://zamanlimakina.az/generatorlar/perkins-1104a-44tg2')
    expect(tag(html, /<meta property="og:image" content="([^"]*)"/)).toBe('https://zamanlimakina.az/og-image.png') // never an SVG
    expect(tag(html, /<meta name="description" content="([^"]*)"/)).toContain('Perkins 1104A-44TG2')
    // demo data is prerendered but must not be indexable
    expect(html).toContain('<meta name="robots" content="noindex, follow">')
    // real body content, not an empty shell
    expect(html).toContain('Texniki göstəricilər')
    expect(html).toContain('Uyğun ehtiyat hissələri')
    expect(html).toContain('DEMO-PK-OF-1100')
    expect((html.match(/<h1/g) ?? []).length).toBe(1)
    const types = ld(html).map((x) => x['@type'])
    expect(types).toEqual(expect.arrayContaining(['Organization', 'BreadcrumbList', 'Product']))
    expect(JSON.stringify(ld(html))).not.toContain('.svg')
  })

  it('untranslated language page canonicalises to a language that has the content', async () => {
    const { html } = await get('/ru/generatory/perkins-1106a-70tag4')
    expect(html).toContain('<html lang="ru"')
    expect(tag(html, /<link rel="canonical" href="([^"]*)"/)).toBe('https://zamanlimakina.az/generatorlar/perkins-1106a-70tag4')
    expect(html).not.toContain('hreflang="ru"')
    expect(html).toContain('ещё не переведён')
  })

  it('manufacturer, category, parts and static pages carry their own metadata', async () => {
    const pages = ['/', '/brendler/perkins', '/generatorlar/kateqoriya/medium', '/ehtiyat-hisseleri/cm-oil', '/xidmetler', '/tez-tez-verilen-suallar', '/en/brands/cummins', '/ru/zapchasti']
    for (const p of pages) {
      const { status, html } = await get(p)
      expect(status, p).toBe(200)
      expect(tag(html, /<link rel="canonical" href="([^"]*)"/), p).toMatch(/^https:\/\/zamanlimakina\.az\//)
      expect(tag(html, /<meta property="og:title" content="([^"]*)"/), p).toBeTruthy()
      expect(ld(html).some((x) => x['@type'] === 'Organization'), p).toBe(true)
    }
    expect(ld((await get('/brendler/perkins')).html).map((x) => x['@type'])).toContain('BreadcrumbList')
    expect(ld((await get('/tez-tez-verilen-suallar')).html).map((x) => x['@type'])).toContain('FAQPage')
  })

  it('every prerendered page has exactly one h1, one canonical, a unique title and a description', { timeout: 60_000 }, async () => {
    const files: string[] = []
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name)
        if (e.isDirectory()) {
          if (!['assets', 'demo', 'brand'].includes(e.name)) walk(f)
        } else if (e.name === 'index.html') files.push(f)
      }
    }
    walk(dist)
    expect(files.length).toBeGreaterThan(150)
    const titles = new Map<string, string>()
    for (const f of files) {
      const html = fs.readFileSync(f, 'utf8')
      const rel = path.relative(dist, f)
      expect((html.match(/<h1[ >]/g) ?? []).length, rel).toBe(1)
      expect((html.match(/rel="canonical"/g) ?? []).length, rel).toBe(1)
      expect((html.match(/<title>/g) ?? []).length, rel).toBe(1)
      expect(html, rel).toMatch(/<meta name="description" content="[^"]{20,}/)
      expect(html, rel).toContain('name="zm-prerender"')
      // product names are language-neutral, so titles must be unique within a language (hreflang links the translations)
      const t = `${tag(html, /<html lang="([^"]*)"/)}: ${tag(html, /<title>([^<]*)<\/title>/)}`
      expect(titles.has(t), `duplicate <title> "${t}" in ${rel} and ${titles.get(t)}`).toBe(false)
      titles.set(t, rel)
    }
  })

  it('unknown URLs get a real 404; late-published slugs, search and admin get the app shell', async () => {
    const nf = await get('/this/does/not/exist')
    expect(nf.status).toBe(404)
    expect(nf.html).toContain('noindex')
    expect(nf.html).not.toContain('rel="canonical"') // a 404 must not claim a canonical URL
    expect(nf.html).not.toContain('hreflang=')
    expect(nf.html).toContain('Səhifə tapılmadı')

    for (const p of ['/generatorlar/published-after-build', '/en/spare-parts/new-part', '/brendler/new-brand', '/axtaris?q=perkins', '/admin', '/admin/generators/abc']) {
      const r = await get(p)
      expect(r.status, p).toBe(200)
      expect(r.html, p).toContain('<div id="root"></div>')
      expect(r.html, p).not.toContain('zm-prerender')
    }
  })

  it('ships no secrets: no service-role key names, JWTs or env canaries in any built file', { timeout: 60_000 }, () => {
    const files: string[] = []
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name)
        if (e.isDirectory()) walk(f)
        // every prerendered page shares the same inlined bootstrap, so the shells + assets + snapshot are representative
        else if (/\.(js|css|json|txt)$/.test(e.name) || ['index.html', '404.html', 'shell.html'].includes(e.name)) files.push(f)
      }
    }
    walk(dist)
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8')
      expect(text, f).not.toMatch(/service_role|SERVICE_ROLE/)
      expect(text, f).not.toMatch(/SECRETCANARY|ANONCANARY/)
      if (!text.includes('eyJ')) continue
      for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{15,}\.([A-Za-z0-9_-]{15,})\.[A-Za-z0-9_-]{10,}/g))
        expect(Buffer.from(m[1], 'base64url').toString(), `JWT in ${f}`).not.toMatch(/service_role/)
    }
  })

  it('every localized static route resolves to its own prerendered page (all keys × all languages)', { timeout: 60_000 }, async () => {
    const dynamic = new Set(['generator', 'generatorCategory', 'brand', 'part', 'search'])
    for (const l of LOCALES)
      for (const key of ROUTE_KEYS.filter((k) => !dynamic.has(k))) {
        const p = buildPath(l, key)
        const r = await get(p)
        expect(r.status, p).toBe(200)
        expect(r.html, p).toContain(`name="zm-prerender" content="${p}"`)
        expect(r.html, p).toContain(`<html lang="${l}"`)
        expect(tag(r.html, /<link rel="canonical" href="([^"]*)"/), p).toBe(`https://zamanlimakina.az${p === '/' ? '/' : p}`)
      }
  })

  it('every URL the sitemap builder would list for this data is a real prerendered page (sitemap ↔ prerender agree)', { timeout: 60_000 }, async () => {
    const { snapshot } = await loadSnapshot({ VITE_DATA_MODE: 'demo' } as NodeJS.ProcessEnv)
    const c = snapshot.catalogue
    const used = new Set(c.generators.map((g) => g.categoryId))
    const xml = buildSitemap({
      siteUrl: 'https://zamanlimakina.az',
      locales: [...LOCALES],
      manufacturers: c.manufacturers.map((m) => ({ slug: m.slug, texts: [m.description] })),
      categories: c.categories.filter((k) => k.kind === 'generator' && used.has(k.id)).map((k) => ({ slug: k.slug, texts: [k.name] })),
      generators: c.generators.map((g) => ({ slug: g.slug, texts: [g.description, g.shortDescription] })),
      parts: c.parts.map((p) => ({ slug: p.slug, texts: [p.name] })),
    })
    const locs = [...xml.matchAll(/<loc>https:\/\/zamanlimakina\.az([^<]*)<\/loc>/g)].map((m) => m[1] || '/')
    expect(locs.length).toBeGreaterThan(150)
    for (const p of locs) {
      const file = path.join(dist, p === '/' ? '' : p, 'index.html')
      expect(fs.existsSync(file), `sitemap lists ${p} but it was not prerendered`).toBe(true)
    }
  })

  it('serves robots.txt, assets and a demo snapshot marker', async () => {
    const robots = await get('/robots.txt')
    expect(robots.html).toContain('Disallow: /admin')
    expect(robots.html).toContain('Sitemap: https://zamanlimakina.az/sitemap.xml')
    const snap = JSON.parse((await get('/_snapshot.json')).html)
    expect(snap.source).toBe('demo')
    expect((await get('/demo/gen-canopy-side.svg')).type).toContain('svg')
  })
})
