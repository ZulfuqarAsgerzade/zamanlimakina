import { useMemo } from 'react'
import { useData } from '../data/DataContext.tsx'
import { useI18n } from '../i18n/I18nContext.tsx'
import { LOCALES } from '../data/types.ts'
import type { Locale } from '../data/types.ts'
import { useHead } from './head.ts'
import { organizationLd } from './jsonld.ts'
import { buildPath } from './routes.ts'
import type { RouteKey, RouteParams } from './routes.ts'

interface SeoInput {
  title: string
  description?: string
  route: RouteKey
  params?: RouteParams
  image?: string
  ogType?: 'website' | 'product' | 'article'
  noindex?: boolean
  /** No canonical / hreflang / og:url (404 pages must not point at a real URL). */
  noLinks?: boolean
  /** Locales in which this exact page has real (translated) content. Default: all enabled. */
  translatedLocales?: Locale[]
  jsonLd?: Array<Record<string, unknown>>
}

/**
 * Unique <title>, meta description, canonical, hreflang, Open Graph and JSON-LD for a page.
 * Untranslated pages never advertise themselves as a translation: their canonical points at the
 * default-language URL and hreflang lists only the languages that really exist.
 */
export function useSeo(input: SeoInput) {
  const { locale } = useI18n()
  const { settings } = useData()
  const enabled = LOCALES.filter((l) => settings.languages.enabled.includes(l))
  const translated = (input.translatedLocales ?? enabled).filter((l) => enabled.includes(l))
  const isTranslatedHere = translated.includes(locale)
  const canonicalLocale: Locale = isTranslatedHere ? locale : (translated[0] ?? 'az')

  const spec = useMemo(
    () => ({
      title: input.title.includes(settings.seoDefaults.titleSuffix) ? input.title : `${input.title} | ${settings.seoDefaults.titleSuffix}`,
      description: input.description,
      canonicalPath: input.noLinks ? '' : buildPath(canonicalLocale, input.route, input.params),
      alternates: input.noLinks ? [] : translated.map((l) => ({ locale: l, path: buildPath(l, input.route, input.params) })),
      // social crawlers do not render SVG: product artwork that is vector falls back to the default raster card
      image: (input.image && !/\.svg(\?|$)/i.test(input.image) ? input.image : undefined) ?? settings.seoDefaults.ogImage ?? '/og-image.png',
      ogType: input.ogType,
      noindex: input.noindex,
      jsonLd: [organizationLd(settings, locale), ...(input.jsonLd ?? [])],
      locale,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(input), settings, locale, canonicalLocale, translated.join(',')],
  )
  useHead(spec)
}
