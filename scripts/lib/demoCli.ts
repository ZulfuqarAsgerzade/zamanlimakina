/** Argument / environment guard for scripts/demo.ts, kept separate so it is unit-testable without any network. */

export type DemoCliVerdict =
  | { ok: true; host: string; dryRun: boolean; allowPopulated: boolean }
  | { ok: false; code: number; message: string }

export function checkDemoCli(input: {
  cmd: string | undefined
  flags: string[]
  url: string | undefined
  hasKey: boolean
  allowDemoTools: string | undefined
}): DemoCliVerdict {
  const { cmd, flags, url, hasKey } = input
  if (cmd !== 'install' && cmd !== 'remove')
    return { ok: false, code: 2, message: 'Usage: npm run demo:install -- --yes --confirm-host=<host> | npm run demo:remove -- --yes --confirm-host=<host>  (add --dry-run to preview)' }
  if (!url || !hasKey) return { ok: false, code: 2, message: 'Missing SUPABASE_URL (or VITE_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY. Nothing was changed.' }
  let host: string
  try {
    host = new URL(url).host
  } catch {
    return { ok: false, code: 2, message: 'SUPABASE_URL is not a valid URL. Nothing was changed.' }
  }
  const dryRun = flags.includes('--dry-run')
  const confirmHost = flags.find((f) => f.startsWith('--confirm-host='))?.slice('--confirm-host='.length)
  if (!dryRun) {
    if (!flags.includes('--yes'))
      return { ok: false, code: 2, message: `This would ${cmd} demo data on ${host}. Re-run with --yes --confirm-host=${host} to confirm (or --dry-run to preview). Nothing was changed.` }
    if (confirmHost !== host)
      return { ok: false, code: 2, message: `--confirm-host=${host} is required and must match the project host exactly${confirmHost ? ` (got "${confirmHost}")` : ''}. Nothing was changed.` }
  }
  if (cmd === 'install' && !dryRun && input.allowDemoTools !== 'true')
    return { ok: false, code: 2, message: 'Installing demo data is disabled by default so it cannot reach a production project. Set ALLOW_DEMO_TOOLS=true in the environment for a disposable / staging project. Nothing was changed.' }
  return { ok: true, host, dryRun, allowPopulated: flags.includes('--allow-populated') }
}
