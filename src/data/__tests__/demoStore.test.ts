import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError, DemoStore, StorageError } from '../demoStore.ts'
import { ConflictError, InUseError } from '../store.ts'
import { ValidationError } from '../schema.ts'
import { newId } from '../../lib/ids.ts'
import type { Generator, Manufacturer, Part } from '../types.ts'

let n = 0
const fresh = async (opts: { autoSeed?: boolean } = {}) => {
  sessionStorage.clear()
  const s = new DemoStore({ dbName: `test-${++n}-${Math.random()}`, ...opts })
  return s
}
const signedIn = async (opts?: { autoSeed?: boolean }) => {
  const s = await fresh(opts)
  await s.auth.setup('admin@example.com', 'Correct-horse-9')
  return s
}
const now = () => new Date().toISOString()
const mfr = (over: Partial<Manufacturer> = {}): Manufacturer => ({
  id: newId(), createdAt: now(), updatedAt: now(), isDemo: false, slug: 'acme', name: 'Acme', description: { az: 'x' }, seo: {}, status: 'published', sortOrder: 99, ...over,
})
const gen = (over: Partial<Generator> = {}): Generator => ({
  id: newId(), createdAt: now(), updatedAt: now(), isDemo: false, slug: 'acme-1', manufacturerId: null, categoryId: null, model: 'A1', title: {}, shortDescription: {}, description: {}, advantages: [], applications: [], images: [],
  price: { type: 'request' }, availability: 'in_stock', featured: false, status: 'draft', kvaPrime: 50, kvaStandby: null, generatorType: 'canopy', fuelType: 'diesel', phase: 3, coolingSystem: 'water', specGroups: [], seo: {}, ...over,
})
const part = (over: Partial<Part> = {}): Part => ({
  id: newId(), createdAt: now(), updatedAt: now(), isDemo: false, slug: 'acme-part', name: { az: 'Hissə' }, oemCode: 'X-1', manufacturerId: null, categoryId: null, description: {}, images: [], price: { type: 'request' }, availability: 'in_stock', featured: false, status: 'draft', specGroups: [], seo: {}, ...over,
})

describe('demo store: seeding', () => {
  it('auto-seeds the demo catalogue on first load and the public catalogue only shows published records', async () => {
    const s = await fresh()
    const c = await s.getCatalogue()
    expect(c.manufacturers.length).toBeGreaterThanOrEqual(5)
    expect(c.generators.length).toBeGreaterThanOrEqual(15)
    expect(c.parts.length).toBeGreaterThanOrEqual(20)
    expect(c.generators.every((g) => g.status === 'published')).toBe(true)
    expect(c.compat.length).toBeGreaterThan(20)
  })
  it('hides drafts from anonymous visitors even when asked, shows them to a signed-in admin', async () => {
    const s = await signedIn()
    const anon = await s.getCatalogue({ includeDrafts: true })
    await s.auth.signOut()
    const pub = await s.getCatalogue({ includeDrafts: true })
    expect(anon.generators.length).toBeGreaterThan(pub.generators.length)
    expect(pub.generators.every((g) => g.status === 'published')).toBe(true)
  })
})

describe('demo store: authentication', () => {
  let s: DemoStore
  beforeEach(async () => {
    s = await fresh()
  })
  it('has no default credentials: the first visit must create the admin', async () => {
    expect(await s.auth.needsSetup()).toBe(true)
    await expect(s.auth.signIn('admin@example.com', 'anything12345')).rejects.toBeInstanceOf(AuthError)
    await expect(s.list('manufacturers')).rejects.toBeInstanceOf(AuthError)
  })
  it('enforces password strength, then signs in / out and stores only a hash', async () => {
    await expect(s.auth.setup('admin@example.com', 'short1')).rejects.toBeInstanceOf(AuthError)
    await expect(s.auth.setup('admin@example.com', 'onlyletterspassword')).rejects.toBeInstanceOf(AuthError)
    await s.auth.setup('admin@example.com', 'Correct-horse-9')
    expect(await s.auth.needsSetup()).toBe(false)
    expect((await s.auth.getSession())?.email).toBe('admin@example.com')
    const snap = await s.snapshot()
    expect(JSON.stringify(snap.auth)).not.toContain('Correct-horse-9')
    await s.auth.signOut()
    expect(await s.auth.getSession()).toBeNull()
    await expect(s.auth.signIn('admin@example.com', 'wrong-password-1')).rejects.toBeInstanceOf(AuthError)
    expect((await s.auth.signIn('ADMIN@example.com', 'Correct-horse-9')).email).toBe('admin@example.com')
  })
  it('protects every admin operation when signed out', async () => {
    await s.auth.setup('admin@example.com', 'Correct-horse-9')
    await s.auth.signOut()
    await expect(s.save('manufacturers', mfr())).rejects.toBeInstanceOf(AuthError)
    await expect(s.remove('manufacturers', 'x')).rejects.toBeInstanceOf(AuthError)
    await expect(s.uploadImage(new File(['x'], 'a.png', { type: 'image/png' }))).rejects.toBeInstanceOf(AuthError)
    await expect(s.removeDemo()).rejects.toBeInstanceOf(AuthError)
  })
  it('changes the password only with the correct current one', async () => {
    await s.auth.setup('admin@example.com', 'Correct-horse-9')
    await expect(s.auth.changePassword('Another-pass-77', 'nope')).rejects.toBeInstanceOf(AuthError)
    await s.auth.changePassword('Another-pass-77', 'Correct-horse-9')
    await s.auth.signOut()
    await expect(s.auth.signIn('admin@example.com', 'Correct-horse-9')).rejects.toBeInstanceOf(AuthError)
    await s.auth.signIn('admin@example.com', 'Another-pass-77')
  })
})

describe('demo store: CRUD & relationships', () => {
  it('persists records across store instances (IndexedDB)', async () => {
    const dbName = `persist-${Math.random()}`
    sessionStorage.clear()
    const a = new DemoStore({ dbName })
    await a.auth.setup('admin@example.com', 'Correct-horse-9')
    const m = await a.save('manufacturers', mfr({ slug: 'persisted', name: 'Persisted' }))
    const b = new DemoStore({ dbName })
    expect((await b.list('manufacturers')).some((x) => x.id === m.id)).toBe(true)
    expect(await b.auth.needsSetup()).toBe(false)
  })
  it('validates, rejects duplicate slugs and stamps updatedAt', async () => {
    const s = await signedIn()
    await expect(s.save('manufacturers', mfr({ slug: 'Bad Slug' }))).rejects.toBeInstanceOf(ValidationError)
    const a = await s.save('manufacturers', mfr({ slug: 'dup' }))
    await expect(s.save('manufacturers', mfr({ slug: 'dup' }))).rejects.toMatchObject({ errors: { slug: expect.any(String) } })
    const before = a.updatedAt
    await new Promise((r) => setTimeout(r, 5))
    const b = await s.save('manufacturers', { ...a, name: 'Renamed' })
    expect(b.updatedAt > before).toBe(true)
  })
  it('blocks deleting a manufacturer that generators still use, allows it once free', async () => {
    const s = await signedIn()
    const m = await s.save('manufacturers', mfr({ slug: 'used' }))
    const g = await s.save('generators', gen({ manufacturerId: m.id, status: 'published' }))
    await expect(s.remove('manufacturers', m.id)).rejects.toBeInstanceOf(InUseError)
    await s.remove('generators', g.id)
    await s.remove('manufacturers', m.id)
    expect((await s.list('manufacturers')).some((x) => x.id === m.id)).toBe(false)
  })
  it('rejects references to missing manufacturers or wrong-kind categories (like the SQL foreign keys)', async () => {
    const s = await signedIn()
    await expect(s.save('generators', gen({ manufacturerId: newId() }))).rejects.toMatchObject({ errors: { manufacturerId: expect.any(String) } })
    const partCat = (await s.list('categories')).find((c) => c.kind === 'part')!
    await expect(s.save('generators', gen({ categoryId: partCat.id }))).rejects.toMatchObject({ errors: { categoryId: expect.any(String) } })
    await expect(s.save('parts', part({ categoryId: partCat.id }))).resolves.toBeTruthy()
  })
  it('manages compatibility in both directions and cleans links on delete', async () => {
    const s = await signedIn({ autoSeed: false })
    const g1 = await s.save('generators', gen({ slug: 'g-1' }))
    const g2 = await s.save('generators', gen({ slug: 'g-2' }))
    const p1 = await s.save('parts', part({ slug: 'p-1' }))
    const p2 = await s.save('parts', part({ slug: 'p-2' }))
    await s.setPartGenerators(p1.id, [g1.id, g2.id, g2.id])
    await s.setGeneratorParts(g1.id, [p1.id, p2.id])
    const pairs = (await s.getCompat()).map((c) => `${c.partId}>${c.generatorId}`).sort()
    expect(pairs).toEqual([`${p1.id}>${g1.id}`, `${p1.id}>${g2.id}`, `${p2.id}>${g1.id}`].sort())
    await s.setPartGenerators(p1.id, [g2.id])
    expect((await s.getCompat()).filter((c) => c.partId === p1.id).map((c) => c.generatorId)).toEqual([g2.id])
    await s.remove('generators', g1.id)
    expect((await s.getCompat()).every((c) => c.generatorId !== g1.id)).toBe(true)
    await s.remove('parts', p1.id)
    expect((await s.getCompat()).every((c) => c.partId !== p1.id)).toBe(true)
  })
  it('keeps dynamic technical specifications and their order', async () => {
    const s = await signedIn({ autoSeed: false })
    const specGroups = [
      { id: 'g1', title: { az: 'Güc' }, items: [{ id: 'i1', label: { az: 'Əsas güc' }, value: { az: '50' }, unit: 'kVA' }, { id: 'i2', label: { az: 'Boş' }, value: {} }] },
      { id: 'g2', title: { az: 'Mühərrik' }, items: [] },
    ]
    const saved = await s.save('generators', gen({ specGroups }))
    const back = (await s.list('generators')).find((x) => x.id === saved.id)!
    expect(back.specGroups.map((g) => g.id)).toEqual(['g1', 'g2'])
    expect(back.specGroups[0].items[0].unit).toBe('kVA')
  })
  it('reorders manufacturers', async () => {
    const s = await signedIn()
    const ids = (await s.getCatalogue()).manufacturers.map((m) => m.id).reverse()
    await s.reorder('manufacturers', ids)
    expect((await s.getCatalogue()).manufacturers.map((m) => m.id)).toEqual(ids)
  })
  it('stores a general inquiry from an anonymous visitor and validates it', async () => {
    const s = await fresh()
    await expect(s.submitInquiry({ name: 'A', phone: 'x', product: '', message: '', locale: 'az' })).rejects.toBeInstanceOf(ValidationError)
    await s.submitInquiry({ name: 'Əli Vəliyev', phone: '+994501234567', product: 'Perkins', message: 'Salam', locale: 'az' })
    await s.auth.setup('admin@example.com', 'Correct-horse-9')
    const list = await s.list('inquiries')
    expect(list).toHaveLength(1)
    expect(list[0].status).toBe('new')
  })
})

describe('demo store: demo data lifecycle', () => {
  it('removing demo data never deletes genuine records and detaches references', async () => {
    const s = await signedIn()
    const demo = await s.getCatalogue({ includeDrafts: true })
    const demoMfr = demo.manufacturers[0]
    const demoGen = demo.generators[0]
    // genuine records referencing demo ones
    const realMfr = await s.save('manufacturers', mfr({ slug: 'real-mfr', name: 'Real' }))
    const realGen = await s.save('generators', gen({ slug: 'real-gen', manufacturerId: demoMfr.id, status: 'published' }))
    const realPart = await s.save('parts', part({ slug: 'real-part' }))
    await s.setPartGenerators(realPart.id, [demoGen.id, realGen.id])

    const report = await s.removeDemo()
    expect(report.removed).toBeGreaterThan(40)
    expect(report.detached).toBeGreaterThanOrEqual(2)

    const after = await s.snapshot()
    expect(after.manufacturers.map((m) => m.id)).toEqual([realMfr.id])
    expect(after.generators.map((g) => g.id)).toEqual([realGen.id])
    expect(after.parts.map((p) => p.id)).toEqual([realPart.id])
    expect(after.generators[0].manufacturerId).toBeNull()
    expect(after.generators[0].status).toBe('draft') // cannot stay published without a manufacturer
    expect(after.compat).toEqual([{ partId: realPart.id, generatorId: realGen.id }])
    expect(after.flags.demoRemoved).toBe(true)
  })
  it('only removes records that carry the flag AND a dataset id: a hand-flagged genuine record is kept and reported', async () => {
    const s = await signedIn()
    const flagged = await s.save('manufacturers', mfr({ slug: 'flagged', name: 'Flagged by hand', isDemo: true }))
    const report = await s.removeDemo()
    expect(report.skipped).toBe(1)
    expect((await s.snapshot()).manufacturers.map((m) => m.id)).toEqual([flagged.id])
  })
  it('a dataset-id record that is not flagged is genuine: removal keeps it and install refuses to overwrite it', async () => {
    const s = await signedIn()
    const adopted = (await s.getCatalogue({ includeDrafts: true })).manufacturers[0]
    await s.save('manufacturers', { ...adopted, name: 'Adopted real company', isDemo: false })
    await expect(s.installDemo()).rejects.toThrow(/real qeyd var/)
    await s.removeDemo()
    expect((await s.snapshot()).manufacturers.map((m) => m.name)).toEqual(['Adopted real company'])
  })
  it('does not re-seed after removal on reload, but can be installed again, idempotently', async () => {
    const dbName = `lifecycle-${Math.random()}`
    sessionStorage.clear()
    const a = new DemoStore({ dbName })
    await a.auth.setup('admin@example.com', 'Correct-horse-9')
    await a.removeDemo()
    const b = new DemoStore({ dbName })
    expect((await b.snapshot()).generators).toHaveLength(0)
    const first = await b.installDemo()
    expect(first.added).toBeGreaterThan(40)
    const second = await b.installDemo()
    expect(second.added).toBe(0) // upsert by deterministic ids
    expect((await b.snapshot()).generators.length).toBeGreaterThanOrEqual(15)
  })
})

describe('demo store: persistence guarantees', () => {
  it('two tabs writing to the same database never overwrite each other (atomic read-modify-write)', async () => {
    const dbName = `tabs-${Math.random()}`
    sessionStorage.clear()
    const a = new DemoStore({ dbName })
    await a.auth.setup('admin@example.com', 'Correct-horse-9')
    const b = new DemoStore({ dbName }) // "second tab": its own in-memory cache
    await b.getCatalogue() // b loads before a writes
    await a.save('manufacturers', mfr({ slug: 'from-tab-a', name: 'A' }))
    // b still holds a stale cache; its write must be applied on top of a's, not replace it
    await b.auth.signIn('admin@example.com', 'Correct-horse-9')
    await b.save('manufacturers', mfr({ slug: 'from-tab-b', name: 'B' }))
    const fresh = new DemoStore({ dbName })
    const slugs = (await fresh.snapshot()).manufacturers.map((m) => m.slug)
    expect(slugs).toEqual(expect.arrayContaining(['from-tab-a', 'from-tab-b']))
    expect(slugs.length).toBe(7) // 5 demo + 2 real
  })

  it('concurrent first loads seed exactly once', async () => {
    const dbName = `seed-${Math.random()}`
    const [x, y] = [new DemoStore({ dbName }), new DemoStore({ dbName })]
    const [cx, cy] = await Promise.all([x.snapshot(), y.snapshot()])
    expect(cx.manufacturers).toHaveLength(5)
    expect(cy.manufacturers).toHaveLength(5)
    expect((await new DemoStore({ dbName }).snapshot()).generators).toHaveLength(17)
  })

  it('a failed validation writes nothing, and a storage failure is reported instead of silently losing data', async () => {
    const dbName = `fail-${Math.random()}`
    sessionStorage.clear()
    const s = new DemoStore({ dbName })
    await s.auth.setup('admin@example.com', 'Correct-horse-9')
    const before = (await s.snapshot()).manufacturers.length
    await expect(s.save('manufacturers', mfr({ slug: 'Bad Slug' }))).rejects.toBeInstanceOf(ValidationError)
    expect((await new DemoStore({ dbName }).snapshot()).manufacturers).toHaveLength(before)

    const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    await expect(s.save('manufacturers', mfr({ slug: 'too-big' }))).rejects.toBeInstanceOf(StorageError)
    spy.mockRestore()
    // nothing half-saved; the store recovers and works again
    expect((await s.snapshot()).manufacturers.some((m) => m.slug === 'too-big')).toBe(false)
    await s.save('manufacturers', mfr({ slug: 'after-recovery' }))
    expect((await new DemoStore({ dbName }).snapshot()).manufacturers.some((m) => m.slug === 'after-recovery')).toBe(true)
  })

  it('reports memory-only persistence when IndexedDB is unavailable', async () => {
    const spy = vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    const s = new DemoStore({ dbName: `blocked-${Math.random()}` })
    expect((await s.getCatalogue()).generators.length).toBeGreaterThan(10) // still usable
    expect(s.persistence).toBe('memory')
    spy.mockRestore()
  })

  it('another tab\'s change invalidates the cache and notifies listeners', async () => {
    const dbName = `bc-${Math.random()}`
    sessionStorage.clear()
    const a = new DemoStore({ dbName })
    const b = new DemoStore({ dbName })
    await b.getCatalogue()
    const seen = new Promise<void>((r) => b.onExternalChange(() => r()))
    await a.auth.setup('admin@example.com', 'Correct-horse-9')
    await a.save('manufacturers', mfr({ slug: 'bc-test' }))
    await seen
    expect((await b.getCatalogue()).manufacturers.some((m) => m.slug === 'bc-test')).toBe(true)
  })
})

describe('demo store: concurrency & integrity (review findings)', () => {
  it('refuses to save on top of a stale copy and lets the editor re-load and retry', async () => {
    const s = await signedIn({ autoSeed: false })
    const a = await s.save('manufacturers', mfr({ slug: 'conc' }))
    await new Promise((r) => setTimeout(r, 4))
    await s.save('manufacturers', { ...a, name: 'Edited elsewhere' }) // "another tab"
    await expect(s.save('manufacturers', { ...a, name: 'Stale edit' })).rejects.toBeInstanceOf(ConflictError)
    expect((await s.list('manufacturers')).find((m) => m.id === a.id)!.name).toBe('Edited elsewhere')
    const fresh = (await s.list('manufacturers')).find((m) => m.id === a.id)!
    await expect(s.save('manufacturers', { ...fresh, name: 'Retry ok' })).resolves.toBeTruthy()
  })

  it('does not create compatibility links to records that no longer exist', async () => {
    const s = await signedIn({ autoSeed: false })
    const g = await s.save('generators', gen({ slug: 'cg' }))
    const p = await s.save('parts', part({ slug: 'cp' }))
    await expect(s.setGeneratorParts(g.id, [p.id, newId()])).rejects.toBeInstanceOf(ConflictError)
    await expect(s.setPartGenerators(newId(), [g.id])).rejects.toBeInstanceOf(ConflictError)
    expect(await s.getCompat()).toEqual([])
  })

  it('two concurrent first-run setups cannot overwrite each other\'s admin', async () => {
    const dbName = `setup-race-${Math.random()}`
    sessionStorage.clear()
    const a = new DemoStore({ dbName })
    const b = new DemoStore({ dbName })
    await Promise.all([a.snapshot(), b.snapshot()])
    const results = await Promise.allSettled([a.auth.setup('a@example.com', 'Correct-horse-9'), b.auth.setup('b@example.com', 'Correct-horse-9')])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)
  })

  it('public inquiries cannot override server-set fields', async () => {
    const s = await fresh()
    await s.submitInquiry({ name: ' Əli Vəliyev ', phone: '+994501234567', product: '', message: '', locale: 'az', status: 'done', isDemo: true } as never)
    await s.auth.setup('admin@example.com', 'Correct-horse-9')
    const [q] = await s.list('inquiries')
    expect(q).toMatchObject({ name: 'Əli Vəliyev', status: 'new', isDemo: false })
  })
})
