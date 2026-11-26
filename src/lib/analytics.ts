/**
 * Analytics bridge. Sends events to whichever provider the site owner has configured
 * (GA4 `gtag`, Google Tag Manager `dataLayer`, Plausible). If none is present it does nothing.
 * Never put personal data (phone numbers, names) in event parameters.
 */
type Params = Record<string, string | number | boolean | undefined>

interface AnalyticsWindow {
  gtag?: (...a: unknown[]) => void
  dataLayer?: unknown[]
  plausible?: (name: string, opts?: { props?: Params }) => void
}

export function trackEvent(name: string, params: Params = {}): void {
  if (typeof window === 'undefined') return
  const w = window as unknown as AnalyticsWindow
  try {
    if (typeof w.gtag === 'function') w.gtag('event', name, params)
    else if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event: name, ...params })
    if (typeof w.plausible === 'function') w.plausible(name, { props: params })
  } catch {
    /* analytics must never break the UI */
  }
}
