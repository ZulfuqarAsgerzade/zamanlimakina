import { describe, expect, it } from 'vitest'
import { defaultContent } from '../../data/defaults.ts'
import { contentSchema } from '../../data/schema.ts'
import { pickText } from '../text.ts'
import { resolveHeroFacts } from '../heroFacts.ts'

const az = (t: Parameters<typeof pickText>[0]) => pickText(t, 'az')
const ru = (t: Parameters<typeof pickText>[0]) => pickText(t, 'ru')

describe('hero facts', () => {
  it('defaults are exactly the brand book statements, in all three languages', () => {
    const f = resolveHeroFacts(defaultContent(), az)
    expect(f.map((x) => [x.value, x.label])).toEqual([
      ['20–16000', 'kVA aralığı'],
      ['24/7', 'Texniki dəstək'],
      ['5 il', 'Rəsmi zəmanət'],
    ])
    expect(resolveHeroFacts(defaultContent(), ru).map((x) => x.value)).toEqual(['20–16000', '24/7', '5 лет'])
  })

  it('content saved before the feature existed (no facts key) falls back to the defaults', () => {
    const legacy = defaultContent()
    delete legacy.hero.facts
    expect(resolveHeroFacts(legacy, az)).toHaveLength(3)
  })

  it('drops items with an empty value, keeps value-only items, and hides everything for an explicit empty list', () => {
    const c = defaultContent()
    c.hero.facts = [
      { id: 'a', label: { az: 'Etiket' }, value: { az: '  ' } },
      { id: 'b', label: {}, value: { az: '100+' } },
      { id: 'c', label: { az: 'L' }, value: { az: 'V' } },
    ]
    expect(resolveHeroFacts(c, az)).toEqual([
      { id: 'b', label: '', value: '100+' },
      { id: 'c', label: 'L', value: 'V' },
    ])
    c.hero.facts = []
    expect(resolveHeroFacts(c, az)).toEqual([])
  })

  it('an untranslated item falls back to the Azerbaijani text instead of disappearing', () => {
    const c = defaultContent()
    c.hero.facts = [{ id: 'a', label: { az: 'Etiket' }, value: { az: '5 il' } }]
    const viaPick = (t: Parameters<typeof pickText>[0]) => pickText(t, 'ru')
    expect(resolveHeroFacts(c, viaPick)[0].value).toBe('5 il')
  })

  it('schema accepts up to four facts and rejects five', () => {
    const c = defaultContent()
    const f = (i: number) => ({ id: String(i), label: {}, value: { az: String(i) } })
    c.hero.facts = [1, 2, 3, 4].map(f)
    expect(contentSchema.safeParse(c).success).toBe(true)
    c.hero.facts = [1, 2, 3, 4, 5].map(f)
    expect(contentSchema.safeParse(c).success).toBe(false)
  })
})
