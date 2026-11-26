import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseStore } from '../supabaseStore.ts'
import { InUseError } from '../store.ts'
import { ValidationError } from '../schema.ts'
import { buildDemoDataset } from '../../demo/dataset.ts'
import { toRow } from '../supabaseMap.ts'

/**
 * A tiny in-memory stand-in for the PostgREST query builder. It records every call so the tests can assert on
 * what the store sends (table names, snake_case payloads, the published-only filter) without a live Supabase project.
 */
function fakeClient(opts: { admin?: boolean; results?: Record<string, { data?: unknown; error?: unknown; count?: number }> } = {}) {
  const log: Array<{ table: string; op: string; args: unknown[] }> = []
  const results = opts.results ?? {}
  const builder = (table: string) => {
    const state = { op: 'select', filters: [] as string[] }
    const result = () => results[`${table}.${state.op}`] ?? results[table] ?? { data: [], error: null }
    const b: Record<string, unknown> = {}
    const chain = (op: string) => (...args: unknown[]) => {
      if (['select', 'insert', 'upsert', 'update', 'delete'].includes(op) && !(op === 'select' && state.op !== 'select')) state.op = op === 'select' ? state.op : op
      log.push({ table, op, args })
      return b
    }
    for (const op of ['select', 'insert', 'upsert', 'update', 'delete', 'eq', 'in', 'order', 'range']) b[op] = chain(op)
    b.single = () => Promise.resolve({ data: (result().data as unknown[] | undefined)?.[0] ?? result().data, error: result().error ?? null })
    b.maybeSingle = () => {
      const r = results[`${table}.maybeSingle`]
      if (r) return Promise.resolve({ data: r.data ?? null, error: r.error ?? null })
      return Promise.resolve({ data: table === 'admin_users' && opts.admin ? { user_id: 'u1' } : null, error: null })
    }
    // oxlint-disable-next-line unicorn/no-thenable -- PostgREST builders are awaitable; the fake mimics that
    b.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: result().data ?? [], error: result().error ?? null, count: result().count }).then(res)
    return b
  }
  const client = {
    from: (t: string) => builder(t),
    auth: {
      signInWithPassword: vi.fn(async () => ({ data: { user: { id: 'u1', email: 'a@b.c' } }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe() {} } } })),
    },
    storage: {
      from: () => ({
        getPublicUrl: (p: string) => ({ data: { publicUrl: `https://x.supabase.co/storage/${p}` } }),
        upload: async () => ({ error: null }),
        remove: async () => ({ error: null }),
      }),
    },
  }
  return { client: client as unknown as SupabaseClient, log, raw: client }
}

const demo = buildDemoDataset()

describe('Supabase store (fake client)', () => {
  it('public catalogue requests only published rows and maps snake_case → camelCase', async () => {
    const { client, log } = fakeClient({
      results: {
        manufacturers: { data: demo.manufacturers.slice(0, 2).map(toRow) },
        generators: { data: demo.generators.slice(0, 1).map(toRow) },
        part_compatibility: { data: [{ part_id: 'p', generator_id: 'g' }] },
      },
    })
    const store = await createSupabaseStore(client)
    const c = await store.getCatalogue()
    expect(c.manufacturers).toHaveLength(2)
    expect(c.generators[0].manufacturerId).toBe(demo.generators[0].manufacturerId)
    expect(c.generators[0].specGroups.length).toBeGreaterThan(0)
    expect(c.compat).toEqual([{ partId: 'p', generatorId: 'g' }])
    const statusFilters = log.filter((l) => l.op === 'eq' && l.args[0] === 'status')
    expect(statusFilters.length).toBe(4)
    expect(statusFilters.every((l) => l.args[1] === 'published')).toBe(true)
  })

  it('save validates before sending, upserts a snake_case row and maps unique violations to a slug error', async () => {
    const g = demo.generators[0]
    const bad = fakeClient()
    const s1 = await createSupabaseStore(bad.client)
    await expect(s1.save('generators', { ...g, slug: 'Bad Slug' })).rejects.toBeInstanceOf(ValidationError)
    expect(bad.log.filter((l) => l.op === 'upsert')).toHaveLength(0)

    const ok = fakeClient({ results: { 'generators.upsert': { data: [toRow(g)] } } })
    const s2 = await createSupabaseStore(ok.client)
    const saved = await s2.save('generators', g)
    const payload = ok.log.find((l) => l.op === 'upsert')!.args[0] as Record<string, unknown>
    expect(payload).toHaveProperty('manufacturer_id', g.manufacturerId)
    expect(payload).toHaveProperty('is_demo', true)
    expect(saved.model).toBe(g.model)

    const dup = fakeClient({ results: { 'generators.upsert': { data: null, error: { code: '23505', message: 'duplicate' } } } })
    const s3 = await createSupabaseStore(dup.client)
    await expect(s3.save('generators', g)).rejects.toMatchObject({ errors: { slug: expect.any(String) } })
  })

  it('maps foreign-key violations on delete to an InUseError with counts', async () => {
    const { client } = fakeClient({ results: { 'manufacturers.delete': { error: { code: '23503', message: 'fk' } }, generators: { data: [], count: 3 }, parts: { data: [], count: 1 } } })
    const store = await createSupabaseStore(client)
    await expect(store.remove('manufacturers', 'm1')).rejects.toBeInstanceOf(InUseError)
  })

  it('only accepts sign-in for users listed in admin_users', async () => {
    const stranger = fakeClient({ admin: false })
    const s1 = await createSupabaseStore(stranger.client)
    await expect(s1.auth.signIn('a@b.c', 'whatever-123')).rejects.toThrow(/administrator/)
    expect(stranger.raw.auth.signOut).toHaveBeenCalled()

    const admin = fakeClient({ admin: true })
    const s2 = await createSupabaseStore(admin.client)
    await expect(s2.auth.signIn('a@b.c', 'whatever-123')).resolves.toMatchObject({ email: 'a@b.c' })
  })

  it('production has no first-run setup (the first admin is created in Supabase)', async () => {
    const store = await createSupabaseStore(fakeClient().client)
    expect(await store.auth.needsSetup()).toBe(false)
    await expect(store.auth.setup('a@b.c', 'x')).rejects.toThrow(/Supabase/)
  })
})

describe('Supabase store parity with the demo store', () => {
  const methods = ['getCatalogue', 'getSettings', 'getContent', 'submitInquiry', 'list', 'save', 'remove', 'reorder', 'getCompat', 'setPartGenerators', 'setGeneratorParts', 'saveSettings', 'saveContent', 'uploadImage', 'replaceImage', 'deleteMedia', 'installDemo', 'removeDemo'] as const
  const authMethods = ['getSession', 'onChange', 'signIn', 'signOut', 'signOutOthers', 'changePassword', 'needsSetup', 'setup'] as const

  it('implements every admin operation the demo store offers', async () => {
    const { DemoStore } = await import('../demoStore.ts')
    const demo = new DemoStore({ persist: false })
    const supa = await createSupabaseStore(fakeClient().client)
    for (const m of methods) {
      expect(typeof (demo as unknown as Record<string, unknown>)[m], `demo.${m}`).toBe('function')
      expect(typeof (supa as unknown as Record<string, unknown>)[m], `supabase.${m}`).toBe('function')
    }
    for (const m of authMethods) {
      expect(typeof demo.auth[m], `demo.auth.${m}`).toBe('function')
      expect(typeof supa.auth[m], `supabase.auth.${m}`).toBe('function')
    }
  })

  it('maps FK / CHECK / permission errors from Postgres to meaningful messages', async () => {
    const g = demo.generators[0]
    for (const [code, expected] of [['23503', /mövcud deyil/], ['23514', /qaydası pozulub/], ['42501', /icazəniz yoxdur/]] as const) {
      const { client } = fakeClient({ results: { 'generators.upsert': { data: null, error: { code, message: 'x' } } } })
      const store = await createSupabaseStore(client)
      await expect(store.save('generators', g)).rejects.toThrow(expected)
    }
  })

  it('compat management adds missing links first and removes only the ones that are gone (no delete-everything window)', async () => {
    const { client, log } = fakeClient({ results: { 'part_compatibility.select': { data: [{ part_id: 'p1' }, { part_id: 'pOld' }] } } })
    const store = await createSupabaseStore(client)
    await store.setGeneratorParts('g1', ['p1', 'p2', 'p2'])
    const ops = log.filter((l) => l.table === 'part_compatibility').map((l) => l.op)
    expect(ops.indexOf('insert')).toBeGreaterThan(-1)
    expect(ops.indexOf('insert')).toBeLessThan(ops.indexOf('delete')) // insert BEFORE delete
    const ins = log.find((l) => l.table === 'part_compatibility' && l.op === 'insert')!
    expect(ins.args[0]).toEqual([{ generator_id: 'g1', part_id: 'p2' }]) // p1 already linked, p2 new
    expect(log.some((l) => l.op === 'in' && l.args[0] === 'part_id' && JSON.stringify(l.args[1]) === '["pOld"]')).toBe(true)
  })

  it('a failed insert leaves existing links untouched', async () => {
    const { client, log } = fakeClient({ results: { 'part_compatibility.select': { data: [{ part_id: 'p1' }] }, 'part_compatibility.insert': { error: { code: '23503', message: 'fk' } } } })
    const store = await createSupabaseStore(client)
    await expect(store.setGeneratorParts('g1', ['pGone'])).rejects.toBeTruthy()
    expect(log.some((l) => l.table === 'part_compatibility' && l.op === 'delete')).toBe(false)
  })
})

describe('Supabase store hardening (review findings)', () => {
  const g = demo.generators[0]

  it('rejects a save made on top of a stale copy (lost-update protection) and accepts the current version', async () => {
    const stale = { ...g, updatedAt: '2026-01-01T00:00:00.000000+00:00' }
    const c1 = fakeClient({ results: { 'generators.maybeSingle': { data: { updated_at: '2026-03-05T10:00:00.123456+00:00' } } } })
    await expect((await createSupabaseStore(c1.client)).save('generators', stale)).rejects.toMatchObject({ name: 'ConflictError' })
    expect(c1.log.some((l) => l.op === 'upsert')).toBe(false)

    // same instant written with different precision (PostgREST microseconds vs JS milliseconds) is NOT a conflict
    const current = { ...g, updatedAt: '2026-03-05T10:00:00.123Z' }
    const c2 = fakeClient({ results: { 'generators.maybeSingle': { data: { updated_at: '2026-03-05T10:00:00.123000+00:00' } }, 'generators.upsert': { data: [toRow(g)] } } })
    await expect((await createSupabaseStore(c2.client)).save('generators', current)).resolves.toBeTruthy()
  })

  it('a failed admin check (network / 5xx) does not sign the editor out; a real "not an admin" does', async () => {
    const listeners: Array<(e: string, s: unknown) => void> = []
    const mk = (adminResult: { data?: unknown; error?: unknown }) => {
      const f = fakeClient({ results: { 'admin_users.maybeSingle': adminResult } })
      ;(f.raw.auth as unknown as { onAuthStateChange: unknown }).onAuthStateChange = (cb: (e: string, s: unknown) => void) => {
        listeners.push(cb)
        return { data: { subscription: { unsubscribe() {} } } }
      }
      return f
    }
    for (const [res, expectCall] of [[{ error: { message: 'boom' } }, false], [{ data: null }, true]] as const) {
      const f = mk(res)
      const store = await createSupabaseStore(f.client)
      const seen: unknown[] = []
      store.auth.onChange((u) => seen.push(u))
      listeners.at(-1)!('TOKEN_REFRESHED', { user: { id: 'u1', email: 'a@b.c' } })
      await new Promise((r) => setTimeout(r, 20))
      expect(seen.length > 0).toBe(expectCall)
      if (expectCall) expect(seen[0]).toBeNull()
    }
  })

  it('logout is local-scope, so other devices/tabs keep their unsaved forms', async () => {
    const { client, raw } = fakeClient({ admin: true })
    await (await createSupabaseStore(client)).auth.signOut()
    expect(raw.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('pages with a stable secondary sort key (id), also for compatibility links', async () => {
    const { client, log } = fakeClient()
    await (await createSupabaseStore(client)).getCatalogue()
    for (const t of ['manufacturers', 'categories', 'generators', 'parts'])
      expect(log.some((l) => l.table === t && l.op === 'order' && l.args[0] === 'id')).toBe(true)
    expect(log.filter((l) => l.table === 'part_compatibility' && l.op === 'order').map((l) => l.args[0])).toEqual(expect.arrayContaining(['part_id', 'generator_id']))
  })

  it('inquiry insert uses trimmed values and caller input cannot override status / ids', async () => {
    const { client, log } = fakeClient()
    await (await createSupabaseStore(client)).submitInquiry({
      name: '  Əli Vəliyev ', phone: ' +994501234567\t', product: '', message: ' salam ', locale: 'az', status: 'done', isDemo: true, id: 'x',
    } as never)
    const row = log.find((l) => l.table === 'inquiries' && l.op === 'insert')!.args[0] as Record<string, unknown>
    expect(row).toMatchObject({ name: 'Əli Vəliyev', phone: '+994501234567', message: 'salam', status: 'new', is_demo: false })
    expect(row.id).not.toBe('x')
  })

  it('replacing a media row whose image was not in storage repoints the products that use it', async () => {
    // media row still pointing at bundled demo artwork
    const m = demo.media[0]
    const g0 = { ...demo.generators[0], images: [{ ...demo.generators[0].images[0], mediaId: m.id }] }
    const { client, log } = fakeClient({
      results: {
        'media.select': { data: [toRow({ ...m, url: '/demo/x.svg' })] },
        'media.upsert': { data: [toRow({ ...m })] },
        generators: { data: [toRow(g0)] },
        'generators.upsert': { data: [toRow(g0)] },
      },
    })
    const store = await createSupabaseStore(client)
    vi.spyOn(await import('../../lib/image.ts'), 'processImage').mockResolvedValue({ full: new Blob(['f']), thumb: new Blob(['t']), width: 800, height: 600 })
    await store.replaceImage(m.id, new File(['x'], 'n.png', { type: 'image/png' }))
    // the generator that referenced the media id was re-saved with the storage URL
    const resaved = log.filter((l) => l.table === 'generators' && l.op === 'upsert').map((l) => l.args[0] as Record<string, unknown>)
    expect(resaved.length).toBeGreaterThan(0)
    expect(JSON.stringify(resaved[0].images)).toContain('storage/')
  })
})
