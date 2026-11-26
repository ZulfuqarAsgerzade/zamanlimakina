import { buildDemoDataset, demoIdSets } from '../demo/dataset.ts'
import { newId } from '../lib/ids.ts'
import { blobToDataUrl, processImage } from '../lib/image.ts'
import { defaultContent, defaultSettings } from './defaults.ts'
import { demoToolsPolicy } from './demoPolicy.ts'
import type { DemoToolsPolicy } from './demoPolicy.ts'
import { ConflictError, InUseError } from './store.ts'
import type { AuthApi, AuthUser, DemoReport, InquiryInput, Store } from './store.ts'
import { ValidationError, contentSchema, settingsSchema, validateEntity } from './schema.ts'
import type {
  Catalogue,
  Compat,
  EntityMap,
  EntityName,
  Generator,
  ImageRef,
  Inquiry,
  MediaItem,
  Part,
  Settings,
  SiteContent,
} from './types.ts'

/**
 * Local demo store. Everything lives in this browser's IndexedDB, so:
 *   • it is NOT shared between visitors, devices or browsers,
 *   • it is NOT a production database,
 *   • "authentication" below only gates the admin UI — it is not a security boundary.
 * It exists so the whole site (catalogue + admin CRUD) can be reviewed without any backend.
 * Production uses SupabaseStore (real Auth, Postgres, row-level security, Storage).
 */

interface AuthRecord {
  email: string
  salt: string
  hash: string
  iterations: number
}

export interface DemoDb {
  version: 1
  manufacturers: EntityMap['manufacturers'][]
  categories: EntityMap['categories'][]
  generators: Generator[]
  parts: Part[]
  media: MediaItem[]
  inquiries: Inquiry[]
  compat: Compat[]
  settings: Settings
  content: SiteContent
  flags: { demoSeeded: boolean; demoRemoved: boolean }
  auth: AuthRecord | null
}

const IDB_NAME = 'zm-demo-store'
const IDB_STORE = 'kv'
const IDB_KEY = 'db'
const SESSION_KEY = 'zm-demo-session'
const PBKDF2_ITERATIONS = 150_000

/* ───────────────────────── persistence ───────────────────────── */

function openIdb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Atomic read-modify-write in ONE IndexedDB transaction. Transactions on the same store are serialized by the browser, so
 * two tabs writing at the same time cannot overwrite each other's changes (no lost updates). If `fn` throws, the
 * transaction is aborted and nothing is written.
 */
async function idbUpdate(name: string, fn: (stored: DemoDb | undefined) => DemoDb): Promise<DemoDb> {
  const db = await openIdb(name)
  try {
    return await new Promise<DemoDb>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      const store = tx.objectStore(IDB_STORE)
      let result: DemoDb
      const get = store.get(IDB_KEY)
      get.onsuccess = () => {
        try {
          result = fn(get.result as DemoDb | undefined)
          store.put(result, IDB_KEY)
        } catch (e) {
          reject(e)
          tx.abort()
        }
      }
      tx.oncomplete = () => resolve(result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error ?? new DOMException('Transaction aborted', 'AbortError'))
    })
  } finally {
    db.close()
  }
}

/** Browser storage refused the write (quota exceeded, blocked, private mode…). The change was NOT saved. */
export class StorageError extends Error {}

/* ───────────────────────── password hashing (demo) ───────────────────────── */

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function hashPassword(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    256,
  )
  return b64(bits)
}

export class AuthError extends Error {}

export function validatePassword(password: string): void {
  if (password.length < 10) throw new AuthError('Parol ən azı 10 simvol olmalıdır.')
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new AuthError('Parol həm hərf, həm rəqəm içərməlidir.')
}

/* ───────────────────────── the store ───────────────────────── */

const nowIso = () => new Date().toISOString()

function emptyDb(): DemoDb {
  return {
    version: 1,
    manufacturers: [],
    categories: [],
    generators: [],
    parts: [],
    media: [],
    inquiries: [],
    compat: [],
    settings: defaultSettings(),
    content: defaultContent(),
    flags: { demoSeeded: false, demoRemoved: false },
    auth: null,
  }
}

type ListKey = 'manufacturers' | 'categories' | 'generators' | 'parts' | 'media' | 'inquiries'

export class DemoStore implements Store {
  readonly mode = 'demo' as const
  readonly demoTools: DemoToolsPolicy = demoToolsPolicy('demo')
  readonly auth: AuthApi
  private db: DemoDb | null = null
  private loading: Promise<DemoDb> | null = null
  private channel: BroadcastChannel | null = null
  private externalListeners = new Set<() => void>()
  /** 'indexeddb' = survives refresh/restart in this browser; 'memory' = lost on reload (private mode / blocked storage / tests). */
  persistence: 'indexeddb' | 'memory' = 'indexeddb'
  private listeners = new Set<(u: AuthUser | null) => void>()
  private persist: boolean

  private opts: { dbName?: string; persist?: boolean; autoSeed?: boolean }

  constructor(opts: { dbName?: string; persist?: boolean; autoSeed?: boolean } = {}) {
    this.opts = opts
    this.persist = opts.persist ?? true
    if (!this.persist) this.persistence = 'memory'
    this.auth = this.makeAuth()
    if (this.persist && typeof BroadcastChannel !== 'undefined') {
      // another tab changed the data → drop our cache so the next read is fresh
      this.channel = new BroadcastChannel(`zm-demo:${this.dbName()}`)
      this.channel.onmessage = () => {
        this.db = null
        this.loading = null
        this.externalListeners.forEach((cb) => cb())
      }
    }
  }

  /** Called when ANOTHER tab of this browser changed the demo data. */
  onExternalChange(cb: () => void): () => void {
    this.externalListeners.add(cb)
    return () => this.externalListeners.delete(cb)
  }

  /** Test helper / escape hatch. */
  async snapshot(): Promise<DemoDb> {
    return structuredClone(await this.load())
  }

  private dbName() {
    return this.opts.dbName ?? IDB_NAME
  }

  private normalize(stored: DemoDb | undefined | null): DemoDb {
    const db = stored && stored.version === 1 ? stored : emptyDb()
    // forward-compat: fill keys added in later versions
    db.settings = { ...defaultSettings(), ...db.settings }
    db.content = { ...defaultContent(), ...db.content }
    return db
  }

  private seedIfNeeded(db: DemoDb): void {
    if ((this.opts.autoSeed ?? true) && !db.flags.demoSeeded && !db.flags.demoRemoved) {
      this.applyDemo(db)
      db.flags.demoSeeded = true
    }
  }

  private load(): Promise<DemoDb> {
    if (this.db) return Promise.resolve(this.db)
    if (!this.loading) {
      this.loading = (async () => {
        let db: DemoDb
        if (this.persist) {
          try {
            // first-run seeding happens inside the same atomic transaction, so two tabs opening at once cannot double-seed
            db = await idbUpdate(this.dbName(), (stored) => {
              const d = this.normalize(stored)
              this.seedIfNeeded(d)
              return d
            })
            this.persistence = 'indexeddb'
            void navigator.storage?.persist?.().catch(() => undefined) // ask the browser not to evict our data
          } catch {
            // IndexedDB unavailable (private mode, blocked): keep working in memory and say so
            this.persistence = 'memory'
            db = this.normalize(null)
            this.seedIfNeeded(db)
          }
        } else {
          db = this.normalize(null)
          this.seedIfNeeded(db)
        }
        this.db = db
        return db
      })()
    }
    return this.loading
  }

  /**
   * Run a mutation and persist it atomically (read latest → apply → write in one transaction).
   * Domain errors (validation, in-use, auth) propagate untouched and nothing is written; if the browser refuses the write
   * the change is discarded and a StorageError is thrown — the UI must never show "saved" for data that was not stored.
   */
  private async mutate<T>(fn: (db: DemoDb) => T): Promise<T> {
    await this.load()
    if (!this.persist || this.persistence === 'memory') return fn(this.db!)
    let out!: T
    try {
      this.db = await idbUpdate(this.dbName(), (stored) => {
        const d = this.normalize(stored)
        out = fn(d)
        return d
      })
    } catch (e) {
      this.db = null
      this.loading = null // re-read the truth from storage next time
      if (e instanceof DOMException) {
        throw new StorageError(
          e.name === 'QuotaExceededError'
            ? 'Brauzerin yaddaş limiti dolub — dəyişiklik saxlanılmadı. Şəkilləri silin və ya demo məlumatı təmizləyin.'
            : 'Brauzer yaddaşı dəyişikliyi qəbul etmədi — dəyişiklik saxlanılmadı.',
        )
      }
      throw e
    }
    this.channel?.postMessage('changed')
    return out
  }

  private requireAuth(): void {
    if (!this.sessionUser()) throw new AuthError('Bu əməliyyat üçün daxil olmalısınız.')
  }

  /* ───────── auth ───────── */

  private sessionUser(): AuthUser | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch {
      return null
    }
  }
  private setSession(u: AuthUser | null) {
    try {
      if (u) sessionStorage.setItem(SESSION_KEY, JSON.stringify(u))
      else sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
    this.listeners.forEach((l) => l(u))
  }

  private makeAuth(): AuthApi {
    return {
      getSession: async () => {
        await this.load()
        return this.sessionUser()
      },
      onChange: (cb) => {
        this.listeners.add(cb)
        return () => this.listeners.delete(cb)
      },
      needsSetup: async () => {
        return !(await this.load()).auth
      },
      setup: async (email, password) => {
        const db = await this.load()
        if (db.auth) throw new AuthError('Demo administrator artıq yaradılıb.')
        if (!/^\S+@\S+\.\S+$/.test(email)) throw new AuthError('Düzgün e-poçt daxil edin.')
        validatePassword(password)
        const salt = crypto.getRandomValues(new Uint8Array(16))
        const hash = await hashPassword(password, salt, PBKDF2_ITERATIONS)
        await this.mutate((d) => {
          // re-check inside the atomic transaction: two tabs calling setup() at once must not overwrite each other's admin
          if (d.auth) throw new AuthError('Demo administrator artıq yaradılıb.')
          d.auth = { email: email.trim().toLowerCase(), salt: b64(salt), hash, iterations: PBKDF2_ITERATIONS }
        })
        const user = { id: 'demo-admin', email: email.trim().toLowerCase() }
        this.setSession(user)
        return user
      },
      signIn: async (email, password) => {
        const db = await this.load()
        const a = db.auth
        if (!a) throw new AuthError('Əvvəlcə demo administrator yaradın.')
        const hash = await hashPassword(password, unb64(a.salt), a.iterations)
        if (email.trim().toLowerCase() !== a.email || hash !== a.hash) throw new AuthError('E-poçt və ya parol yanlışdır.')
        const user = { id: 'demo-admin', email: a.email }
        this.setSession(user)
        return user
      },
      signOut: async () => {
        this.setSession(null)
      },
      signOutOthers: async () => {
        /* single local session — nothing to invalidate */
      },
      changePassword: async (next, current) => {
        const db = await this.load()
        this.requireAuth()
        if (!db.auth) throw new AuthError('Administrator tapılmadı.')
        if (!current) throw new AuthError('Cari parolu daxil edin.')
        const ok = (await hashPassword(current, unb64(db.auth.salt), db.auth.iterations)) === db.auth.hash
        if (!ok) throw new AuthError('Cari parol yanlışdır.')
        validatePassword(next)
        const salt = crypto.getRandomValues(new Uint8Array(16))
        const hash = await hashPassword(next, salt, PBKDF2_ITERATIONS)
        await this.mutate((d) => {
          d.auth = { ...d.auth!, salt: b64(salt), hash, iterations: PBKDF2_ITERATIONS }
        })
      },
    }
  }

  /* ───────── public reads ───────── */

  async getCatalogue(opts?: { includeDrafts?: boolean }): Promise<Catalogue> {
    const db = await this.load()
    const drafts = !!opts?.includeDrafts && !!this.sessionUser()
    const ok = <T extends { status: string }>(r: T) => drafts || r.status === 'published'
    const manufacturers = db.manufacturers.filter(ok)
    const categories = db.categories.filter(ok)
    const generators = db.generators.filter(ok)
    const parts = db.parts.filter(ok)
    const gIds = new Set(generators.map((g) => g.id))
    const pIds = new Set(parts.map((p) => p.id))
    return structuredClone({
      manufacturers: manufacturers.sort((a, b) => a.sortOrder - b.sortOrder),
      categories: categories.sort((a, b) => a.sortOrder - b.sortOrder),
      generators,
      parts,
      compat: db.compat.filter((c) => gIds.has(c.generatorId) && pIds.has(c.partId)),
    })
  }

  async getSettings(): Promise<Settings> {
    return structuredClone((await this.load()).settings)
  }
  async getContent(): Promise<SiteContent> {
    return structuredClone((await this.load()).content)
  }

  async submitInquiry(input: InquiryInput): Promise<void> {
    const rec: Inquiry = {
      ...input,
      name: input.name.trim(),
      phone: input.phone.trim(),
      product: input.product.trim(),
      message: input.message.trim(),
      id: newId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      isDemo: false,
      status: 'new',
    }
    const v = validateEntity('inquiries', rec)
    if (!v.ok) throw new ValidationError(v.errors)
    await this.mutate((db) => {
      db.inquiries.unshift(rec)
    })
  }

  /* ───────── admin CRUD ───────── */

  async list<E extends EntityName>(entity: E): Promise<EntityMap[E][]> {
    this.requireAuth()
    const db = await this.load()
    return structuredClone(db[entity as ListKey]) as EntityMap[E][]
  }

  async save<E extends EntityName>(entity: E, record: EntityMap[E]): Promise<EntityMap[E]> {
    this.requireAuth()
    const rec = { ...record, updatedAt: nowIso() } as EntityMap[E]
    const v = validateEntity(entity, rec)
    if (!v.ok) throw new ValidationError(v.errors)
    return this.mutate((db) => {
      this.checkReferences(db, entity, rec)
      const arr = db[entity as ListKey] as unknown as EntityMap[E][]
      const slug = (rec as { slug?: string }).slug
      if (slug !== undefined && 'slug' in rec) {
        const clash = (arr as unknown as Array<{ id: string; slug: string; kind?: string }>).find(
          (x) => x.slug === slug && x.id !== rec.id && (x.kind ?? '') === ((rec as { kind?: string }).kind ?? ''),
        )
        if (clash) throw new ValidationError({ slug: 'Bu slug artıq istifadə olunur' })
      }
      const i = arr.findIndex((x) => x.id === rec.id)
      // lost-update protection: the editor must be saving on top of the version it loaded (another tab may have changed it)
      if (i >= 0 && (arr[i] as { updatedAt: string }).updatedAt !== (record as { updatedAt: string }).updatedAt) throw new ConflictError()
      if (i >= 0) arr[i] = structuredClone(rec)
      else arr.push(structuredClone(rec))
      return structuredClone(rec)
    })
  }

  /** Mirrors the foreign keys the Postgres schema enforces: manufacturer / category must exist (and be the right kind). */
  private checkReferences(db: DemoDb, entity: EntityName, rec: unknown): void {
    if (entity !== 'generators' && entity !== 'parts') return
    const r = rec as { manufacturerId: string | null; categoryId: string | null }
    const errors: Record<string, string> = {}
    if (r.manufacturerId && !db.manufacturers.some((m) => m.id === r.manufacturerId)) errors.manufacturerId = 'Seçilmiş istehsalçı mövcud deyil'
    if (r.categoryId) {
      const c = db.categories.find((x) => x.id === r.categoryId)
      const kind = entity === 'generators' ? 'generator' : 'part'
      if (!c || c.kind !== kind) errors.categoryId = 'Seçilmiş kateqoriya mövcud deyil və ya bu məhsul növü üçün deyil'
    }
    if (Object.keys(errors).length) throw new ValidationError(errors)
  }

  async remove(entity: EntityName, id: string): Promise<void> {
    this.requireAuth()
    await this.mutate((db) => {
      if (entity === 'manufacturers' || entity === 'categories') {
        const field = entity === 'manufacturers' ? 'manufacturerId' : 'categoryId'
        const gens = db.generators.filter((g) => g[field] === id).length
        const parts = db.parts.filter((p) => p[field] === id).length
        if (gens || parts)
          throw new InUseError(
            `Silmək olmur: ${gens} generator və ${parts} ehtiyat hissəsi bu qeydə bağlıdır. Əvvəlcə onları başqa qeydə keçirin.`,
            { generators: gens, parts },
          )
      }
      const key = entity as ListKey
      const kept = (db[key] as unknown as Array<{ id: string }>).filter((x) => x.id !== id)
      ;(db as unknown as Record<ListKey, unknown>)[key] = kept
      if (entity === 'generators') db.compat = db.compat.filter((c) => c.generatorId !== id)
      if (entity === 'parts') db.compat = db.compat.filter((c) => c.partId !== id)
    })
  }

  async reorder(entity: 'manufacturers' | 'categories', orderedIds: string[]): Promise<void> {
    this.requireAuth()
    await this.mutate((db) => {
      const arr = db[entity] as Array<{ id: string; sortOrder: number }>
      orderedIds.forEach((id, i) => {
        const r = arr.find((x) => x.id === id)
        if (r) r.sortOrder = i
      })
    })
  }

  async getCompat(): Promise<Compat[]> {
    this.requireAuth()
    return structuredClone((await this.load()).compat)
  }

  async setPartGenerators(partId: string, generatorIds: string[]): Promise<void> {
    this.requireAuth()
    await this.mutate((db) => {
      // same guarantee as the SQL foreign keys: never link to a record that no longer exists
      if (!db.parts.some((p) => p.id === partId) || generatorIds.some((g) => !db.generators.some((x) => x.id === g))) throw new ConflictError()
      db.compat = db.compat.filter((c) => c.partId !== partId)
      for (const gid of new Set(generatorIds)) db.compat.push({ partId, generatorId: gid })
    })
  }

  async setGeneratorParts(generatorId: string, partIds: string[]): Promise<void> {
    this.requireAuth()
    await this.mutate((db) => {
      if (!db.generators.some((g) => g.id === generatorId) || partIds.some((p) => !db.parts.some((x) => x.id === p))) throw new ConflictError()
      db.compat = db.compat.filter((c) => c.generatorId !== generatorId)
      for (const pid of new Set(partIds)) db.compat.push({ partId: pid, generatorId })
    })
  }

  async saveSettings(settings: Settings): Promise<Settings> {
    this.requireAuth()
    const r = settingsSchema.safeParse(settings)
    if (!r.success) throw new ValidationError(Object.fromEntries(r.error.issues.map((i) => [i.path.join('.') || '_', i.message])))
    await this.mutate((db) => {
      db.settings = structuredClone(settings)
    })
    return settings
  }

  async saveContent(content: SiteContent): Promise<SiteContent> {
    this.requireAuth()
    const r = contentSchema.safeParse(content)
    if (!r.success) throw new ValidationError(Object.fromEntries(r.error.issues.map((i) => [i.path.join('.') || '_', i.message])))
    await this.mutate((db) => {
      db.content = structuredClone(content)
    })
    return content
  }

  /* ───────── media ───────── */

  private async buildMedia(file: File, id: string, createdAt: string): Promise<MediaItem> {
    const p = await processImage(file)
    const [url, thumbUrl] = await Promise.all([blobToDataUrl(p.full), blobToDataUrl(p.thumb)])
    return {
      id,
      createdAt,
      updatedAt: nowIso(),
      isDemo: false,
      name: file.name,
      url,
      thumbUrl,
      width: p.width,
      height: p.height,
      size: p.full.size,
      alt: {},
    }
  }

  async uploadImage(file: File): Promise<MediaItem> {
    this.requireAuth()
    const item = await this.buildMedia(file, newId(), nowIso())
    await this.mutate((db) => {
      db.media.unshift(item)
    })
    return structuredClone(item)
  }

  async replaceImage(id: string, file: File): Promise<MediaItem> {
    this.requireAuth()
    const db = await this.load()
    const old = db.media.find((m) => m.id === id)
    if (!old) throw new Error('Media tapılmadı')
    const fresh = await this.buildMedia(file, id, old.createdAt)
    fresh.alt = old.alt
    return this.mutate((d) => {
      d.media = d.media.map((m) => (m.id === id ? fresh : m))
      const patch = (img: ImageRef | undefined) => {
        if (img?.mediaId === id) {
          img.url = fresh.url
          img.thumbUrl = fresh.thumbUrl
          img.width = fresh.width
          img.height = fresh.height
        }
      }
      d.manufacturers.forEach((m) => (patch(m.logo), patch(m.cover)))
      d.generators.forEach((g) => g.images.forEach(patch))
      d.parts.forEach((p) => p.images.forEach(patch))
      patch(d.settings.logo)
      patch(d.content.hero.image)
      patch(d.content.about.image)
      return structuredClone(fresh)
    })
  }

  async deleteMedia(id: string): Promise<void> {
    this.requireAuth()
    await this.mutate((db) => {
      db.media = db.media.filter((m) => m.id !== id)
    })
  }

  /* ───────── demo data ───────── */

  private applyDemo(db: DemoDb): DemoReport {
    const data = buildDemoDataset()
    // never overwrite a genuine (unflagged) record that happens to use a demo id
    const clash = [db.manufacturers, db.categories, db.generators, db.parts, db.media].some((arr, i) =>
      [data.manufacturers, data.categories, data.generators, data.parts, data.media][i].some((r) => arr.some((x) => x.id === r.id && !x.isDemo)),
    )
    if (clash) throw new Error('Demo məlumat yüklənmədi: demo identifikatoru ilə real qeyd var. Heç nə dəyişdirilmədi.')
    let added = 0
    const upsert = <T extends { id: string }>(arr: T[], rec: T) => {
      const i = arr.findIndex((x) => x.id === rec.id)
      if (i >= 0) arr[i] = rec
      else {
        arr.push(rec)
        added++
      }
    }
    data.manufacturers.forEach((r) => upsert(db.manufacturers, r))
    data.categories.forEach((r) => upsert(db.categories, r))
    data.generators.forEach((r) => upsert(db.generators, r))
    data.parts.forEach((r) => upsert(db.parts, r))
    data.media.forEach((r) => upsert(db.media, r))
    const have = new Set(db.compat.map((c) => `${c.partId}|${c.generatorId}`))
    for (const c of data.compat) if (!have.has(`${c.partId}|${c.generatorId}`)) db.compat.push(c)
    db.flags.demoRemoved = false
    return { added, removed: 0, detached: 0 }
  }

  async installDemo(): Promise<DemoReport> {
    this.requireAuth()
    return this.mutate((db) => {
      const r = this.applyDemo(db)
      db.flags.demoSeeded = true
      return r
    })
  }

  async removeDemo(): Promise<DemoReport> {
    this.requireAuth()
    return this.mutate((db) => {
      // A record is demo data only if it carries the flag AND a dataset id; a flagged record with any other id is kept.
      const ids = demoIdSets()
      const isD = (set: ReadonlySet<string>) => (r: { id: string; isDemo: boolean }) => r.isDemo && set.has(r.id)
      const dMfr = isD(ids.manufacturers)
      const dCat = isD(ids.categories)
      const dGen = isD(ids.generators)
      const dPart = isD(ids.parts)
      const dMedia = isD(ids.media)
      const skipped =
        db.manufacturers.filter((r) => r.isDemo && !dMfr(r)).length +
        db.categories.filter((r) => r.isDemo && !dCat(r)).length +
        db.generators.filter((r) => r.isDemo && !dGen(r)).length +
        db.parts.filter((r) => r.isDemo && !dPart(r)).length +
        db.media.filter((r) => r.isDemo && !dMedia(r)).length
      const demoMfr = new Set(db.manufacturers.filter(dMfr).map((m) => m.id))
      const demoCat = new Set(db.categories.filter(dCat).map((c) => c.id))
      const demoGen = new Set(db.generators.filter(dGen).map((g) => g.id))
      const demoPart = new Set(db.parts.filter(dPart).map((p) => p.id))
      const before = db.manufacturers.length + db.categories.length + db.generators.length + db.parts.length + db.media.length

      let detached = 0
      // everything that is not demo data (including flagged records without a dataset id) is kept; links to demo rows are detached
      for (const g of db.generators.filter((x) => !demoGen.has(x.id))) {
        let touched = false
        if (g.manufacturerId && demoMfr.has(g.manufacturerId)) {
          g.manufacturerId = null
          g.status = 'draft' // a published generator needs a manufacturer (same rule as the Supabase implementation)
          touched = true
        }
        if (g.categoryId && demoCat.has(g.categoryId)) {
          g.categoryId = null
          touched = true
        }
        if (touched) {
          detached++
        }
      }
      for (const p of db.parts.filter((x) => !demoPart.has(x.id))) {
        let touched = false
        if (p.manufacturerId && demoMfr.has(p.manufacturerId)) {
          p.manufacturerId = null
          touched = true
        }
        if (p.categoryId && demoCat.has(p.categoryId)) {
          p.categoryId = null
          touched = true
        }
        if (touched) detached++
      }
      db.compat = db.compat.filter((c) => {
        const drop = demoGen.has(c.generatorId) || demoPart.has(c.partId)
        if (drop && !(demoGen.has(c.generatorId) && demoPart.has(c.partId))) detached++
        return !drop
      })
      db.manufacturers = db.manufacturers.filter((m) => !demoMfr.has(m.id))
      db.categories = db.categories.filter((c) => !demoCat.has(c.id))
      db.generators = db.generators.filter((g) => !demoGen.has(g.id))
      db.parts = db.parts.filter((p) => !demoPart.has(p.id))
      db.media = db.media.filter((m) => !dMedia(m))
      db.flags.demoRemoved = true
      const after = db.manufacturers.length + db.categories.length + db.generators.length + db.parts.length + db.media.length
      return { added: 0, removed: before - after, detached, skipped }
    })
  }
}
