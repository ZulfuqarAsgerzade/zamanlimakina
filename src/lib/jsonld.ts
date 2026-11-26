import type { Generator, Locale, Manufacturer, Part, Settings } from '../data/types.ts'
import { SITE_URL } from './head.ts'
import { safeHttpUrl } from './safeUrl.ts'

export const organizationLd = (settings: Settings, locale: Locale): Record<string, unknown> => {
  const sameAs = Object.values(settings.social).map(safeHttpUrl).filter((u): u is string => !!u)
  const address = settings.address[locale] || settings.address.az
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.companyName,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/brand/logo.png`,
    ...(settings.email || settings.phone
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'sales',
            ...(settings.phone ? { telephone: settings.phone } : {}),
            ...(settings.email ? { email: settings.email } : {}),
          },
        }
      : {}),
    ...(address ? { address: { '@type': 'PostalAddress', streetAddress: address, addressCountry: 'AZ' } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  }
}

export const breadcrumbLd = (items: Array<{ name: string; path: string }>): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: `${SITE_URL}${it.path}`,
  })),
})

const AVAIL: Record<string, string> = {
  in_stock: 'https://schema.org/InStock',
  on_order: 'https://schema.org/BackOrder',
  out_of_stock: 'https://schema.org/OutOfStock',
  coming_soon: 'https://schema.org/PreOrder',
}

interface ProductLdInput {
  item: Generator | Part
  name: string
  description: string
  url: string
  images: string[]
  brand?: Manufacturer
  sku: string
  mpn?: string
}

/** Product structured data. `offers` is emitted ONLY for real fixed prices — never for "price on request" and never for demo records. */
export function productLd({ item, name, description, url, images, brand, sku, mpn }: ProductLdInput): Record<string, unknown> {
  const rasterImages = images.filter((i) => !/\.svg(\?|$)/i.test(i))
  const hasOffer = !item.isDemo && item.price.type === 'fixed' && item.price.amount && item.price.currency
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    sku,
    ...(mpn ? { mpn } : {}),
    url,
    ...(rasterImages.length ? { image: rasterImages.map((i) => (i.startsWith('http') ? i : `${SITE_URL}${i}`)) } : {}),
    ...(brand ? { brand: { '@type': 'Brand', name: brand.name } } : {}),
    ...(hasOffer
      ? {
          offers: {
            '@type': 'Offer',
            price: item.price.amount,
            priceCurrency: item.price.currency,
            availability: AVAIL[item.availability],
            url,
          },
        }
      : {}),
  }
}
