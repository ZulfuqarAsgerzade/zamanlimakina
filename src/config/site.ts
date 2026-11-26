/**
 * Static bootstrap values only (needed before any data loads and by the build).
 * Everything an editor changes — WhatsApp number, phone, e-mail, address, social links,
 * SEO defaults, languages — lives in the admin panel (Settings), not in this file.
 */
export const siteConfig = {
  brand: {
    name: 'Zamanlı Makina',
    /** Official production domain (https, no path). Override per build with SITE_URL / VITE_SITE_URL. */
    url: 'https://zamanlimakina.az',
  },
  /** Official master mark (square, amber). Per the brand book it is never shown below 110 px wide. */
  logo: {
    src: '/brand/logo.png',
    alt: 'Zamanlı Makina — rəsmi loqo',
  },
} as const
