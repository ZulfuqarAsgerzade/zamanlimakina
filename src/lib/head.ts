import { createContext, useContext, useEffect } from 'react'
import type { Locale } from '../data/types.ts'
import { siteConfig } from '../config/site.ts'

export const SITE_URL: string = (import.meta.env.VITE_SITE_URL || siteConfig.brand.url).replace(/\/+$/, '')

export interface HeadSpec {
  title: string
  description?: string
  /** Canonical absolute path (with locale prefix) — becomes <link rel=canonical> and og:url. Empty = none (404 pages). */
  canonicalPath: string
  /** Locales (with their paths) that actually have this page translated → hreflang. */
  alternates?: Array<{ locale: Locale; path: string }>
  image?: string
  ogType?: 'website' | 'product' | 'article'
  noindex?: boolean
  jsonLd?: Array<Record<string, unknown>>
  locale: Locale
}

const OG_LOCALE: Record<Locale, string> = { az: 'az_AZ', ru: 'ru_RU', en: 'en_US' }
const abs = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path}`)

/** Declarative head tag. The same list drives both the browser (applyHead) and static prerendering (renderHeadHtml). */
export type HeadTag =
  | { kind: 'meta'; attr: 'name' | 'property'; key: string; content: string }
  | { kind: 'canonical'; href: string }
  | { kind: 'alternate'; hreflang: string; href: string }
  | { kind: 'ld'; json: string }

const META_KEYS_MANAGED_OPTIONAL = [
  ['property', 'og:image'],
  ['name', 'twitter:image'],
  ['property', 'og:description'],
  ['name', 'twitter:description'],
  ['name', 'description'],
  ['property', 'og:url'],
] as const

export function buildHeadTags(h: HeadSpec): HeadTag[] {
  const tags: HeadTag[] = []
  const meta = (attr: 'name' | 'property', key: string, content: string) => tags.push({ kind: 'meta', attr, key, content })
  if (h.description) meta('name', 'description', h.description)
  meta('name', 'robots', h.noindex ? 'noindex, follow' : 'index, follow')
  if (h.canonicalPath) tags.push({ kind: 'canonical', href: abs(h.canonicalPath) })
  const alts = h.alternates ?? []
  for (const a of alts) tags.push({ kind: 'alternate', hreflang: a.locale, href: abs(a.path) })
  const def = alts.find((a) => a.locale === 'az')
  if (def) tags.push({ kind: 'alternate', hreflang: 'x-default', href: abs(def.path) })

  meta('property', 'og:type', h.ogType ?? 'website')
  meta('property', 'og:site_name', siteConfig.brand.name)
  meta('property', 'og:locale', OG_LOCALE[h.locale])
  meta('property', 'og:title', h.title)
  if (h.description) meta('property', 'og:description', h.description)
  if (h.canonicalPath) meta('property', 'og:url', abs(h.canonicalPath))
  meta('name', 'twitter:card', 'summary_large_image')
  meta('name', 'twitter:title', h.title)
  if (h.description) meta('name', 'twitter:description', h.description)
  if (h.image) {
    meta('property', 'og:image', abs(h.image))
    meta('name', 'twitter:image', abs(h.image))
  }
  for (const block of h.jsonLd ?? []) tags.push({ kind: 'ld', json: JSON.stringify(block) })
  return tags
}

/* ───────────── browser: keep <head> in sync with the route ───────────── */

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function applyHead(h: HeadSpec): void {
  document.title = h.title
  document.documentElement.lang = h.locale
  const tags = buildHeadTags(h)
  const present = new Set(tags.filter((t): t is Extract<HeadTag, { kind: 'meta' }> => t.kind === 'meta').map((t) => `${t.attr}:${t.key}`))
  if (!h.canonicalPath) document.head.querySelector('link[rel="canonical"]')?.remove()
  for (const [attr, key] of META_KEYS_MANAGED_OPTIONAL)
    if (!present.has(`${attr}:${key}`)) document.head.querySelector(`meta[${attr}="${key}"]`)?.remove()

  document.head.querySelectorAll('link[rel="alternate"][data-zm], script[data-zm-ld]').forEach((n) => n.remove())
  for (const t of tags) {
    if (t.kind === 'meta') upsertMeta(t.attr, t.key, t.content)
    else if (t.kind === 'canonical') {
      let l = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      if (!l) {
        l = document.createElement('link')
        l.rel = 'canonical'
        document.head.appendChild(l)
      }
      l.setAttribute('href', t.href)
    } else if (t.kind === 'alternate') {
      const l = document.createElement('link')
      l.rel = 'alternate'
      l.setAttribute('hreflang', t.hreflang)
      l.setAttribute('href', t.href)
      l.setAttribute('data-zm', '1')
      document.head.appendChild(l)
    } else {
      const s = document.createElement('script')
      s.type = 'application/ld+json'
      s.setAttribute('data-zm-ld', '1')
      s.textContent = t.json
      document.head.appendChild(s)
    }
  }
}

/* ───────────── server / prerender: collect the head instead of touching the DOM ───────────── */

export interface HeadCollector {
  spec: HeadSpec | null
}
export const HeadCollectorContext = createContext<HeadCollector | null>(null)

const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** JSON inside <script>: break up "</" so it can never close the tag early */
const escJson = (s: string) =>
  s.replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029')

export function renderHeadHtml(h: HeadSpec): string {
  const out = [`<title>${escText(h.title)}</title>`]
  for (const t of buildHeadTags(h)) {
    if (t.kind === 'meta') out.push(`<meta ${t.attr}="${t.key}" content="${escAttr(t.content)}">`)
    else if (t.kind === 'canonical') out.push(`<link rel="canonical" href="${escAttr(t.href)}">`)
    else if (t.kind === 'alternate') out.push(`<link rel="alternate" hreflang="${t.hreflang}" href="${escAttr(t.href)}" data-zm="1">`)
    else out.push(`<script type="application/ld+json" data-zm-ld="1">${escJson(t.json)}</script>`)
  }
  return out.join('\n    ')
}

export function useHead(spec: HeadSpec): void {
  const collector = useContext(HeadCollectorContext)
  if (collector) collector.spec = spec // synchronous during server render
  const key = JSON.stringify(spec)
  useEffect(() => {
    applyHead(JSON.parse(key) as HeadSpec)
  }, [key])
}
