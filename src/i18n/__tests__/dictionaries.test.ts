import { describe, expect, it } from 'vitest'
import { az } from '../az.ts'
import { ru } from '../ru.ts'
import { en } from '../en.ts'
import { translate } from '../I18nContext.tsx'

describe('UI dictionaries', () => {
  const keys = Object.keys(az)
  it('ru and en define every key and no extras', () => {
    expect(Object.keys(ru).sort()).toEqual([...keys].sort())
    expect(Object.keys(en).sort()).toEqual([...keys].sort())
  })
  it('no empty strings; placeholders match across languages', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',')
    for (const k of keys as Array<keyof typeof az>) {
      for (const d of [az, ru, en]) expect(d[k].trim().length).toBeGreaterThan(0)
      expect(ph(ru[k])).toBe(ph(az[k]))
      expect(ph(en[k])).toBe(ph(az[k]))
    }
  })
  it('interpolates variables', () => {
    expect(translate('en', 'common.results', { n: 5 })).toBe('5 results')
    expect(translate('ru', 'common.showing', { shown: 3, total: 9 })).toBe('Показано 3 из 9')
  })
})
