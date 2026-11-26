import { describe, expect, it } from 'vitest'
import { checkDemoCli } from './demoCli.ts'
import { assertDemoToolsNotInProduction } from './keyGuard.ts'

const base = { url: 'https://abc.supabase.co', hasKey: true, allowDemoTools: undefined as string | undefined }

describe('scripts/demo.ts argument guard', () => {
  it('rejects unknown commands and missing credentials', () => {
    expect(checkDemoCli({ ...base, cmd: 'wipe', flags: [] }).ok).toBe(false)
    expect(checkDemoCli({ ...base, cmd: 'remove', flags: ['--yes'], url: undefined }).ok).toBe(false)
    expect(checkDemoCli({ ...base, cmd: 'remove', flags: ['--yes'], hasKey: false }).ok).toBe(false)
  })
  it('needs --yes AND the exact project host before anything destructive', () => {
    expect(checkDemoCli({ ...base, cmd: 'remove', flags: [] }).ok).toBe(false)
    expect(checkDemoCli({ ...base, cmd: 'remove', flags: ['--yes'] })).toMatchObject({ ok: false })
    expect(checkDemoCli({ ...base, cmd: 'remove', flags: ['--yes', '--confirm-host=other.supabase.co'] }).ok).toBe(false)
    expect(checkDemoCli({ ...base, cmd: 'remove', flags: ['--yes', '--confirm-host=abc.supabase.co'] })).toMatchObject({ ok: true, host: 'abc.supabase.co', dryRun: false })
  })
  it('install is off unless ALLOW_DEMO_TOOLS=true, and refuses populated databases unless --allow-populated', () => {
    const flags = ['--yes', '--confirm-host=abc.supabase.co']
    expect(checkDemoCli({ ...base, cmd: 'install', flags }).ok).toBe(false)
    expect(checkDemoCli({ ...base, cmd: 'install', flags, allowDemoTools: 'true' })).toMatchObject({ ok: true, allowPopulated: false })
    expect(checkDemoCli({ ...base, cmd: 'install', flags: [...flags, '--allow-populated'], allowDemoTools: 'true' })).toMatchObject({ ok: true, allowPopulated: true })
  })
  it('--dry-run needs no confirmation because it writes nothing', () => {
    expect(checkDemoCli({ ...base, cmd: 'remove', flags: ['--dry-run'] })).toMatchObject({ ok: true, dryRun: true })
    expect(checkDemoCli({ ...base, cmd: 'install', flags: ['--dry-run'] })).toMatchObject({ ok: true, dryRun: true })
  })
})

describe('production build guard for demo tools', () => {
  it('fails a production-context build that enables demo tools; allows other contexts and the default', () => {
    expect(() => assertDemoToolsNotInProduction({ VITE_ALLOW_DEMO_TOOLS: 'true' }, 'production')).toThrow(/not allowed in a production build/)
    expect(() => assertDemoToolsNotInProduction({ VITE_ALLOW_DEMO_TOOLS: ' TRUE ' }, 'production')).toThrow()
    expect(() => assertDemoToolsNotInProduction({ VITE_ALLOW_DEMO_TOOLS: 'true' }, 'deploy-preview')).not.toThrow()
    expect(() => assertDemoToolsNotInProduction({}, 'production')).not.toThrow()
    expect(() => assertDemoToolsNotInProduction({ VITE_ALLOW_DEMO_TOOLS: 'false' }, 'production')).not.toThrow()
  })
})
