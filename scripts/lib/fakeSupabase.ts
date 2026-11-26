import http from 'node:http'
import { buildDemoDataset } from '../../src/demo/dataset.ts'
import { defaultContent, defaultSettings } from '../../src/data/defaults.ts'
import { toRow } from '../../src/data/supabaseMap.ts'

/**
 * A tiny PostgREST look-alike (READ ONLY, public tables) used to exercise the Supabase code path end-to-end locally:
 * the real @supabase/supabase-js client sends real HTTP requests (select / eq filters / Range pagination) to this server.
 * It serves the demo dataset re-labelled as genuine rows (is_demo=false) plus one draft, so "published only" filtering is observable.
 * It is NOT a security model: RLS is tested separately against real PostgreSQL (npm run test:sql).
 */
export function startFakeSupabase(port: number): Promise<http.Server> {
  const d = buildDemoDataset()
  const real = <T extends { isDemo: boolean }>(rows: T[]) => rows.map((r) => ({ ...r, isDemo: false }))
  const tables: Record<string, Record<string, unknown>[]> = {
    manufacturers: real(d.manufacturers).map(toRow),
    categories: real(d.categories).map(toRow),
    generators: real(d.generators).map(toRow), // includes one draft
    parts: real(d.parts).map(toRow), // includes one draft
    media: real(d.media).map(toRow),
    part_compatibility: d.compat.map((c) => ({ part_id: c.partId, generator_id: c.generatorId })),
    site_settings: [
      { key: 'settings', value: { ...defaultSettings(), whatsapp: '994501234567', phone: '+994 50 123 45 67', email: 'info@example.test' } },
      { key: 'content', value: defaultContent() },
    ],
  }
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range' }
  const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') return void res.writeHead(204, cors).end()
    const u = new URL(req.url ?? '/', 'http://x')
    const m = u.pathname.match(/^\/rest\/v1\/(\w+)$/)
    if (req.method !== 'GET' || !m || !tables[m[1]]) return void res.writeHead(404, { ...cors, 'content-type': 'application/json' }).end('{"message":"not found"}')
    let rows = tables[m[1]]
    for (const [k, v] of u.searchParams) {
      const f = v.match(/^eq\.(.*)$/)
      if (f) rows = rows.filter((r) => String(r[k]) === f[1])
    }
    const range = String(req.headers.range ?? '0-999').split('-').map(Number)
    const slice = rows.slice(range[0], range[1] + 1)
    res.writeHead(200, { ...cors, 'content-type': 'application/json', 'content-range': `${range[0]}-${range[0] + Math.max(slice.length - 1, 0)}/${rows.length}` })
    res.end(JSON.stringify(slice))
  })
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)))
}
