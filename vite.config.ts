import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { siteConfig } from './src/config/site.ts'
import { assertDemoToolsNotInProduction, assertPublicKeyOnly } from './scripts/lib/keyGuard.ts'

/**
 * Production domain: `SITE_URL` (or `VITE_SITE_URL`) env var, otherwise `siteConfig.brand.url`.
 * Used for robots.txt and the sitemap reference. Per-page canonical / hreflang / Open Graph tags are
 * produced at runtime by src/lib/head.ts (the same domain via VITE_SITE_URL, see below).
 */
function normalizeSiteUrl(raw: string | undefined): string | null {
  const value = (raw ?? '').trim()
  if (!value) return null
  try {
    const u = new URL(value)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('protocol')
    return (u.origin + u.pathname).replace(/\/+$/, '')
  } catch {
    console.warn(`\n[seo] SITE_URL is invalid ("${value}") — expected an absolute http(s) URL. Ignored.\n`)
    return null
  }
}

/** Emits robots.txt (admin is disallowed; the sitemap is served dynamically by a Netlify function). */
function robotsPlugin(site: string | null): Plugin {
  return {
    name: 'zm-robots',
    generateBundle() {
      const lines = ['User-agent: *', 'Allow: /', 'Disallow: /admin', '']
      if (site) lines.push(`Sitemap: ${site}/sitemap.xml`, '')
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: lines.join('\n') })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', ['SITE_URL', 'VITE_SITE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_ALLOW_DEMO_TOOLS'])
  assertPublicKeyOnly(env)
  assertDemoToolsNotInProduction({ ...env, VITE_ALLOW_DEMO_TOOLS: env.VITE_ALLOW_DEMO_TOOLS ?? process.env.VITE_ALLOW_DEMO_TOOLS }, process.env.CONTEXT)
  const site = normalizeSiteUrl(env.SITE_URL || env.VITE_SITE_URL || siteConfig.brand.url)
  return {
    plugins: [react(), robotsPlugin(site)],
    // expose the resolved domain to the client (head.ts reads import.meta.env.VITE_SITE_URL)
    define: { 'import.meta.env.VITE_SITE_URL': JSON.stringify(site ?? '') },
    build: { target: 'es2022' },
  }
})
