import { siteConfig } from './site.ts'

export type ContactKind = 'phone' | 'email' | 'whatsapp' | 'instagram' | 'location'

export interface ContactItem {
  kind: ContactKind
  label: string
  /** Ekranda göstərilən mətn */
  display: string
  /** Boşdursa, kart kliklənən deyil (məs. ünvan) */
  href?: string
  external?: boolean
}

const clean = (v: string) => v.trim()
const digits = (v: string) => v.replace(/\D/g, '')
const isUrl = (v: string) => /^https?:\/\//i.test(v)

/** Konfiqurasiyadan yalnız doldurulmuş əlaqə vasitələrini qaytarır. */
export function getContactItems(): ContactItem[] {
  const c = siteConfig.contact
  const items: ContactItem[] = []

  const phone = clean(c.phone)
  if (phone) {
    items.push({ kind: 'phone', label: 'Telefon', display: phone, href: `tel:+${digits(phone)}` })
  }

  const email = clean(c.email)
  if (email) {
    items.push({ kind: 'email', label: 'E-poçt', display: email, href: `mailto:${email}` })
  }

  const wa = clean(c.whatsapp)
  if (wa) {
    items.push({
      kind: 'whatsapp',
      label: 'WhatsApp',
      display: isUrl(wa) ? 'WhatsApp-da yazın' : wa,
      href: isUrl(wa) ? wa : `https://wa.me/${digits(wa)}`,
      external: true,
    })
  }

  const ig = clean(c.instagram)
  if (ig) {
    const handle = ig.replace(/^@/, '')
    items.push({
      kind: 'instagram',
      label: 'Instagram',
      display: isUrl(ig) ? 'Instagram səhifəmiz' : `@${handle}`,
      href: isUrl(ig) ? ig : `https://instagram.com/${handle}`,
      external: true,
    })
  }

  const loc = clean(c.location)
  if (loc) {
    const maps = clean(c.mapsUrl)
    items.push({
      kind: 'location',
      label: 'Ünvan',
      display: loc,
      href: maps || undefined,
      external: Boolean(maps),
    })
  }

  return items
}

/** Hero-dakı əsas CTA üçün hədəf. */
export function getPrimaryCta() {
  const href = clean(siteConfig.contact.primaryCtaHref)
  if (!href) return { href: '#elaqe', external: false }
  return { href, external: isUrl(href) }
}
