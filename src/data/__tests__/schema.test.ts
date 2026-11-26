import { describe, expect, it } from 'vitest'
import { buildDemoDataset } from '../../demo/dataset.ts'
import { settingsSchema, validateEntity } from '../schema.ts'
import { defaultSettings } from '../defaults.ts'
import { safeHttpUrl } from '../../lib/safeUrl.ts'
import { fromRow, toRow } from '../supabaseMap.ts'

const d = buildDemoDataset()

describe('validation rules', () => {
  const base = d.generators[0]
  it('rejects bad slugs, missing model and non-positive power', () => {
    expect(validateEntity('generators', { ...base, slug: 'Bad Slug' })).toMatchObject({ ok: false })
    const r = validateEntity('generators', { ...base, model: '  ', kvaPrime: -5 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(['model', 'kvaPrime']))
  })
  it('publishing requires a manufacturer and power; drafts do not', () => {
    expect(validateEntity('generators', { ...base, manufacturerId: null }).ok).toBe(false)
    expect(validateEntity('generators', { ...base, manufacturerId: null, kvaPrime: null, status: 'draft' }).ok).toBe(true)
  })
  it('fixed price needs amount and currency', () => {
    expect(validateEntity('generators', { ...base, price: { type: 'fixed' } }).ok).toBe(false)
    expect(validateEntity('generators', { ...base, price: { type: 'fixed', amount: 100, currency: 'AZN' } }).ok).toBe(true)
    expect(validateEntity('generators', { ...base, price: { type: 'request' } }).ok).toBe(true)
  })
  it('parts need an OEM code and an Azerbaijani name', () => {
    const p = d.parts[0]
    expect(validateEntity('parts', { ...p, oemCode: '' }).ok).toBe(false)
    expect(validateEntity('parts', { ...p, name: { ru: 'x' } }).ok).toBe(false)
  })
  it('inquiry phone and name are validated', () => {
    const q = { id: 'x', createdAt: 'a', updatedAt: 'a', isDemo: false, name: 'Əli Vəliyev', phone: '+994 50 123 45 67', product: '', message: '', locale: 'az', status: 'new' }
    expect(validateEntity('inquiries', q).ok).toBe(true)
    expect(validateEntity('inquiries', { ...q, phone: 'abc' }).ok).toBe(false)
    expect(validateEntity('inquiries', { ...q, name: 'A' }).ok).toBe(false)
  })
})

describe('Supabase row mapping', () => {
  it('round-trips camelCase ↔ snake_case at the top level and keeps jsonb shapes', () => {
    const g = d.generators[3]
    const row = toRow(g)
    expect(row).toHaveProperty('manufacturer_id', g.manufacturerId)
    expect(row).toHaveProperty('is_demo', true)
    expect(row).toHaveProperty('spec_groups')
    expect(fromRow(row)).toEqual(g)
  })
  it('drops undefined and nulls out unset optional jsonb', () => {
    expect(toRow({ a: 1, b: undefined })).toEqual({ a: 1 })
    expect(fromRow({ logo: null, slug: 'x' })).toEqual({ slug: 'x' })
  })
})

describe('URL hardening', () => {
  it('rejects non-http(s) schemes in social links and manufacturer websites', () => {
    const ok = settingsSchema.safeParse({ ...defaultSettings(), social: { instagram: 'https://instagram.com/zm', facebook: '' } })
    expect(ok.success).toBe(true)
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'vbscript:x', '//evil.com', 'instagram.com/zm', 'https://a b.com'])
      expect(settingsSchema.safeParse({ ...defaultSettings(), social: { instagram: bad } }).success, bad).toBe(false)
    expect(validateEntity('manufacturers', { ...d.manufacturers[0], website: 'javascript:alert(1)' }).ok).toBe(false)
    expect(validateEntity('manufacturers', { ...d.manufacturers[0], website: 'https://perkins.com' }).ok).toBe(true)
  })
  it('safeHttpUrl only lets http(s) through', () => {
    expect(safeHttpUrl('https://tap.az/shops/x')).toBe('https://tap.az/shops/x')
    expect(safeHttpUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeHttpUrl('  ')).toBeUndefined()
    expect(safeHttpUrl('not a url')).toBeUndefined()
  })
})
