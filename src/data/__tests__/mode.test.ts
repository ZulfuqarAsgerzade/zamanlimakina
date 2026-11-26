import { afterEach, describe, expect, it, vi } from 'vitest'
import { getStore, resolveMode, setStoreForTests } from '../index.ts'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  setStoreForTests(null)
})

describe('data mode selection (demo can never touch production data)', () => {
  it('uses Supabase only when BOTH the URL and the anon key are present', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    expect(resolveMode()).toBe('demo')
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co')
    expect(resolveMode()).toBe('demo')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    expect(resolveMode()).toBe('supabase')
  })

  it('VITE_DATA_MODE=demo forces demo even when Supabase is configured', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    vi.stubEnv('VITE_DATA_MODE', 'demo')
    expect(resolveMode()).toBe('demo')
  })

  it('the demo store never performs a network request', async () => {
    const fetchSpy = vi.fn(async () => new Response('{}'))
    vi.stubGlobal('fetch', fetchSpy)
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    const store = await getStore()
    expect(store.mode).toBe('demo')
    await store.getCatalogue()
    await store.getSettings()
    await store.auth.setup('admin@example.com', 'Correct-horse-9')
    await store.removeDemo()
    await store.installDemo()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('with Supabase configured the store is the Supabase one, not the browser-local demo store', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    const store = await getStore()
    expect(store.mode).toBe('supabase')
    expect(store.persistence).toBeUndefined() // only the demo store reports browser-local persistence
  })
})
