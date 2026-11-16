import { defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { siteConfig } from './src/config/site.ts'
import { getContactItems } from './src/config/contact.ts'

/**
 * İstehsal domeni: `SITE_URL` (və ya `VITE_SITE_URL`) mühit dəyişəni, yoxsa `siteConfig.brand.url`.
 * Heç biri yoxdursa, domen tələb edən teqlər (canonical, og:url, og:image, sitemap və s.)
 * HEÇ VAXT uydurulmur, sadəcə buraxılır.
 */
function normalizeSiteUrl(raw: string | undefined): string | null {
  const value = (raw ?? '').trim()
  if (!value) return null
  try {
    const u = new URL(value)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('protocol')
    return (u.origin + u.pathname).replace(/\/+$/, '')
  } catch {
    console.warn(`\n[seo] SITE_URL dəyəri etibarsızdır ("${value}") — mütləq http(s) ünvan olmalıdır. Domen tələb edən teqlər buraxıldı.\n`)
    return null
  }
}

function seoPlugin(site: string | null): Plugin {
  const brand = siteConfig.brand.name
  const description = 'Etibarlı enerji həlləri və güclü performans.'

  const organization = (): Record<string, unknown> => {
    const org: Record<string, unknown> = { '@context': 'https://schema.org', '@type': 'Organization', name: brand, description }
    if (site) {
      org.url = `${site}/`
      org.logo = `${site}/brand/logo.png`
    }
    // Əlaqə məlumatları yalnız src/config/site.ts-də doldurulubsa əlavə olunur
    const items = getContactItems()
    const byKind = (k: string) => items.find((i) => i.kind === k)
    const phone = byKind('phone')
    const email = byKind('email')
    if (phone || email) {
      org.contactPoint = {
        '@type': 'ContactPoint',
        ...(phone ? { telephone: phone.display } : {}),
        ...(email ? { email: email.display } : {}),
      }
    }
    const sameAs = items.filter((i) => i.kind === 'instagram' && i.href).map((i) => i.href)
    if (sameAs.length) org.sameAs = sameAs
    const loc = byKind('location')
    if (loc) org.address = loc.display
    return org
  }

  return {
    name: 'zm-seo',
    apply: (config) => !config.build?.ssr,

    transformIndexHtml() {
      const tags: HtmlTagDescriptor[] = [
        { tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(organization()), injectTo: 'head' },
      ]
      if (site) {
        const image = `${site}/og-image.png`
        const meta = (attrs: Record<string, string>): HtmlTagDescriptor => ({ tag: 'meta', attrs, injectTo: 'head' })
        tags.push(
          { tag: 'link', attrs: { rel: 'canonical', href: `${site}/` }, injectTo: 'head' },
          meta({ property: 'og:url', content: `${site}/` }),
          meta({ property: 'og:image', content: image }),
          meta({ property: 'og:image:type', content: 'image/png' }),
          meta({ property: 'og:image:width', content: '1200' }),
          meta({ property: 'og:image:height', content: '630' }),
          meta({ property: 'og:image:alt', content: 'Zamanlı Makina — gücün gələcəyi yaxındadır. Vebsayt tezliklə.' }),
          meta({ name: 'twitter:image', content: image }),
          meta({ name: 'twitter:image:alt', content: 'Zamanlı Makina — gücün gələcəyi yaxındadır. Vebsayt tezliklə.' }),
        )
      } else {
        console.warn(
          '\n[seo] SITE_URL təyin olunmayıb — canonical, og:url, og:image, twitter:image, sitemap.xml və robots.txt-dəki "Sitemap:" sətri buraxıldı.\n' +
            '      Domeni src/config/site.ts → brand.url-də və ya build zamanı SITE_URL=https://zamanlimakina.az ilə verin.\n',
        )
      }
      return tags
    },

    generateBundle() {
      const robots = ['User-agent: *', 'Allow: /', '']
      if (site) robots.push(`Sitemap: ${site}/sitemap.xml`, '')
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots.join('\n') })
      if (site) {
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source:
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            `  <url>\n    <loc>${site}/</loc>\n  </url>\n` +
            '</urlset>\n',
        })
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', ['SITE_URL', 'VITE_SITE_URL'])
  const site = normalizeSiteUrl(env.SITE_URL || env.VITE_SITE_URL || siteConfig.brand.url)
  return { plugins: [react(), seoPlugin(site)] }
})
