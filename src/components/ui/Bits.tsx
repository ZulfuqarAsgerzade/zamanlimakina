import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Availability, Locale } from '../../data/types.ts'
import { availabilityTone } from '../../lib/format.ts'
import { useI18n } from '../../i18n/I18nContext.tsx'
import { IconChevronRight } from './Icons.tsx'

export function AvailabilityBadge({ value }: { value: Availability }) {
  const { t } = useI18n()
  return <span className={`badge badge--${availabilityTone[value]}`}>{t(`availability.${value}` as const)}</span>
}

export function DemoBadge() {
  const { t } = useI18n()
  return <span className="badge badge--demo">{t('common.demo')}</span>
}

export interface Crumb {
  label: string
  to?: string
}
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { t } = useI18n()
  return (
    <nav className="crumbs" aria-label={t('common.breadcrumb')}>
      <ol>
        {items.map((c, i) => (
          <li key={i}>
            {c.to && i < items.length - 1 ? <Link to={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
            {i < items.length - 1 && <IconChevronRight className="crumbs__sep" />}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function SectionHead({
  eyebrow,
  title,
  lead,
  action,
  as: Tag = 'h2',
}: {
  eyebrow?: string
  title: string
  lead?: string
  action?: ReactNode
  as?: 'h1' | 'h2'
}) {
  return (
    <header className="sec-head" data-reveal>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <Tag className="h2">{title}</Tag>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {action && <div className="sec-head__action">{action}</div>}
    </header>
  )
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="empty" role="status">
      <p className="h3">{title}</p>
      {hint && <p className="muted">{hint}</p>}
      {action}
    </div>
  )
}

export function NotTranslatedNote() {
  const { t } = useI18n()
  return (
    <p className="note note--info" role="note">
      {t('common.notTranslated')}
    </p>
  )
}

export function DemoNote() {
  const { t } = useI18n()
  return (
    <p className="note note--demo" role="note">
      <DemoBadge /> <span>{t('common.demoNote')}</span>
    </p>
  )
}

export type { Locale }
