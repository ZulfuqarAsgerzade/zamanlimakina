import type { DataMode } from './types.ts'
import type { Store } from './store.ts'

/**
 * Picks the data backend at build time:
 *   VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set  → Supabase (production)
 *   otherwise                                        → local demo store (browser IndexedDB)
 * `VITE_DATA_MODE=demo` forces demo mode even when Supabase variables are present.
 */
export function resolveMode(): DataMode {
  const env = import.meta.env
  if (env.VITE_DATA_MODE === 'demo') return 'demo'
  return env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY ? 'supabase' : 'demo'
}

let cached: Promise<Store> | null = null

export function getStore(): Promise<Store> {
  if (!cached) {
    cached =
      resolveMode() === 'supabase'
        ? import('./supabaseStore.ts').then((m) => m.createSupabaseStore())
        : import('./demoStore.ts').then((m) => new m.DemoStore())
  }
  return cached
}

/** Tests can inject a store. */
export function setStoreForTests(store: Store | null): void {
  cached = store ? Promise.resolve(store) : null
}
