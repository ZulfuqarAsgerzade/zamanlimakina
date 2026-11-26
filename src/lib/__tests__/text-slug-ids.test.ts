import { describe, expect, it } from 'vitest'
import { exact, isTranslated, pick } from '../text.ts'
import { slugify } from '../slug.ts'
import { demoId, newId } from '../ids.ts'
import { formatNumber, formatPrice } from '../format.ts'

describe('localized text', () => {
  it('reports fallback instead of pretending a translation exists', () => {
    const t = { az: 'Salam', en: 'Hello' }
    expect(pick(t, 'en')).toEqual({ value: 'Hello', from: 'en', fallback: false })
    expect(pick(t, 'ru')).toEqual({ value: 'Salam', from: 'az', fallback: true })
    expect(exact(t, 'ru')).toBe('')
    expect(pick(undefined, 'az').value).toBe('')
    expect(pick({ ru: 'Привет' }, 'en')).toEqual({ value: 'Привет', from: 'ru', fallback: true })
  })
  it('isTranslated requires every filled field in the locale', () => {
    expect(isTranslated([{ az: 'a', ru: 'b' }, { az: 'c' }], 'ru')).toBe(false)
    expect(isTranslated([{ az: 'a', ru: 'b' }, undefined], 'ru')).toBe(true)
  })
})

describe('slugify', () => {
  it('handles Azerbaijani and Russian letters', () => {
    expect(slugify('Yağ filtri — Çox güclü İşıq')).toBe('yag-filtri-cox-guclu-isiq')
    expect(slugify('Фильтр масляный')).toBe('filtr-maslyanyy')
    expect(slugify('  Perkins 1104A-44TG2 ')).toBe('perkins-1104a-44tg2')
    expect(slugify('A & B')).toBe('a-and-b')
  })
})

describe('ids', () => {
  it('demo ids are deterministic uuid-shaped and distinct', () => {
    const a = demoId('mfr:perkins')
    expect(a).toBe(demoId('mfr:perkins'))
    expect(a).not.toBe(demoId('mfr:cummins'))
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(newId()).not.toBe(newId())
  })
})

describe('price and number formatting (engine-independent, so prerendered HTML hydrates cleanly)', () => {
  it('formats fixed prices only, with fixed literal output', () => {
    expect(formatPrice({ type: 'fixed', amount: 18900, currency: 'USD' }, 'en')).toBe('$18,900')
    expect(formatPrice({ type: 'fixed', amount: 18900, currency: 'USD' }, 'az')).toBe('18\u00a0900\u00a0$')
    expect(formatPrice({ type: 'fixed', amount: 1234567, currency: 'EUR' }, 'ru')).toBe('1\u00a0234\u00a0567\u00a0€')
    expect(formatPrice({ type: 'fixed', amount: 220, currency: 'AZN' }, 'az')).toBe('220\u00a0₼')
    expect(formatPrice({ type: 'request' }, 'az')).toBeNull()
    expect(formatPrice({ type: 'hidden' }, 'az')).toBeNull()
  })
  it('formats kVA figures without grouping and with the locale decimal separator', () => {
    expect(formatNumber(1800, 'az')).toBe('1800')
    expect(formatNumber(33.5, 'ru')).toBe('33,5')
    expect(formatNumber(33.5, 'en')).toBe('33.5')
  })
})
