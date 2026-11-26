import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildDemoDataset, demoIdSets } from '../../demo/dataset.ts'
import { demoToolsPolicy } from '../demoPolicy.ts'
import { installDemoData, removeDemoData } from '../supabaseDemo.ts'
import { createSupabaseStore } from '../supabaseStore.ts'
import { toRow } from '../supabaseMap.ts'

/**
 * A small STATEFUL stand-in for PostgREST (eq / in / not-in filters, select / update / delete / upsert, head+count).
 * It lets the tests assert on what really remains in "the database" after install / remove — local only, no Supabase project.
 */
type Row = Record<string, unknown>
function memoryDb(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = { manufacturers: [], categories: [], generators: [], parts: [], media: [], part_compatibility: [], ...structuredClone(seed) }
  const writes: string[] = []
  const from = (table: string) => {
    const st = { op: 'select' as 'select' | 'update' | 'delete' | 'upsert', filters: [] as Array<(r: Row) => boolean>, patch: {} as Row, rows: [] as Row[], conflict: 'id', count: false, head: false }
    const match = (r: Row) => st.filters.every((f) => f(r))
    const b: Record<string, unknown> = {
      select: (_c?: string, o?: { count?: string; head?: boolean }) => {
        if (o?.count) st.count = true
        if (o?.head) st.head = true
        return b
      },
      update: (p: Row) => ((st.op = 'update'), (st.patch = p), b),
      delete: () => ((st.op = 'delete'), b),
      upsert: (rows: Row[], o?: { onConflict?: string }) => ((st.op = 'upsert'), (st.rows = rows), (st.conflict = o?.onConflict ?? 'id'), b),
      eq: (c: string, v: unknown) => (st.filters.push((r) => r[c] === v), b),
      in: (c: string, vs: unknown[]) => (st.filters.push((r) => vs.includes(r[c])), b),
      not: (c: string, op: string, v: string) => {
        if (op !== 'in') throw new Error(`memoryDb: unsupported not.${op}`)
        const set = new Set(v.replace(/^\(|\)$/g, '').split(',').filter(Boolean))
        st.filters.push((r) => !set.has(String(r[c])))
        return b
      },
      // oxlint-disable-next-line unicorn/no-thenable -- PostgREST builders are awaitable; the fake mimics that
      then: (res: (v: unknown) => unknown) => {
        const rows = tables[table]
        let data: Row[] = []
        if (st.op === 'select') data = rows.filter(match)
        else if (st.op === 'update') {
          writes.push(`update ${table}`)
          data = rows.filter(match)
          for (const r of data) Object.assign(r, st.patch)
        } else if (st.op === 'delete') {
          writes.push(`delete ${table}`)
          data = rows.filter(match)
          tables[table] = rows.filter((r) => !match(r))
        } else {
          writes.push(`upsert ${table}`)
          const keys = st.conflict.split(',')
          for (const n of st.rows) {
            const i = rows.findIndex((r) => keys.every((k) => r[k] === n[k]))
            if (i >= 0) rows[i] = { ...n }
            else rows.push({ ...n })
          }
        }
        return Promise.resolve({ data: st.head ? null : data, count: st.count ? data.length : null, error: null }).then(res)
      },
    }
    return b
  }
  return { client: { from } as unknown as SupabaseClient, tables, writes }
}

const demo = buildDemoDataset()
const totalDemo = demo.manufacturers.length + demo.categories.length + demo.generators.length + demo.parts.length + demo.media.length
const g = (over: Row): Row => ({ ...toRow(demo.generators[0]), ...over })

function genuineSeed(): Record<string, Row[]> {
  const mfr = { ...toRow(demo.manufacturers[0]), id: 'real-mfr', slug: 'real-brand', name: 'Real', is_demo: false }
  const gen = g({ id: 'real-gen', slug: 'real-gen', is_demo: false, manufacturer_id: 'real-mfr', category_id: null })
  return { manufacturers: [mfr], generators: [gen] }
}

describe('demo install (Supabase)', () => {
  it('installs the dataset into an empty database, all rows flagged is_demo with dataset ids', async () => {
    const m = memoryDb()
    const r = await installDemoData(m.client)
    expect(r.added).toBe(totalDemo)
    expect(m.tables.generators.every((x) => x.is_demo === true && demoIdSets().generators.has(String(x.id)))).toBe(true)
    expect(m.tables.part_compatibility.length).toBe(demo.compat.length)
  })

  it('refuses a database that already holds genuine records and writes nothing', async () => {
    const m = memoryDb(genuineSeed())
    await expect(installDemoData(m.client)).rejects.toThrow(/real qeydlər/)
    expect(m.writes).toEqual([])
    expect(m.tables.manufacturers).toHaveLength(1)
  })

  it('--allow-populated adds demo rows next to genuine ones without touching the genuine rows', async () => {
    const m = memoryDb(genuineSeed())
    await installDemoData(m.client, { allowPopulated: true })
    expect(m.tables.manufacturers.find((x) => x.id === 'real-mfr')).toMatchObject({ name: 'Real', is_demo: false })
    expect(m.tables.manufacturers).toHaveLength(demo.manufacturers.length + 1)
  })

  it('never overwrites a genuine row that uses a demo id, even with allowPopulated', async () => {
    const hijack = { ...toRow(demo.manufacturers[0]), name: 'Genuine company', is_demo: false }
    const m = memoryDb({ manufacturers: [hijack] })
    await expect(installDemoData(m.client, { allowPopulated: true })).rejects.toThrow(/real qeyd var/)
    expect(m.writes).toEqual([])
    expect(m.tables.manufacturers[0].name).toBe('Genuine company')
  })

  it('dry-run reports the effect and writes nothing', async () => {
    const m = memoryDb()
    const r = await installDemoData(m.client, { dryRun: true })
    expect(r.added).toBe(totalDemo)
    expect(m.writes).toEqual([])
  })
})

describe('demo removal (Supabase)', () => {
  async function installedWithGenuine() {
    const m = memoryDb(genuineSeed())
    await installDemoData(m.client, { allowPopulated: true })
    // a genuine generator that points at a demo manufacturer + a genuine part linked to a demo generator
    m.tables.generators.push(g({ id: 'real-gen-2', slug: 'real-gen-2', is_demo: false, manufacturer_id: demo.manufacturers[0].id, status: 'published' }))
    m.tables.parts.push({ ...toRow(demo.parts[0]), id: 'real-part', slug: 'real-part', is_demo: false })
    m.tables.part_compatibility.push({ part_id: 'real-part', generator_id: demo.generators[0].id }, { part_id: 'real-part', generator_id: 'real-gen' })
    return m
  }

  it('removes only dataset rows; genuine rows survive and references to demo rows are detached', async () => {
    const m = await installedWithGenuine()
    const r = await removeDemoData(m.client)
    expect(r.removed).toBe(totalDemo)
    expect(m.tables.manufacturers.map((x) => x.id)).toEqual(['real-mfr'])
    expect(m.tables.generators.map((x) => x.id).sort()).toEqual(['real-gen', 'real-gen-2'])
    expect(m.tables.parts.map((x) => x.id)).toEqual(['real-part'])
    expect(m.tables.generators.find((x) => x.id === 'real-gen-2')).toMatchObject({ manufacturer_id: null, status: 'draft' })
    expect(m.tables.generators.find((x) => x.id === 'real-gen')).toMatchObject({ manufacturer_id: 'real-mfr' }) // untouched
    expect(m.tables.part_compatibility).toEqual([{ part_id: 'real-part', generator_id: 'real-gen' }])
    expect(r.detached).toBeGreaterThanOrEqual(2)
  })

  it('does NOT trust the flag alone: an is_demo row without a dataset id is skipped, kept and reported', async () => {
    const m = await installedWithGenuine()
    m.tables.manufacturers.push({ ...toRow(demo.manufacturers[0]), id: 'flagged-by-hand', slug: 'flagged', name: 'Flagged by mistake', is_demo: true })
    m.tables.media.push({ id: 'my-upload', name: 'my.png', is_demo: true })
    const r = await removeDemoData(m.client)
    expect(r.skipped).toBe(2)
    expect(m.tables.manufacturers.map((x) => x.id).sort()).toEqual(['flagged-by-hand', 'real-mfr'])
    expect(m.tables.media.map((x) => x.id)).toEqual(['my-upload'])
  })

  it('a dataset-id row that is NOT flagged is genuine and is never deleted', async () => {
    const m = await installedWithGenuine()
    m.tables.manufacturers.find((x) => x.id === demo.manufacturers[0].id)!.is_demo = false // an admin adopted it as a real record
    await removeDemoData(m.client)
    expect(m.tables.manufacturers.map((x) => x.id).sort()).toEqual([demo.manufacturers[0].id, 'real-mfr'].sort())
  })

  it('dry-run reports the same numbers and writes nothing', async () => {
    const m = await installedWithGenuine()
    const before = JSON.stringify(m.tables)
    m.writes.length = 0
    const r = await removeDemoData(m.client, { dryRun: true })
    expect(r.removed).toBe(totalDemo)
    expect(r.detached).toBeGreaterThanOrEqual(2)
    expect(m.writes).toEqual([])
    expect(JSON.stringify(m.tables)).toBe(before)
  })
})

describe('demo tools policy', () => {
  it('local demo mode may do everything; Supabase mode cannot install unless explicitly enabled', () => {
    expect(demoToolsPolicy('demo')).toMatchObject({ install: true, remove: true })
    expect(demoToolsPolicy('supabase', {})).toMatchObject({ install: false, remove: true })
    expect(demoToolsPolicy('supabase', {}).installBlockedReason).toBeTruthy()
    expect(demoToolsPolicy('supabase', { VITE_ALLOW_DEMO_TOOLS: 'yes' }).install).toBe(false) // only the exact string "true"
    expect(demoToolsPolicy('supabase', { VITE_ALLOW_DEMO_TOOLS: 'true' }).install).toBe(true)
  })

  it('the Supabase store itself refuses to install (not just the UI) and never calls the database', async () => {
    const m = memoryDb()
    const spy = vi.spyOn(m.client, 'from')
    const store = await createSupabaseStore(m.client, demoToolsPolicy('supabase', {}))
    expect(store.demoTools.install).toBe(false)
    await expect(store.installDemo()).rejects.toThrow(/söndürülüb/)
    expect(spy).not.toHaveBeenCalled()
    expect(m.writes).toEqual([])
  })

  it('an explicitly enabled (staging) build can install, still guarded against populated databases', async () => {
    const ok = memoryDb()
    const store = await createSupabaseStore(ok.client, demoToolsPolicy('supabase', { VITE_ALLOW_DEMO_TOOLS: 'true' }))
    expect((await store.installDemo()).added).toBe(totalDemo)
    const populated = memoryDb(genuineSeed())
    const s2 = await createSupabaseStore(populated.client, demoToolsPolicy('supabase', { VITE_ALLOW_DEMO_TOOLS: 'true' }))
    await expect(s2.installDemo()).rejects.toThrow(/real qeydlər/)
  })
})
