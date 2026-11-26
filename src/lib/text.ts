import type { LText, Locale } from '../data/types.ts'
import { DEFAULT_LOCALE, LOCALES } from '../data/types.ts'

export interface Picked {
  value: string
  /** Locale the text actually came from. */
  from: Locale | null
  /** true → requested locale was missing and another language was used. */
  fallback: boolean
}

/** Exact-locale text, '' when missing (used where untranslated content must NOT pose as translated). */
export function exact(text: LText | undefined, locale: Locale): string {
  return text?.[locale]?.trim() ? (text[locale] as string) : ''
}

/** Text in `locale`, falling back to Azerbaijani, then any language; reports whether it fell back. */
export function pick(text: LText | undefined, locale: Locale): Picked {
  if (!text) return { value: '', from: null, fallback: false }
  const own = exact(text, locale)
  if (own) return { value: own, from: locale, fallback: false }
  for (const l of [DEFAULT_LOCALE, ...LOCALES]) {
    const v = exact(text, l)
    if (v) return { value: v, from: l, fallback: true }
  }
  return { value: '', from: null, fallback: false }
}

export const pickText = (text: LText | undefined, locale: Locale): string => pick(text, locale).value

/** Is every non-empty translatable field of the record available in `locale`? */
export function isTranslated(texts: Array<LText | undefined>, locale: Locale): boolean {
  const filled = texts.filter((t) => t && LOCALES.some((l) => exact(t, l)))
  return filled.length > 0 && filled.every((t) => !!exact(t, locale))
}
