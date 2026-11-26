/**
 * Demo data tooling for a Supabase project (server-side; uses the SERVICE ROLE key — never expose it to the browser).
 * The service-role key bypasses Row-Level Security, so every destructive path here has explicit guards.
 *
 *   npm run demo:install -- --yes --confirm-host=<host>   idempotent upsert of the demonstration catalogue (rows flagged is_demo)
 *   npm run demo:remove  -- --yes --confirm-host=<host>   removes ONLY rows that are is_demo = true AND carry a demo-dataset id
 *   add --dry-run to either command to see the effect without writing anything
 *
 * Guards:
 *   - nothing happens without --yes AND --confirm-host=<the exact project host>, so a wrong .env cannot be hit by accident
 *   - install additionally needs ALLOW_DEMO_TOOLS=true in the environment and refuses a database that already holds genuine
 *     records (override with --allow-populated only for a disposable / staging project)
 *   - a genuine row that uses a demo id is never overwritten; a row flagged is_demo without a dataset id is left alone
 *
 * Env (from .env or the shell):  SUPABASE_URL  (or VITE_SUPABASE_URL)  and  SUPABASE_SERVICE_ROLE_KEY
 * In local demo mode (no Supabase) use the admin dashboard buttons instead — that data lives in the browser.
 */
import { createClient } from '@supabase/supabase-js'
import { installDemoData, removeDemoData } from '../src/data/supabaseDemo.ts'
import { checkDemoCli } from './lib/demoCli.ts'

const [cmd, ...flags] = process.argv.slice(2)
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

const verdict = checkDemoCli({ cmd, flags, url, hasKey: !!key, allowDemoTools: process.env.ALLOW_DEMO_TOOLS })
if (!verdict.ok) {
  console.error(verdict.message)
  process.exit(verdict.code)
}

const db = createClient(url!, key!, { auth: { persistSession: false } })
const opts = { dryRun: verdict.dryRun, allowPopulated: verdict.allowPopulated }
try {
  const report = cmd === 'install' ? await installDemoData(db, opts) : await removeDemoData(db, opts)
  console.log(`[demo:${cmd}${verdict.dryRun ? ' --dry-run (nothing written)' : ''}] ${verdict.host} →`, report)
} catch (e) {
  console.error(`[demo:${cmd}] refused / failed: ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
}
