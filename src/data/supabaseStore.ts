import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { newId } from '../lib/ids.ts'
import { processImage } from '../lib/image.ts'
import { defaultContent, defaultSettings } from './defaults.ts'
import { demoToolsPolicy } from './demoPolicy.ts'
import type { DemoToolsPolicy } from './demoPolicy.ts'
import { ValidationError, contentSchema, settingsSchema, validateEntity } from './schema.ts'
import { ConflictError, InUseError } from './store.ts'
import type { AuthApi, AuthUser, DemoReport, InquiryInput, Store } from './store.ts'
import { TABLE, fromRow, toRow } from './supabaseMap.ts'
import type { Catalogue, Compat, EntityMap, EntityName, ImageRef, MediaItem, Settings, SiteContent } from './types.ts'

/**
 * Production store: Supabase (PostgreSQL + Auth + Storage).
 *
 * Security model — the browser only ever holds the public ANON key. Every write is guarded by
 * row-level-security policies (see supabase/migrations) that require the caller to be a row in
 * `admin_users`; the UI route guard is convenience, not protection. Never ship the service-role key
 * to the browser (it is only read by scripts/demo.ts on a developer machine / CI).
 */

const BUCKET = 'media'
const PAGE = 1000

class AuthError extends Error {}

export function createSupabaseClient(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  return createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
}

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as T[]
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

const isUnique = (e: { code?: string } | null) => e?.code === '23505'
const isFk = (e: { code?: string } | null) => e?.code === '23503'

/**
 * `demoTools` defaults to the build's policy (VITE_ALLOW_DEMO_TOOLS), which is "install disabled" for a real project.
 * Tests may pass an explicit policy.
 */
export async function createSupabaseStore(client: SupabaseClient = createSupabaseClient(), demoTools: DemoToolsPolicy = demoToolsPolicy('supabase', { VITE_ALLOW_DEMO_TOOLS: import.meta.env?.VITE_ALLOW_DEMO_TOOLS })): Promise<Store> {
  return new SupabaseStore(client, demoTools)
}

class SupabaseStore implements Store {
  readonly mode = 'supabase' as const
  readonly auth: AuthApi

  readonly demoTools: DemoToolsPolicy
  private db: SupabaseClient

  constructor(db: SupabaseClient, demoTools: DemoToolsPolicy) {
    this.db = db
    this.demoTools = demoTools
    this.auth = this.makeAuth()
  }

  /* ───────── auth ───────── */

  /** 'unknown' = the check itself failed (network, 5xx, token refresh race) — never confused with "not an admin". */
  private async adminState(userId: string): Promise<'yes' | 'no' | 'unknown'> {
    const { data, error } = await this.db.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle()
    if (error) return 'unknown'
    return data ? 'yes' : 'no'
  }

  private makeAuth(): AuthApi {
    const db = this.db
    const toUser = (u: { id: string; email?: string | null }): AuthUser => ({ id: u.id, email: u.email ?? '' })
    return {
      getSession: async () => {
        const { data } = await db.auth.getSession()
        const u = data.session?.user
        return u && (await this.adminState(u.id)) === 'yes' ? toUser(u) : null
      },
      onChange: (cb) => {
        const { data } = db.auth.onAuthStateChange((_event, session) => {
          const u = session?.user
          if (!u) return cb(null)
          // defer: calling supabase inside this callback can deadlock the auth lock
          // a failed check ('unknown') must NOT sign the editor out and discard their unsaved form: keep the current state
          setTimeout(
            () =>
              void this.adminState(u.id).then((st) => {
                if (st !== 'unknown') cb(st === 'yes' ? toUser(u) : null)
              }),
            0,
          )
        })
        return () => data.subscription.unsubscribe()
      },
      signIn: async (email, password) => {
        const { data, error } = await db.auth.signInWithPassword({ email: email.trim(), password })
        if (error || !data.user) {
          if (error?.status === 429) throw new AuthError('Çox sayda cəhd edilib. Bir az gözləyib yenidən cəhd edin.')
          if (error && error.status !== 400 && error.code !== 'invalid_credentials' && error.status !== undefined)
            throw new AuthError(`Giriş mümkün olmadı (${error.message}). Bağlantını yoxlayıb yenidən cəhd edin.`)
          throw new AuthError('E-poçt və ya parol yanlışdır.')
        }
        const st = await this.adminState(data.user.id)
        if (st !== 'yes') {
          await db.auth.signOut({ scope: 'local' })
          throw new AuthError(st === 'no' ? 'Bu hesabın administrator icazəsi yoxdur.' : 'Administrator icazəsi yoxlana bilmədi. Bağlantını yoxlayıb yenidən cəhd edin.')
        }
        return toUser(data.user)
      },
      // local scope: ends THIS browser's session only (the default would also sign out every other device/tab, losing their unsaved forms)
      signOut: async () => {
        await db.auth.signOut({ scope: 'local' })
      },
      signOutOthers: async () => {
        const { error } = await db.auth.signOut({ scope: 'others' })
        if (error) throw new AuthError(error.message)
      },
      changePassword: async (next, current) => {
        const { data } = await db.auth.getUser()
        if (!data.user?.email) throw new AuthError('Sessiya tapılmadı.')
        if (!current) throw new AuthError('Cari parolu daxil edin.')
        const re = await db.auth.signInWithPassword({ email: data.user.email, password: current })
        if (re.error) throw new AuthError('Cari parol yanlışdır.')
        if (next.length < 10 || !/[A-Za-z]/.test(next) || !/\d/.test(next))
          throw new AuthError('Parol ən azı 10 simvol olmalı, hərf və rəqəm içərməlidir.')
        const { error } = await db.auth.updateUser({ password: next })
        if (error) throw new AuthError(error.message)
      },
      needsSetup: async () => {
        return false
      },
      setup: async () => {
        throw new AuthError('Production-da administrator Supabase paneli vasitəsilə yaradılır (README → "İlk administrator").')
      },
    }
  }

  /* ───────── public reads ───────── */

  async getCatalogue(opts?: { includeDrafts?: boolean }): Promise<Catalogue> {
    const published = !opts?.includeDrafts
    const sel = <T>(table: string, order: string) =>
      fetchAll<Record<string, unknown>>((from, to) => {
        // secondary key `id`: rows sharing a sort key / timestamp must not be skipped or duplicated between pages
        let q = this.db.from(table).select('*').order(order, { ascending: true }).order('id', { ascending: true }).range(from, to)
        if (published) q = q.eq('status', 'published')
        return q
      }).then((rows) => rows.map((r) => fromRow<T>(r)))
    const [manufacturers, categories, generators, parts, compat] = await Promise.all([
      sel<EntityMap['manufacturers']>(TABLE.manufacturers, 'sort_order'),
      sel<EntityMap['categories']>(TABLE.categories, 'sort_order'),
      sel<EntityMap['generators']>(TABLE.generators, 'created_at'),
      sel<EntityMap['parts']>(TABLE.parts, 'created_at'),
      fetchAll<{ part_id: string; generator_id: string }>((from, to) =>
        this.db.from('part_compatibility').select('part_id, generator_id').order('part_id').order('generator_id').range(from, to),
      ),
    ])
    return {
      manufacturers,
      categories,
      generators,
      parts,
      compat: compat.map((c) => ({ partId: c.part_id, generatorId: c.generator_id })),
    }
  }

  private async getDoc<T>(key: 'settings' | 'content', fallback: T): Promise<T> {
    const { data, error } = await this.db.from('site_settings').select('value').eq('key', key).maybeSingle()
    if (error) throw new Error(error.message)
    return { ...fallback, ...(data?.value as object | undefined) } as T
  }
  getSettings(): Promise<Settings> {
    return this.getDoc('settings', defaultSettings())
  }
  getContent(): Promise<SiteContent> {
    return this.getDoc('content', defaultContent())
  }

  async submitInquiry(input: InquiryInput): Promise<void> {
    const now = new Date().toISOString()
    const rec = { ...input, id: newId(), createdAt: now, updatedAt: now, isDemo: false, status: 'new' as const }
    const v = validateEntity('inquiries', rec)
    if (!v.ok) throw new ValidationError(v.errors)
    const validated = { ...rec, name: rec.name.trim(), phone: rec.phone.trim(), product: rec.product.trim(), message: rec.message.trim() }
    // insert the VALIDATED (trimmed) values, so what the DB checks is exactly what the form validated
    const { error } = await this.db.from('inquiries').insert(toRow(validated))
    if (error) throw new Error(error.message)
  }

  /* ───────── admin ───────── */

  async list<E extends EntityName>(entity: E): Promise<EntityMap[E][]> {
    const rows = await fetchAll<Record<string, unknown>>((from, to) =>
      this.db.from(TABLE[entity]).select('*').order('created_at', { ascending: false }).order('id').range(from, to),
    )
    return rows.map((r) => fromRow<EntityMap[E]>(r))
  }

  async save<E extends EntityName>(entity: E, record: EntityMap[E]): Promise<EntityMap[E]> {
    const rec = { ...record, updatedAt: new Date().toISOString() } as EntityMap[E]
    const v = validateEntity(entity, rec)
    if (!v.ok) throw new ValidationError(v.errors)
    await this.assertNotChanged(entity, record)
    const { data, error } = await this.db.from(TABLE[entity]).upsert(toRow(rec), { onConflict: 'id' }).select().single()
    if (error) throw this.mapWriteError(error)
    return fromRow<EntityMap[E]>(data as Record<string, unknown>)
  }

  /**
   * Best-effort lost-update protection: if the stored row's `updated_at` differs from the version the editor loaded, someone else
   * changed it (or it was deleted) → ConflictError instead of silently overwriting. Compared as milliseconds (PostgREST returns
   * microsecond strings). Not atomic — a hard guarantee would need a SQL function; this closes the realistic two-admin case.
   */
  private async assertNotChanged(entity: EntityName, record: { id: string; updatedAt: string }): Promise<void> {
    const { data, error } = await this.db.from(TABLE[entity]).select('updated_at').eq('id', record.id).maybeSingle()
    if (error) throw this.mapWriteError(error)
    if (!data) return // new record (a record deleted elsewhere is simply re-created; detecting that would need server state)
    const stored = Date.parse((data as { updated_at: string }).updated_at)
    if (Number.isFinite(stored) && stored !== Date.parse(record.updatedAt)) throw new ConflictError()
  }

  /** Translate Postgres constraint violations into the same ValidationError the demo store raises. */
  private mapWriteError(error: { code?: string; message: string; details?: string }): Error {
    if (isUnique(error)) return new ValidationError({ slug: 'Bu slug artıq istifadə olunur' })
    if (isFk(error)) return new ValidationError({ _: 'Seçilmiş istehsalçı və ya kateqoriya mövcud deyil' })
    if (error.code === '23514') return new ValidationError({ _: `Verilənlər bazası qaydası pozulub (${error.message})` })
    if (error.code === '42501') return new Error('Bu əməliyyat üçün icazəniz yoxdur (administrator olaraq daxil olun).')
    return new Error(error.message)
  }

  async remove(entity: EntityName, id: string): Promise<void> {
    const { error } = await this.db.from(TABLE[entity]).delete().eq('id', id)
    if (!error) return
    if (isFk(error)) {
      const field = entity === 'manufacturers' ? 'manufacturer_id' : 'category_id'
      const count = async (t: string) => (await this.db.from(t).select('id', { count: 'exact', head: true }).eq(field, id)).count ?? 0
      const [generators, parts] = await Promise.all([count('generators'), count('parts')])
      throw new InUseError(
        `Silmək olmur: ${generators} generator və ${parts} ehtiyat hissəsi bu qeydə bağlıdır. Əvvəlcə onları başqa qeydə keçirin.`,
        { generators, parts },
      )
    }
    throw new Error(error.message)
  }

  async reorder(entity: 'manufacturers' | 'categories', orderedIds: string[]): Promise<void> {
    const results = await Promise.all(orderedIds.map((id, i) => this.db.from(TABLE[entity]).update({ sort_order: i }).eq('id', id)))
    const failed = results.find((r) => r.error)
    if (failed?.error) throw new Error(failed.error.message)
  }

  async getCompat(): Promise<Compat[]> {
    const rows = await fetchAll<{ part_id: string; generator_id: string }>((from, to) =>
      this.db.from('part_compatibility').select('part_id, generator_id').order('part_id').order('generator_id').range(from, to),
    )
    return rows.map((c) => ({ partId: c.part_id, generatorId: c.generator_id }))
  }

  /**
   * Replace the link set WITHOUT a delete-everything window: add the missing pairs first, then remove the ones that are gone.
   * If the insert fails nothing has been removed; a pair pointing at a record deleted meanwhile fails the foreign key (clear error).
   */
  private async replaceLinks(column: 'part_id' | 'generator_id', id: string, others: string[]) {
    const other = column === 'part_id' ? 'generator_id' : 'part_id'
    const wanted = new Set(others)
    const cur = await this.db.from('part_compatibility').select(other).eq(column, id)
    if (cur.error) throw new Error(cur.error.message)
    const existing = new Set(((cur.data ?? []) as unknown as Array<Record<string, string>>).map((r) => r[other]))
    const toAdd = [...wanted].filter((o) => !existing.has(o))
    const toRemove = [...existing].filter((o) => !wanted.has(o))
    if (toAdd.length) {
      const ins = await this.db.from('part_compatibility').insert(toAdd.map((o) => ({ [column]: id, [other]: o })))
      if (ins.error) throw this.mapWriteError(ins.error)
    }
    if (toRemove.length) {
      const del = await this.db.from('part_compatibility').delete().eq(column, id).in(other, toRemove)
      if (del.error) throw new Error(del.error.message)
    }
  }
  setPartGenerators(partId: string, generatorIds: string[]) {
    return this.replaceLinks('part_id', partId, generatorIds)
  }
  setGeneratorParts(generatorId: string, partIds: string[]) {
    return this.replaceLinks('generator_id', generatorId, partIds)
  }

  private async putDoc(key: 'settings' | 'content', value: unknown) {
    const { error } = await this.db.from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) throw new Error(error.message)
  }
  async saveSettings(settings: Settings): Promise<Settings> {
    const r = settingsSchema.safeParse(settings)
    if (!r.success) throw new ValidationError(Object.fromEntries(r.error.issues.map((i) => [i.path.join('.') || '_', i.message])))
    await this.putDoc('settings', settings)
    return settings
  }
  async saveContent(content: SiteContent): Promise<SiteContent> {
    const r = contentSchema.safeParse(content)
    if (!r.success) throw new ValidationError(Object.fromEntries(r.error.issues.map((i) => [i.path.join('.') || '_', i.message])))
    await this.putDoc('content', content)
    return content
  }

  /* ───────── media (Supabase Storage) ───────── */

  private publicUrl(path: string): string {
    return this.db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }

  private async upload(id: string, file: File, upsert: boolean) {
    const p = await processImage(file)
    const fullPath = `${id}/full.webp`
    const thumbPath = `${id}/thumb.webp`
    const opts = { contentType: 'image/webp', cacheControl: '3600', upsert }
    const [a, b] = await Promise.all([
      this.db.storage.from(BUCKET).upload(fullPath, p.full, opts),
      this.db.storage.from(BUCKET).upload(thumbPath, p.thumb, opts),
    ])
    if (a.error || b.error) throw new Error((a.error ?? b.error)!.message)
    return { p, fullPath, url: this.publicUrl(fullPath), thumbUrl: this.publicUrl(thumbPath) }
  }

  async uploadImage(file: File): Promise<MediaItem> {
    const id = newId()
    const { p, fullPath, url, thumbUrl } = await this.upload(id, file, false)
    const now = new Date().toISOString()
    const item: MediaItem = { id, createdAt: now, updatedAt: now, isDemo: false, name: file.name, url, thumbUrl, path: fullPath, width: p.width, height: p.height, size: p.full.size, alt: {} }
    try {
      return await this.save('media', item)
    } catch (e) {
      // do not leave orphaned files in the bucket when the database row could not be written
      await this.db.storage.from(BUCKET).remove([`${id}/full.webp`, `${id}/thumb.webp`])
      throw e
    }
  }

  async replaceImage(id: string, file: File): Promise<MediaItem> {
    const { data, error } = await this.db.from('media').select('*').eq('id', id).single()
    if (error) throw new Error(error.message)
    const old = fromRow<MediaItem>(data as Record<string, unknown>)
    // same storage path + upsert: references that already point at this storage file keep working and show the new picture
    const { p, fullPath, url, thumbUrl } = await this.upload(id, file, true)
    const updated = await this.save('media', { ...old, name: file.name, url, thumbUrl, path: fullPath, width: p.width, height: p.height, size: p.full.size })
    // rows whose image was NOT in storage before (e.g. the bundled demo artwork) still reference the old URL → repoint them
    if (old.url !== url) await this.repointImageRefs(id, { url, thumbUrl, width: p.width, height: p.height })
    return updated
  }

  private async repointImageRefs(mediaId: string, to: { url: string; thumbUrl?: string; width: number; height: number }) {
    const patch = (img?: ImageRef) => {
      if (img?.mediaId === mediaId) Object.assign(img, to)
      return img?.mediaId === mediaId
    }
    for (const g of await this.list('generators')) if (g.images.map(patch).some(Boolean)) await this.save('generators', g)
    for (const part of await this.list('parts')) if (part.images.map(patch).some(Boolean)) await this.save('parts', part)
    for (const m of await this.list('manufacturers')) if ([patch(m.logo), patch(m.cover)].some(Boolean)) await this.save('manufacturers', m)
  }

  async deleteMedia(id: string): Promise<void> {
    // row first: if it fails (permissions) the files stay and nothing is left dangling
    const { error } = await this.db.from('media').delete().eq('id', id)
    if (error) throw this.mapWriteError(error)
    await this.db.storage.from(BUCKET).remove([`${id}/full.webp`, `${id}/thumb.webp`])
  }

  /* ───────── demo data (admin session; scripts/demo.ts does the same with the service-role key) ───────── */

  async installDemo(): Promise<DemoReport> {
    // enforced here as well as in the UI: a real project must never receive demo rows by accident
    if (!this.demoTools.install) throw new Error(this.demoTools.installBlockedReason ?? 'Demo məlumat yükləmək söndürülüb.')
    return (await import('./supabaseDemo.ts')).installDemoData(this.db)
  }
  async removeDemo(): Promise<DemoReport> {
    if (!this.demoTools.remove) throw new Error('Demo məlumatın silinməsi söndürülüb.')
    return (await import('./supabaseDemo.ts')).removeDemoData(this.db)
  }
}
