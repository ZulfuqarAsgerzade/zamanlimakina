/**
 * Domain model — shared by the public site, the admin panel, the demo (local) store,
 * the Supabase store and the demo seed scripts. Keep this file free of browser-only APIs.
 */

export const LOCALES = ['az', 'ru', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'az'

/** Translatable text. Missing keys mean "not translated yet" — never fill them with copies. */
export type LText = Partial<Record<Locale, string>>

export type Availability = 'in_stock' | 'on_order' | 'out_of_stock' | 'coming_soon'
export const AVAILABILITIES: Availability[] = ['in_stock', 'on_order', 'out_of_stock', 'coming_soon']

export type PriceType = 'fixed' | 'request' | 'hidden'
export type Currency = 'AZN' | 'USD' | 'EUR'
export interface Price {
  type: PriceType
  amount?: number
  currency?: Currency
}

export type PublishStatus = 'published' | 'draft'

export type GeneratorType = 'open' | 'canopy' | 'container' | 'trailer'
export type FuelType = 'diesel' | 'gas' | 'petrol' | 'dual'
export type CoolingSystem = 'water' | 'air'
export type Phase = 1 | 3
export const GENERATOR_TYPES: GeneratorType[] = ['open', 'canopy', 'container', 'trailer']
export const FUEL_TYPES: FuelType[] = ['diesel', 'gas', 'petrol', 'dual']
export const COOLING_SYSTEMS: CoolingSystem[] = ['water', 'air']
export const PHASES: Phase[] = [1, 3]

export interface ImageRef {
  /** Media-library id (when the image came from the library). */
  mediaId?: string
  /** Full-size URL (storage URL, site-relative path or data: URL in local demo mode). */
  url: string
  /** Optional small rendition used for cards / thumbnails / srcset. */
  thumbUrl?: string
  width?: number
  height?: number
  alt?: LText
}

export interface Seo {
  title?: LText
  description?: LText
}

interface BaseRecord {
  id: string
  createdAt: string
  updatedAt: string
  /** true → seeded demonstration record. Real records are always false. */
  isDemo: boolean
}

export interface Manufacturer extends BaseRecord {
  slug: string
  name: string
  logo?: ImageRef
  cover?: ImageRef
  description: LText
  website?: string
  seo: Seo
  status: PublishStatus
  sortOrder: number
}

export type CategoryKind = 'generator' | 'part'
export interface Category extends BaseRecord {
  kind: CategoryKind
  slug: string
  name: LText
  description: LText
  /** Icon key for part categories (see components/PartArt). */
  icon?: string
  sortOrder: number
  status: PublishStatus
}

export interface SpecItem {
  id: string
  label: LText
  /** Values are mostly language-neutral (e.g. "400/230"); translate only when needed. */
  value: LText
  unit?: string
}
export interface SpecGroup {
  id: string
  title: LText
  items: SpecItem[]
}

export interface Generator extends BaseRecord {
  slug: string
  manufacturerId: string | null
  categoryId: string | null
  /** Model designation, e.g. "P110-3". */
  model: string
  /** Optional marketing title override; default is "<Manufacturer> <model>". */
  title: LText
  shortDescription: LText
  description: LText
  advantages: LText[]
  applications: LText[]
  images: ImageRef[]
  price: Price
  availability: Availability
  featured: boolean
  status: PublishStatus
  /** Prime power in kVA — used for filtering and cards. */
  kvaPrime: number | null
  kvaStandby: number | null
  generatorType: GeneratorType | null
  fuelType: FuelType | null
  phase: Phase | null
  coolingSystem: CoolingSystem | null
  specGroups: SpecGroup[]
  seo: Seo
}

export interface Part extends BaseRecord {
  slug: string
  name: LText
  oemCode: string
  manufacturerId: string | null
  categoryId: string | null
  description: LText
  images: ImageRef[]
  price: Price
  availability: Availability
  featured: boolean
  status: PublishStatus
  specGroups: SpecGroup[]
  seo: Seo
}

export interface Compat {
  partId: string
  generatorId: string
}

export interface MediaItem extends BaseRecord {
  name: string
  url: string
  thumbUrl?: string
  /** Storage path (Supabase) — lets the admin delete the underlying file. */
  path?: string
  width?: number
  height?: number
  size?: number
  alt: LText
}

export type InquiryStatus = 'new' | 'read' | 'done'
export interface Inquiry extends BaseRecord {
  name: string
  phone: string
  product: string
  message: string
  locale: Locale
  status: InquiryStatus
}

export interface SocialLinks {
  instagram?: string
  facebook?: string
  linkedin?: string
  youtube?: string
  tiktok?: string
  tapaz?: string
}

export interface Settings {
  companyName: string
  logo?: ImageRef
  /** International digits only, e.g. "994501234567". Empty → WhatsApp UI is hidden. */
  whatsapp: string
  phone: string
  email: string
  address: LText
  workingHours: LText
  social: SocialLinks
  seoDefaults: {
    titleSuffix: string
    description: LText
    ogImage?: string
  }
  languages: {
    default: Locale
    enabled: Locale[]
  }
}

export interface ServiceItem {
  id: string
  icon: string
  title: LText
  text: LText
}
export interface FaqItem {
  id: string
  question: LText
  answer: LText
}
export interface HeroFact {
  id: string
  /** Small caption above the value, e.g. "kVA range". May be empty (then only the value is shown). */
  label: LText
  /** The figure itself, e.g. "20–16000", "24/7", "5 years". An empty value hides the whole item. */
  value: LText
}
export interface SiteContent {
  hero: {
    eyebrow: LText
    title: LText
    text: LText
    image?: ImageRef
    /**
     * Facts strip under the hero. `undefined` (content saved before this field existed) → the defaults are shown;
     * an explicit empty list hides the strip.
     */
    facts?: HeroFact[]
  }
  about: {
    title: LText
    paragraphs: LText[]
    image?: ImageRef
  }
  services: ServiceItem[]
  faq: FaqItem[]
  footerText: LText
  contactIntro: LText
}

export interface Catalogue {
  manufacturers: Manufacturer[]
  categories: Category[]
  generators: Generator[]
  parts: Part[]
  compat: Compat[]
}

export type EntityName = 'manufacturers' | 'categories' | 'generators' | 'parts' | 'media' | 'inquiries'
export interface EntityMap {
  manufacturers: Manufacturer
  categories: Category
  generators: Generator
  parts: Part
  media: MediaItem
  inquiries: Inquiry
}

export type DataMode = 'demo' | 'supabase'

/** Everything the public site needs to render, captured at build time for prerendering / hydration. */
export interface Snapshot {
  /** Where the build-time data came from. Only "supabase" snapshots are used to hydrate in the browser. */
  source: 'supabase' | 'demo'
  mode: DataMode
  catalogue: Catalogue
  settings: Settings
  content: SiteContent
}
