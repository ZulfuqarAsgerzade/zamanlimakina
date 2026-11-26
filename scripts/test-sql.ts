/**
 * Applies supabase/migrations to a throwaway PostgreSQL 16 container (Docker required), loads the demo dataset and runs the
 * assertion-based security tests in supabase/tests/rls.test.sql. Nothing outside the container is touched.
 *   npm run test:sql
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { buildDemoDataset } from '../src/demo/dataset.ts'
import { toRow } from '../src/data/supabaseMap.ts'

const root = path.resolve(import.meta.dirname, '..')
const name = `zm-sql-test-${process.pid}`
const run = (args: string[], input?: string) => spawnSync('docker', args, { input, encoding: 'utf8' })
const psql = (sql: string, extra: string[] = []) => run(['exec', '-i', name, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', ...extra], sql)

if (run(['version']).status !== 0) {
  console.error('Docker is not available — skipping SQL tests.')
  process.exit(2)
}
let code = 1
try {
  const up = run(['run', '-d', '--rm', '--name', name, '-e', 'POSTGRES_PASSWORD=pw', 'postgres:16-alpine'])
  if (up.status !== 0) throw new Error(up.stderr)
  // The official image starts a temporary server for initdb, stops it, and starts the real one: wait for the SECOND "ready" line
  // (pg_isready alone is true during the temporary server, which made the first statement fail intermittently).
  for (let i = 0; i < 80; i++) {
    const logs = run(['logs', name])
    const ready = ((logs.stdout + logs.stderr).match(/database system is ready to accept connections/g) ?? []).length
    if (ready >= 2 && run(['exec', name, 'pg_isready', '-U', 'postgres']).status === 0) break
    spawnSync('sleep', ['0.5'])
  }
  const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8')
  const steps: Array<[string, string]> = [
    ['stub', read('supabase/tests/stub.sql')],
    ...fs.readdirSync(path.join(root, 'supabase/migrations')).sort().map((f): [string, string] => [f, read(`supabase/migrations/${f}`)]),
  ]
  for (const [label, sql] of steps) {
    const r = psql(sql)
    if (r.status !== 0) throw new Error(`${label} failed:\n${r.stderr}`)
    console.log(`applied ${label}`)
  }
  // the whole demo dataset must satisfy every constraint
  const d = buildDemoDataset()
  const ins = (t: string, rows: object[]) => `insert into public.${t} select * from jsonb_populate_recordset(null::public.${t}, $j$${JSON.stringify(rows)}$j$::jsonb);`
  const seed = [
    ins('manufacturers', d.manufacturers.map(toRow)),
    ins('categories', d.categories.map(toRow)),
    ins('media', d.media.map(toRow)),
    ins('generators', d.generators.map(toRow)),
    ins('parts', d.parts.map(toRow)),
    ins('part_compatibility', d.compat.map((c) => ({ part_id: c.partId, generator_id: c.generatorId }))),
  ].join('\n')
  const s = psql(seed)
  if (s.status !== 0) throw new Error(`demo dataset violates the schema:\n${s.stderr}`)
  console.log(`demo dataset loaded (${d.generators.length} generators, ${d.parts.length} parts)`)
  // security assertions run on an empty copy of the data (they insert their own rows)
  const wipe = psql('truncate public.part_compatibility, public.parts, public.generators, public.media, public.categories, public.manufacturers cascade;')
  if (wipe.status !== 0) throw new Error(wipe.stderr)
  const t = psql(read('supabase/tests/rls.test.sql'))
  process.stdout.write(t.stdout)
  if (t.status !== 0) throw new Error(t.stderr)
  code = 0
} catch (e) {
  console.error(String(e))
} finally {
  run(['stop', name])
}
process.exit(code)
