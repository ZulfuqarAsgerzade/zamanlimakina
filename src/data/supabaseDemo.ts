import type { SupabaseClient } from '@supabase/supabase-js'
import { buildDemoDataset, demoIdSets } from '../demo/dataset.ts'
import type { DemoReport } from './store.ts'
import { TABLE, toRow } from './supabaseMap.ts'

/**
 * Demo install / removal against Postgres. Shared by the admin panel (signed-in admin, RLS applies)
 * and `scripts/demo.ts` (service-role key, server side only).
 *
 * A row is demo data ONLY when it has `is_demo = true` AND one of the dataset's deterministic ids (`demoIdSets`).
 * The flag alone is not trusted: a genuine row flagged by mistake or by hand is reported as `skipped` and never deleted.
 * Genuine rows that pointed at demo rows are detached, not deleted. Install refuses to overwrite a genuine row that
 * uses a demo id, and (unless `allowPopulated`) refuses to run at all on a database that already holds genuine records.
 */

export interface DemoRunOptions {
  /** Report what would happen without writing anything. */
  dryRun?: boolean
  /** Install only: allow adding demo rows next to genuine ones (CLI `--allow-populated`; never set by the browser). */
  allowPopulated?: boolean
}

const ENTITY_TABLES = [
  ['manufacturers', TABLE.manufacturers],
  ['categories', TABLE.categories],
  ['generators', TABLE.generators],
  ['parts', TABLE.parts],
  ['media', TABLE.media],
] as const


async function check<T extends { error: { message: string } | null }>(label: string, p: PromiseLike<T>): Promise<T> {
  const r = await p
  if (r.error) throw new Error(`${label}: ${r.error.message}`)
  return r
}

export async function installDemoData(db: SupabaseClient, opts: DemoRunOptions = {}): Promise<DemoReport> {
  const d = buildDemoDataset()
  const mine = demoIdSets()

  // 1) a genuine (unflagged) row must never be overwritten by an upsert on a demo id
  for (const [key, table] of ENTITY_TABLES) {
    const r = await check(`select ${table}`, db.from(table).select('id').eq('is_demo', false).in('id', [...mine[key]]))
    if ((r.data?.length ?? 0) > 0) throw new Error(`Demo məlumat yüklənmədi: "${table}" cədvəlində demo identifikatoru olan real qeyd var. Heç nə dəyişdirilmədi.`)
  }
  // 2) refuse on a database that already holds genuine records
  if (!opts.allowPopulated) {
    const found: string[] = []
    for (const [, table] of ENTITY_TABLES) {
      const r = await check(`count ${table}`, db.from(table).select('id', { count: 'exact', head: true }).eq('is_demo', false))
      if ((r.count ?? 0) > 0) found.push(`${table}: ${r.count}`)
    }
    if (found.length)
      throw new Error(`Demo məlumat yüklənmədi: verilənlər bazasında artıq real qeydlər var (${found.join(', ')}). Heç nə dəyişdirilmədi.`)
  }

  const total = d.manufacturers.length + d.categories.length + d.generators.length + d.parts.length + d.media.length
  if (opts.dryRun) return { added: total, removed: 0, detached: 0, skipped: 0 }

  const up = (table: string, rows: object[], onConflict = 'id') =>
    rows.length ? check(`upsert ${table}`, db.from(table).upsert(rows.map(toRow), { onConflict })) : Promise.resolve()
  // order matters because of foreign keys
  await up(TABLE.manufacturers, d.manufacturers)
  await up(TABLE.categories, d.categories)
  await up(TABLE.media, d.media)
  await up(TABLE.generators, d.generators)
  await up(TABLE.parts, d.parts)
  await up(
    'part_compatibility',
    d.compat.map((c) => ({ part_id: c.partId, generator_id: c.generatorId })),
    'part_id,generator_id',
  )
  return { added: total, removed: 0, detached: 0, skipped: 0 }
}

export async function removeDemoData(db: SupabaseClient, opts: DemoRunOptions = {}): Promise<DemoReport> {
  const mine = demoIdSets()
  let skipped = 0
  // is_demo = true AND a dataset id; flagged rows with any other id are counted, not touched
  const ids = async (key: keyof typeof mine, table: string) => {
    const r = await check(`select ${table}`, db.from(table).select('id').eq('is_demo', true))
    const flagged = ((r.data ?? []) as Array<{ id: string }>).map((x) => x.id)
    const own = flagged.filter((id) => mine[key].has(id))
    skipped += flagged.length - own.length
    return own
  }
  const [mfr, cat, gen, part, media] = await Promise.all(ENTITY_TABLES.map(([key, table]) => ids(key, table)))
  let detached = 0

  // a genuine row = anything not in the demo id sets (is_demo=false, or flagged without a dataset id)
  const notDemo = (set: ReadonlySet<string>) => `(${[...set].join(',')})`
  // 1) genuine rows that reference demo manufacturers / categories are detached (a published generator
  //    needs a manufacturer, so those fall back to draft)
  const detach = async (label: string, table: string, patch: object, column: string, demoIds: string[], owned: ReadonlySet<string>) => {
    if (!demoIds.length) return 0
    const base = opts.dryRun ? db.from(table).select('id') : db.from(table).update(patch)
    const r = await check(label, base.not('id', 'in', notDemo(owned)).in(column, demoIds).select('id'))
    return (r.data as unknown[] | null)?.length ?? 0
  }
  detached += await detach('detach generators/mfr', 'generators', { manufacturer_id: null, status: 'draft' }, 'manufacturer_id', mfr, mine.generators)
  detached += await detach('detach parts/mfr', 'parts', { manufacturer_id: null }, 'manufacturer_id', mfr, mine.parts)
  detached += await detach('detach generators/cat', 'generators', { category_id: null }, 'category_id', cat, mine.generators)
  detached += await detach('detach parts/cat', 'parts', { category_id: null }, 'category_id', cat, mine.parts)

  // 2) compatibility pairs that touch a demo row (pairs between a genuine row and a demo row count as detached)
  const links = await check('select compat', db.from('part_compatibility').select('part_id, generator_id'))
  const demoGen = new Set(gen)
  const demoPart = new Set(part)
  for (const l of (links.data ?? []) as Array<{ part_id: string; generator_id: string }>) {
    const gDemo = demoGen.has(l.generator_id)
    const pDemo = demoPart.has(l.part_id)
    if ((gDemo || pDemo) && !(gDemo && pDemo)) detached++
  }
  const removed = mfr.length + cat.length + gen.length + part.length + media.length
  if (opts.dryRun) return { added: 0, removed, detached, skipped }

  if (gen.length) await check('delete compat/gen', db.from('part_compatibility').delete().in('generator_id', gen))
  if (part.length) await check('delete compat/part', db.from('part_compatibility').delete().in('part_id', part))

  // 3) delete exactly the identified rows (children first); each delete also re-checks the flag
  const del = (table: string, rows: string[]) => (rows.length ? check(`delete ${table}`, db.from(table).delete().eq('is_demo', true).in('id', rows)) : Promise.resolve())
  await del('generators', gen)
  await del('parts', part)
  await del('manufacturers', mfr)
  await del('categories', cat)
  await del('media', media)

  return { added: 0, removed, detached, skipped }
}
