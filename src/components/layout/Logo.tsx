import { Link } from 'react-router'
import { useI18n } from '../../i18n/I18nContext.tsx'
import { useData } from '../../data/DataContext.tsx'
import { siteConfig } from '../../config/site.ts'

/**
 * Header lockup = the brand book's typographic wordmark (ZAMANLI / MAKİNA) with the amber bar.
 * The official master mark (ZM generator badge) must never be shown below 110 px wide
 * (brand book §02), so it is used at ≥ 112 px in the footer / about / social images instead.
 */
export function Wordmark({ inverse = false }: { inverse?: boolean }) {
  const { path, locale } = useI18n()
  const { settings } = useData()
  // explicit Azerbaijani dotted capital İ (not toLocaleUpperCase) so server and browser always agree
  const base = settings.companyName || siteConfig.brand.name
  const name = (locale === 'az' ? base.replace(/i/g, 'İ') : base).toUpperCase()
  const [first, ...rest] = name.split(' ')
  return (
    <Link to={path('home')} className={`wordmark${inverse ? ' wordmark--inverse' : ''}`} aria-label={settings.companyName}>
      <span className="wordmark__bar" aria-hidden="true" />
      <span className="wordmark__text" aria-hidden="true">
        <b>{first}</b>
        <i>{rest.join(' ')}</i>
      </span>
    </Link>
  )
}

/** Official master mark (square, amber). Rendered ≥ 112 px per the brand book. */
export function MasterMark({ size = 120 }: { size?: number }) {
  const { settings } = useData()
  const src = settings.logo?.url || siteConfig.logo.src
  return (
    <img
      className="master-mark"
      src={src}
      width={Math.max(size, 112)}
      height={Math.max(size, 112)}
      alt={siteConfig.logo.alt}
      loading="lazy"
      decoding="async"
    />
  )
}
