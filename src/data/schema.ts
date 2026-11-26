import { z } from 'zod'
import { AVAILABILITIES, COOLING_SYSTEMS, FUEL_TYPES, GENERATOR_TYPES } from './types.ts'
import type { EntityName } from './types.ts'

/**
 * Validation rules shared by every store (the local demo store enforces them in the browser,
 * the Supabase store enforces them before sending AND the SQL migrations repeat the critical
 * ones as CHECK constraints so a hand-written API call cannot bypass them).
 */

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ltext = z.object({ az: z.string().optional(), ru: z.string().optional(), en: z.string().optional() })
const requiredAz = (msg: string) =>
  ltext.refine((v) => !!v.az && v.az.trim().length > 0, { message: msg })

const imageRef = z.object({
  mediaId: z.string().optional(),
  url: z.string().min(1, 'Şəkil ünvanı boşdur'),
  thumbUrl: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  alt: ltext.optional(),
})

/** Absolute http(s) URL or empty. `new URL("javascript:…")` parses fine, so the scheme is checked explicitly. */
const httpUrl = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\/[^\s]+$/i.test(v), { message: 'Düzgün http(s) ünvanı daxil edin (https://…)' })

const seo = z.object({ title: ltext.optional(), description: ltext.optional() }).default({})

const price = z
  .object({
    type: z.enum(['fixed', 'request', 'hidden']),
    amount: z.number().nonnegative().optional(),
    currency: z.enum(['AZN', 'USD', 'EUR']).optional(),
  })
  .refine((p) => p.type !== 'fixed' || (p.amount !== undefined && p.amount > 0 && !!p.currency), {
    message: 'Sabit qiymət üçün məbləğ və valyuta tələb olunur',
    path: ['amount'],
  })

const specGroups = z
  .array(
    z.object({
      id: z.string(),
      title: ltext,
      items: z.array(z.object({ id: z.string(), label: ltext, value: ltext, unit: z.string().optional() })),
    }),
  )
  .default([])

const base = {
  id: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  isDemo: z.boolean(),
}
const slug = z.string().min(2, 'Slug ən azı 2 simvol olmalıdır').regex(slugRe, 'Slug yalnız kiçik latın hərfləri, rəqəmlər və tire içərə bilər')
const status = z.enum(['published', 'draft'])
const nullableId = z.string().nullable()
const numOrNull = z.number().positive('Müsbət ədəd daxil edin').nullable()

export const manufacturerSchema = z.object({
  ...base,
  slug,
  name: z.string().trim().min(1, 'Ad tələb olunur').max(80),
  logo: imageRef.optional(),
  cover: imageRef.optional(),
  description: ltext,
  website: httpUrl.optional(),
  seo,
  status,
  sortOrder: z.number().int(),
})

export const categorySchema = z.object({
  ...base,
  kind: z.enum(['generator', 'part']),
  slug,
  name: requiredAz('Azərbaycan dilində ad tələb olunur'),
  description: ltext,
  icon: z.string().optional(),
  sortOrder: z.number().int(),
  status,
})

export const generatorSchema = z
  .object({
    ...base,
    slug,
    manufacturerId: nullableId,
    categoryId: nullableId,
    model: z.string().trim().min(1, 'Model tələb olunur').max(80),
    title: ltext,
    shortDescription: ltext,
    description: ltext,
    advantages: z.array(ltext).default([]),
    applications: z.array(ltext).default([]),
    images: z.array(imageRef).default([]),
    price,
    availability: z.enum(AVAILABILITIES as [string, ...string[]]),
    featured: z.boolean(),
    status,
    kvaPrime: numOrNull,
    kvaStandby: numOrNull,
    generatorType: z.enum(GENERATOR_TYPES as [string, ...string[]]).nullable(),
    fuelType: z.enum(FUEL_TYPES as [string, ...string[]]).nullable(),
    phase: z.union([z.literal(1), z.literal(3)]).nullable(),
    coolingSystem: z.enum(COOLING_SYSTEMS as [string, ...string[]]).nullable(),
    specGroups,
    seo,
  })
  .refine((g) => g.status === 'draft' || (g.manufacturerId && g.kvaPrime), {
    message: 'Dərc etmək üçün istehsalçı və güc (kVA) tələb olunur',
    path: ['manufacturerId'],
  })

export const partSchema = z.object({
  ...base,
  slug,
  name: requiredAz('Azərbaycan dilində ad tələb olunur'),
  oemCode: z.string().trim().min(1, 'OEM / istinad kodu tələb olunur').max(60),
  manufacturerId: nullableId,
  categoryId: nullableId,
  description: ltext,
  images: z.array(imageRef).default([]),
  price,
  availability: z.enum(AVAILABILITIES as [string, ...string[]]),
  featured: z.boolean(),
  status,
  specGroups,
  seo,
})

export const mediaSchema = z.object({
  ...base,
  name: z.string().min(1),
  url: z.string().min(1),
  thumbUrl: z.string().optional(),
  path: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  size: z.number().optional(),
  alt: ltext,
})

export const inquirySchema = z.object({
  ...base,
  name: z.string().trim().min(2, 'Ad ən azı 2 simvol olmalıdır').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{6,24}$/, 'Düzgün telefon nömrəsi daxil edin'),
  product: z.string().trim().max(200),
  message: z.string().trim().max(2000),
  locale: z.enum(['az', 'ru', 'en']),
  status: z.enum(['new', 'read', 'done']),
})

export const settingsSchema = z.object({
  companyName: z.string().trim().min(1, 'Şirkət adı tələb olunur'),
  logo: imageRef.optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^(\d{9,15})?$/, 'WhatsApp nömrəsi yalnız rəqəmlərdən (beynəlxalq format, məs. 994XXXXXXXXX) ibarət olmalıdır'),
  phone: z.string().trim().max(40),
  email: z.string().trim().email('Düzgün e-poçt daxil edin').or(z.literal('')),
  address: ltext,
  workingHours: ltext,
  social: z.object({
    instagram: httpUrl.optional(),
    facebook: httpUrl.optional(),
    linkedin: httpUrl.optional(),
    youtube: httpUrl.optional(),
    tiktok: httpUrl.optional(),
    tapaz: httpUrl.optional(),
  }),
  seoDefaults: z.object({
    titleSuffix: z.string(),
    description: ltext,
    // site-relative path or absolute http(s) URL
    ogImage: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\/[^\s]*$/.test(v) || /^https?:\/\/[^\s]+$/i.test(v), { message: 'Yol (/og-image.png) və ya http(s) ünvanı daxil edin' })
      .optional(),
  }),
  languages: z.object({
    default: z.enum(['az', 'ru', 'en']),
    enabled: z.array(z.enum(['az', 'ru', 'en'])).min(1, 'Ən azı bir dil aktiv olmalıdır'),
  }),
})

export const contentSchema = z.object({
  hero: z.object({
    eyebrow: ltext,
    title: ltext,
    text: ltext,
    image: imageRef.optional(),
    facts: z.array(z.object({ id: z.string(), label: ltext, value: ltext })).max(4, 'Ən çox 4 göstərici ola bilər').optional(),
  }),
  about: z.object({ title: ltext, paragraphs: z.array(ltext), image: imageRef.optional() }),
  services: z.array(z.object({ id: z.string(), icon: z.string(), title: ltext, text: ltext })),
  faq: z.array(z.object({ id: z.string(), question: ltext, answer: ltext })),
  footerText: ltext,
  contactIntro: ltext,
})

export const entitySchemas = {
  manufacturers: manufacturerSchema,
  categories: categorySchema,
  generators: generatorSchema,
  parts: partSchema,
  media: mediaSchema,
  inquiries: inquirySchema,
} satisfies Record<EntityName, z.ZodType>

export interface FieldErrors {
  [path: string]: string
}

/** Validate and return the first message per field path (e.g. `slug`, `images.0.url`). */
export function validateEntity(entity: EntityName, value: unknown): { ok: true } | { ok: false; errors: FieldErrors } {
  const r = entitySchemas[entity].safeParse(value)
  if (r.success) return { ok: true }
  const errors: FieldErrors = {}
  for (const issue of r.error.issues) {
    const key = issue.path.join('.') || '_'
    if (!errors[key]) errors[key] = issue.message
  }
  return { ok: false, errors }
}

export class ValidationError extends Error {
  errors: FieldErrors
  constructor(errors: FieldErrors) {
    super(Object.values(errors)[0] ?? 'Yoxlama xətası')
    this.name = 'ValidationError'
    this.errors = errors
  }
}
