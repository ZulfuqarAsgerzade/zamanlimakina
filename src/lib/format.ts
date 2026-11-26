import type { Availability, Locale, Price } from '../data/types.ts'

/**
 * Number and price formatting is implemented by hand instead of Intl on purpose: prerendered HTML (built by Node with its
 * ICU data) must match what the visitor's browser renders, and the CLDR data differs between engines
 * (e.g. az-AZ currency is "18.900 US$" in Node but "$ 18,900" in Chrome), which makes React discard the server HTML.
 */
const NBSP = ' '
const SYMBOL = { AZN: '₼', USD: '$', EUR: '€' } as const

function group(intPart: string, sep: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep)
}

/** kVA and similar technical figures: no digit grouping, locale decimal separator. */
export function formatNumber(n: number, locale: Locale): string {
  const s = String(Math.round(n * 100) / 100)
  return locale === 'en' ? s : s.replace('.', ',')
}

export function formatPrice(price: Price, locale: Locale): string | null {
  if (price.type !== 'fixed' || !price.amount || !price.currency) return null
  const int = String(Math.round(price.amount))
  const sym = SYMBOL[price.currency]
  return locale === 'en' ? `${sym}${group(int, ',')}` : `${group(int, NBSP)}${NBSP}${sym}`
}

export const availabilityTone: Record<Availability, 'ok' | 'warn' | 'off' | 'info'> = {
  in_stock: 'ok',
  on_order: 'warn',
  out_of_stock: 'off',
  coming_soon: 'info',
}
