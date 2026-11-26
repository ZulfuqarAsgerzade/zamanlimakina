import { Link } from 'react-router'
import { useI18n } from '../i18n/I18nContext.tsx'
import { useSeo } from '../lib/useSeo.ts'
import { IconArrow } from '../components/ui/Icons.tsx'

/** Custom 404. Rendered inside the site shell; marked noindex. */
export default function NotFoundPage() {
  const { t, path } = useI18n()
  useSeo({ title: t('nf.title'), route: 'home', noindex: true, noLinks: true })
  return (
    <section className="nf">
      <div className="container nf__inner">
        <p className="nf__code num" aria-hidden="true">
          404
        </p>
        <h1 className="h1">{t('nf.title')}</h1>
        <p className="lead">{t('nf.text')}</p>
        <div className="nf__actions">
          <Link to={path('home')} className="btn btn--primary">
            {t('nf.home')}
          </Link>
          <Link to={path('generators')} className="btn btn--outline">
            {t('nf.catalogue')}
            <IconArrow />
          </Link>
        </div>
      </div>
    </section>
  )
}
