import { createContext, useCallback, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { az } from './az.ts'
import type { DictKey } from './az.ts'
import { ru } from './ru.ts'
import { en } from './en.ts'
import { buildPath, parsePath } from '../lib/routes.ts'
import type { RouteKey, RouteParams } from '../lib/routes.ts'
import { exact, pick } from '../lib/text.ts'
import type { LText, Locale } from '../data/types.ts'

const DICTS: Record<Locale, Record<DictKey, string>> = { az, ru, en }

export type TFn = (key: DictKey, vars?: Record<string, string | number>) => string

interface I18nValue {
  locale: Locale
  t: TFn
  /** Localized absolute path for a route. */
  path: (route: RouteKey, params?: RouteParams) => string
  /** Same page in another language (keeps params + query). */
  switchPath: (to: Locale) => string
  /** Text in the active locale with fallback info. */
  text: (value: LText | undefined) => string
  /** true when the active-locale text is missing and a fallback language was used. */
  isFallback: (value: LText | undefined) => boolean
}

const Ctx = createContext<I18nValue | null>(null)

export function translate(locale: Locale, key: DictKey, vars?: Record<string, string | number>): string {
  const raw = DICTS[locale][key] ?? az[key] ?? key
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : raw
}

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const loc = useLocation()
  const t = useCallback<TFn>((key, vars) => translate(locale, key, vars), [locale])
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      t,
      path: (route, params) => buildPath(locale, route, params),
      switchPath: (to) => {
        const parsed = parsePath(loc.pathname)
        const base = parsed.route ? buildPath(to, parsed.route, parsed.params) : buildPath(to, 'home')
        return `${base}${loc.search}`
      },
      text: (v) => pick(v, locale).value,
      isFallback: (v) => !!v && !exact(v, locale) && pick(v, locale).fallback,
    }),
    [locale, t, loc.pathname, loc.search],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n(): I18nValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useI18n must be used inside <I18nProvider>')
  return v
}
