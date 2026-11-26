import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { buildWhatsAppUrl } from '../../lib/whatsapp.ts'
import { trackEvent } from '../../lib/analytics.ts'
import { useData } from '../../data/DataContext.tsx'
import { useI18n } from '../../i18n/I18nContext.tsx'
import { openDialog } from './dialog.ts'
import { IconClose, IconWhatsApp } from './Icons.tsx'

interface Props {
  message: string
  /** Analytics label. */
  kind: 'generator' | 'part' | 'general' | 'float' | 'header'
  itemId?: string
  /** Product name, used to pre-fill the contact form when WhatsApp is not configured. */
  product?: string
  className?: string
  children?: ReactNode
  iconOnly?: boolean
  label?: string
}

/**
 * The single place that builds WhatsApp links. The number comes ONLY from admin → Settings (never hardcoded).
 * If it is missing the button does NOT open a broken wa.me link: it opens an explanatory dialog that sends the visitor
 * to the contact form (pre-filled with the product and message) and tells the site owner where to configure the number.
 */
export function WhatsAppButton({ message, kind, itemId, product, className = 'btn btn--wa', children, iconOnly, label }: Props) {
  const { settings } = useData()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const href = buildWhatsAppUrl(settings.whatsapp, message)
  const text = label ?? t('common.inquiry')
  const content = iconOnly ? <span className="sr-only">{text}</span> : (children ?? text)

  if (!href)
    return (
      <>
        <button
          type="button"
          className={className}
          data-wa-configured="false"
          aria-haspopup="dialog"
          aria-label={iconOnly ? text : undefined}
          title={iconOnly ? text : undefined}
          onClick={() => {
            console.warn('[whatsapp] No WhatsApp number configured — set it in Admin → Settings.')
            trackEvent('whatsapp_unconfigured_click', { kind, item_id: itemId })
            setOpen(true)
          }}
        >
          <IconWhatsApp />
          {content}
        </button>
        {open && <UnconfiguredDialog message={message} product={product} onClose={() => setOpen(false)} />}
      </>
    )

  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={iconOnly ? text : undefined}
      title={iconOnly ? text : undefined}
      onClick={() => trackEvent('whatsapp_inquiry_click', { kind, item_id: itemId })}
    >
      <IconWhatsApp />
      {content}
    </a>
  )
}

function UnconfiguredDialog({ message, product, onClose }: { message: string; product?: string; onClose: () => void }) {
  const { t, path } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    const d = ref.current
    if (d) openDialog(d)
  }, [])
  const q = new URLSearchParams()
  if (product) q.set('product', product)
  q.set('message', message)
  return (
    <dialog ref={ref} className="wa-dialog" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="wa-off-title">
      <div className="wa-dialog__panel">
        <button type="button" className="icon-btn wa-dialog__close" onClick={onClose} aria-label={t('common.close')}>
          <IconClose />
        </button>
        <h2 id="wa-off-title" className="h3">
          {t('wa.off.title')}
        </h2>
        <p>{t('wa.off.text')}</p>
        <p className="muted wa-dialog__admin">{t('wa.off.admin')}</p>
        <div className="wa-dialog__actions">
          <Link to={`${path('contact')}?${q.toString()}`} className="btn btn--primary" onClick={onClose}>
            {t('wa.off.form')}
          </Link>
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => {
              void navigator.clipboard?.writeText(message).then(() => setCopied(true))
            }}
          >
            {copied ? t('wa.off.copied') : t('wa.off.copy')}
          </button>
        </div>
      </div>
    </dialog>
  )
}
