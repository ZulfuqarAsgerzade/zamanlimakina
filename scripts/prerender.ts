/**
 * Static prerendering (runs after `vite build` and `vite build --ssr`).
 *
 * For every public URL that matters for SEO — home, catalogue, brands, parts, services, about, contact, FAQ, every
 * published manufacturer / generator category / generator / spare part — in every enabled language, it writes
 * `dist/<path>/index.html` containing the fully rendered page AND its head (title, description, canonical, hreflang,
 * Open Graph, JSON-LD), so crawlers get the real content in the first HTTP response, without running JavaScript.
 *
 * Data source: Supabase (published, non-demo rows) when VITE_SUPABASE_URL/KEY are present at build time; otherwise the demo
 * dataset (those pages are `noindex`). If Supabase is configured but unreachable the build FAILS on purpose so a broken
 * deploy can never replace a good one.
 *
 * Also writes: shell.html (empty app shell for dynamic fallbacks), 404.html (real 404 status), _redirects, _snapshot.json.
 * New content published after a build appears after the next build — trigger one from a Supabase webhook (see README).
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildPath, ROUTE_PATHS } from '../src/lib/routes.ts'
import type { RouteKey } from '../src/lib/routes.ts'
import type { HeadSpec } from '../src/lib/head.ts'
import { loadSnapshot } from './lib/loadSnapshot.ts'
import { assemblePage } from './lib/assemble.ts'
import { LOCALES } from '../src/data/types.ts'
import type { Snapshot } from '../src/data/types.ts'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
const ssrDir = path.join(root, 'dist-ssr')

const shell = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
if (!shell.includes('<div id="root"></div>')) throw new Error('dist/index.html has no empty #root (already prerendered?)')
fs.writeFileSync(path.join(dist, 'shell.html'), shell)

const entry = fs.readdirSync(ssrDir).find((f) => /^entry-server\.m?js$/.test(f))
if (!entry) throw new Error('dist-ssr/entry-server.js not found — run `vite build --ssr src/entry-server.tsx --outDir dist-ssr` first')
const { render, renderHeadHtml } = (await import(pathToFileURL(path.join(ssrDir, entry)).href)) as {
  renderHeadHtml: (h: HeadSpec) => string
  render: (url: string, s: Snapshot) => Promise<{ html: string; head: HeadSpec | null }>
}

const { snapshot, note } = await loadSnapshot()
// Guard: a PRODUCTION Netlify deploy without Supabase would silently publish the browser-only demo catalogue.
if (snapshot.source === 'demo' && process.env.CONTEXT === 'production' && process.env.ALLOW_DEMO_BUILD !== 'true')
  throw new Error(
    'Refusing to build the production context in LOCAL DEMO MODE: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Set them in Netlify (Site settings → Environment variables), or set ALLOW_DEMO_BUILD=true to deploy the demo on purpose.',
  )
console.log(`[prerender] data source: ${snapshot.source}${note ? ` (${note})` : ''}`)

/* ───────── URL list ───────── */
const locales = LOCALES.filter((l) => snapshot.settings.languages.enabled.includes(l))
const c = snapshot.catalogue
const urls: string[] = []
for (const l of locales) {
  for (const r of ['home', 'generators', 'brands', 'parts', 'services', 'about', 'contact', 'faq'] as RouteKey[]) urls.push(buildPath(l, r))
  for (const m of c.manufacturers) urls.push(buildPath(l, 'brand', { slug: m.slug }))
  for (const k of c.categories.filter((x) => x.kind === 'generator' && c.generators.some((g) => g.categoryId === x.id)))
    urls.push(buildPath(l, 'generatorCategory', { slug: k.slug }))
  for (const g of c.generators) urls.push(buildPath(l, 'generator', { slug: g.slug }))
  for (const p of c.parts) urls.push(buildPath(l, 'part', { slug: p.slug }))
}

/* ───────── HTML assembly ───────── */
const assemble = (urlPath: string, html: string, head: HeadSpec) => assemblePage(shell, urlPath, html, head, renderHeadHtml)

const fileFor = (urlPath: string) => (urlPath === '/' ? path.join(dist, 'index.html') : path.join(dist, urlPath, 'index.html'))

let count = 0
for (const u of urls) {
  const { html, head } = await render(u, snapshot)
  if (!head) throw new Error(`no head produced for ${u}`)
  if (html.length < 1500) throw new Error(`suspiciously small render for ${u} (${html.length} bytes)`)
  if (/Səhifə tapılmadı|Страница не найдена|Page not found/.test(html.slice(0, 20000)) && !head.noindex) throw new Error(`${u} rendered a 404`)
  const file = fileFor(u)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, assemble(u, html, head))
  count++
}

/* real 404 page (served with HTTP 404 by Netlify for any path that matches nothing) */
const nf = await render('/__not-found__', snapshot)
if (!nf.head) throw new Error('404 page produced no head')
fs.writeFileSync(path.join(dist, '404.html'), assemble('/__404__', nf.html, { ...nf.head, noindex: true }))

/* ───────── Netlify routing ───────── */
// Real files win. These rewrites only apply to paths that have NO prerendered file: client-only pages (search, admin) and
// products/brands/categories published after the build (the app renders them live, or its own noindex 404 if the slug is unknown).
const rules = new Set<string>(['/admin /shell.html 200', '/admin/* /shell.html 200'])
for (const l of LOCALES) {
  const first = (r: RouteKey) => ROUTE_PATHS[r][l].split('/')[0]
  const prefix = l === 'az' ? '' : `/${l}`
  rules.add(`${prefix}/${first('search')} /shell.html 200`)
  for (const r of ['generators', 'brands', 'parts'] as RouteKey[]) rules.add(`${prefix}/${first(r)}/* /shell.html 200`)
}
fs.writeFileSync(
  path.join(dist, '_redirects'),
  `# generated by scripts/prerender.ts — do not edit\n${[...rules].join('\n')}\n`,
)

/* ───────── snapshot for production hydration ───────── */
fs.writeFileSync(path.join(dist, '_snapshot.json'), JSON.stringify(snapshot.source === 'supabase' ? snapshot : { source: snapshot.source }))

fs.rmSync(ssrDir, { recursive: true, force: true })
console.log(`[prerender] wrote ${count} pages + 404.html + shell.html + _redirects (${locales.join(', ')})`)
