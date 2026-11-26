import { useLocation } from 'react-router'
import { useI18n } from '../../i18n/I18nContext.tsx'
import { generalMessage } from '../../lib/whatsapp.ts'
import { parsePath } from '../../lib/routes.ts'
import { SITE_URL } from '../../lib/head.ts'
import { WhatsAppButton } from '../ui/WhatsAppButton.tsx'

/** Global floating button. Hidden on product pages, which carry their own sticky inquiry bar on mobile. */
export function FloatingWhatsApp() {
  const { t, locale } = useI18n()
  const { pathname } = useLocation()
  const route = parsePath(pathname).route
  if (route === 'generator' || route === 'part') return null
  return (
    <WhatsAppButton
      message={generalMessage(locale, `${SITE_URL}${pathname}`)}
      kind="float"
      className="wa-float"
      iconOnly
      label={t('wa.float')}
    />
  )
}
