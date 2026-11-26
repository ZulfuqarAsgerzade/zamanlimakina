import type { ReactNode } from 'react'
import { useData } from '../../data/DataContext.tsx'
import { useI18n } from '../../i18n/I18nContext.tsx'

/** Renders children once the catalogue is ready; skeleton while loading; retryable error otherwise. */
export function WhenReady({ children }: { children: ReactNode }) {
  const { status, reload } = useData()
  const { t } = useI18n()
  if (status === 'loading')
    return (
      <div className="container page-skeleton" aria-busy="true" aria-live="polite">
        <span className="sr-only">{t('common.loading')}</span>
        <div className="sk sk--title" />
        <div className="sk sk--line" />
        <div className="grid grid--gen">
          {[0, 1, 2].map((i) => (
            <div key={i} className="sk sk--card" />
          ))}
        </div>
      </div>
    )
  if (status === 'error')
    return (
      <div className="container empty" role="alert">
        <p className="h3">{t('common.error')}</p>
        <button type="button" className="btn btn--dark" onClick={reload}>
          {t('common.retry')}
        </button>
      </div>
    )
  return <>{children}</>
}
