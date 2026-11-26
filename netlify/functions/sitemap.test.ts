import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from './sitemap.ts'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('sitemap function', () => {
  it('serves the static pages (with hreflang) when Supabase is not configured', async () => {
    vi.stubEnv('SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_URL', '')
    const res = await handler()
    expect(res.headers.get('content-type')).toContain('application/xml')
    const xml = await res.text()
    expect(xml).toContain('<loc>https://zamanlimakina.az/generatorlar</loc>')
    expect(xml).toContain('hreflang="ru"')
    expect(xml).not.toContain('/generatorlar/')
  })

  it('lists only published, non-demo rows returned by the REST API, honouring translations', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://abc.supabase.co')
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon')
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url)
        const u = new URL(url)
        const table = u.pathname.split('/').pop()
        const rows: Record<string, unknown[]> = {
          manufacturers: [{ slug: 'perkins', updated_at: '2026-03-01T00:00:00Z', description: { az: 'a', en: 'b' } }],
          categories: [{ id: 'c1', slug: 'used-cat', name: { az: 'Kat' } }, { id: 'c2', slug: 'empty-cat', name: { az: 'Boş' } }],
          generators: [{ slug: 'real-gen', updated_at: '2026-03-02T00:00:00Z', description: { az: 'x', ru: 'y' }, short_description: {}, category_id: 'c1' }],
          parts: [{ slug: 'real-part', updated_at: '2026-03-03T00:00:00Z', name: { az: 'Hissə' } }],
          site_settings: [{ value: { languages: { enabled: ['az', 'ru'] } } }],
        }
        return new Response(JSON.stringify(rows[table!] ?? []), { status: 200 })
      }),
    )
    const xml = await (await handler()).text()
    // every request filters to published, non-demo rows and uses the public key
    for (const c of calls.filter((x) => !x.includes('site_settings'))) {
      expect(c).toContain('status=eq.published')
      expect(c).toContain('is_demo=eq.false')
    }
    expect(xml).toContain('https://zamanlimakina.az/generatorlar/real-gen')
    expect(xml).toContain('https://zamanlimakina.az/ru/generatory/real-gen')
    expect(xml).not.toContain('/en/') // English disabled in settings
    expect(xml).toContain('https://zamanlimakina.az/ehtiyat-hisseleri/real-part')
    expect(xml).not.toContain('/ru/zapchasti/real-part') // part has no Russian name
    expect(xml).toContain('https://zamanlimakina.az/brendler/perkins')
    expect(xml).toContain('/generatorlar/kateqoriya/used-cat')
    expect(xml).not.toContain('empty-cat') // categories without published generators are not listed
  })

  it('falls back to static pages when Supabase errors', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://abc.supabase.co')
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const xml = await (await handler()).text()
    expect(xml).toContain('<loc>https://zamanlimakina.az/</loc>')
  })
})
