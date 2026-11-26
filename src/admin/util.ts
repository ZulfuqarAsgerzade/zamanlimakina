import { fold } from '../data/queries.ts'
import { ValidationError } from '../data/schema.ts'
import type { FieldErrors } from '../data/schema.ts'
import type { LText, Locale } from '../data/types.ts'
import { LOCALES } from '../data/types.ts'

export const LOCALE_LABEL: Record<Locale, string> = { az: 'AZ', ru: 'RU', en: 'EN' }

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Naməlum xəta baş verdi.'
}

export function toFieldErrors(e: unknown): FieldErrors | null {
  return e instanceof ValidationError ? e.errors : null
}

export const filled = (t: LText | undefined, l: Locale) => !!t?.[l]?.trim()
export const filledCount = (t: LText | undefined) => LOCALES.filter((l) => filled(t, l)).length

/** Local-time friendly date. */
export function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('az-AZ', { year: 'numeric', month: '2-digit', day: '2-digit' })
  } catch {
    return iso
  }
}

export function fmtBytes(n?: number): string {
  if (!n) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** Admin-side password rule (mirrors the demo store; Supabase enforces its own policy). */
export function checkPassword(p: string): string | null {
  if (p.length < 10) return 'Parol ən azı 10 simvol olmalıdır.'
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Parol həm hərf, həm rəqəm içərməlidir.'
  return null
}

export function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length || from === to) return arr
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export const pickAz = (t: LText | undefined): string => t?.az?.trim() || t?.ru?.trim() || t?.en?.trim() || ''

export function errorsForPrefix(errors: FieldErrors, prefixes: string[]): string[] {
  return Object.entries(errors)
    .filter(([k]) => prefixes.some((p) => k === p || k.startsWith(`${p}.`)))
    .map(([, v]) => v)
}

/**
 * Admin list search: plain case-insensitive substring first, then a diacritic/separator-tolerant fallback
 * ("1104a44tg2" finds "1104A-44TG2", "yag" finds "Yağ"). Unlike the public token search it keeps
 * the whole query together, so "media-a" does not match "media-b".
 */
export function searchMatch(haystacks: string[], query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (haystacks.join(' ').toLowerCase().includes(q)) return true
  const f = fold(query).replace(/\s+/g, '')
  return f.length > 0 && haystacks.map(fold).join(' ').replace(/\s+/g, '').includes(f)
}

/** Absolute http(s) URL only. */
export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
