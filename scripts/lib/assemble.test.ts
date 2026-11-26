import { describe, expect, it } from 'vitest'
import { assemblePage } from './assemble.ts'
import { assertPublicKeyOnly } from './keyGuard.ts'

const shell = '<!doctype html><html lang="az"><head><title>x</title><meta name="description" content="d"></head><body><div id="root"></div></body></html>'
const head = { title: 'T', locale: 'ru', canonicalPath: '/a' } as never

describe('prerender page assembly', () => {
  it('keeps text containing replacement patterns ($&, $\', $$, $`) byte-for-byte', () => {
    const nasty = "<p>10$$ off $& and $' and $` end</p>"
    const out = assemblePage(shell, '/a', nasty, head, () => '<title>T $& $$</title>')
    expect(out).toContain(`<div id="root">${nasty}</div>`)
    expect(out).toContain('<title>T $& $$</title>')
    expect(out).toContain('<html lang="ru"')
    expect(out).toContain('name="zm-prerender" content="/a"')
    expect(out.match(/<\/html>/g)).toHaveLength(1) // nothing from the document got spliced into the markup
  })
})

describe('public Supabase key guard', () => {
  const jwt = (role: string) => `h.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.s`
  it('accepts anon / publishable keys and refuses service-role / secret keys', () => {
    expect(() => assertPublicKeyOnly({})).not.toThrow()
    expect(() => assertPublicKeyOnly({ VITE_SUPABASE_ANON_KEY: jwt('anon') })).not.toThrow()
    expect(() => assertPublicKeyOnly({ VITE_SUPABASE_ANON_KEY: 'sb_publishable_abc' })).not.toThrow()
    expect(() => assertPublicKeyOnly({ VITE_SUPABASE_ANON_KEY: jwt('service_role') })).toThrow(/SERVICE-ROLE/)
    expect(() => assertPublicKeyOnly({ VITE_SUPABASE_ANON_KEY: 'sb_secret_abc' })).toThrow(/secret/)
  })
})
