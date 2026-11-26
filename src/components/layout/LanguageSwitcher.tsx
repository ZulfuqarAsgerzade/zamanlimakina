import { Link } from 'react-router'
import { LOCALES } from '../../data/types.ts'
import type { Locale } from '../../data/types.ts'
import { useData } from '../../data/DataContext.tsx'
import { useI18n } from '../../i18n/I18nContext.tsx'

const LABEL: Record<Locale, string> = { az: 'AZ', ru: 'RU', en: 'EN' }
const NAME: Record<Locale, string> = { az: 'Azərbaycanca', ru: 'Русский', en: 'English' }

export function LanguageSwitcher() {
  const { locale, switchPath, t } = useI18n()
  const { settings } = useData()
  const enabled = LOCALES.filter((l) => settings.languages.enabled.includes(l))
  if (enabled.length < 2) return null
  return (
    <nav className="lang" aria-label={t('nav.language')}>
      {enabled.map((l) => (
        <Link
          key={l}
          to={switchPath(l)}
          hrefLang={l}
          lang={l}
          className="lang__item"
          aria-current={l === locale ? 'true' : undefined}
          title={NAME[l]}
        >
          {LABEL[l]}
        </Link>
      ))}
    </nav>
  )
}
