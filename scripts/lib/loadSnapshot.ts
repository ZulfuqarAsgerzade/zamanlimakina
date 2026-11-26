import { createClient } from '@supabase/supabase-js'
import { buildDemoDataset } from '../../src/demo/dataset.ts'
import { defaultContent, defaultSettings } from '../../src/data/defaults.ts'
import { createSupabaseStore } from '../../src/data/supabaseStore.ts'
import type { Snapshot } from '../../src/data/types.ts'

/** Build-time data for prerendering. See scripts/prerender.ts for the policy. */
export async function loadSnapshot(env: NodeJS.ProcessEnv = process.env): Promise<{ snapshot: Snapshot; note?: string }> {
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY
  if (url && key && env.VITE_DATA_MODE !== 'demo') {
    const store = await createSupabaseStore(createClient(url, key, { auth: { persistSession: false } }))
    const [catalogue, settings, content] = await Promise.all([store.getCatalogue(), store.getSettings(), store.getContent()])
    // demo rows (if installed in the database) are never prerendered: they must not become indexable static pages
    const real = <T extends { isDemo: boolean }>(rows: T[]) => rows.filter((r) => !r.isDemo)
    const generators = real(catalogue.generators)
    const parts = real(catalogue.parts)
    const gIds = new Set(generators.map((g) => g.id))
    const pIds = new Set(parts.map((p) => p.id))
    return {
      snapshot: {
        source: 'supabase',
        mode: 'supabase',
        catalogue: {
          manufacturers: real(catalogue.manufacturers),
          categories: real(catalogue.categories),
          generators,
          parts,
          compat: catalogue.compat.filter((c) => gIds.has(c.generatorId) && pIds.has(c.partId)),
        },
        settings,
        content,
      },
    }
  }
  const d = buildDemoDataset()
  const published = <T extends { status: string }>(rows: T[]) => rows.filter((r) => r.status === 'published')
  const generators = published(d.generators)
  const parts = published(d.parts)
  const gIds = new Set(generators.map((g) => g.id))
  const pIds = new Set(parts.map((p) => p.id))
  return {
    note: 'demo dataset — pages are noindex',
    snapshot: {
      source: 'demo',
      mode: 'demo',
      catalogue: {
        manufacturers: published(d.manufacturers),
        categories: published(d.categories),
        generators,
        parts,
        compat: d.compat.filter((c) => gIds.has(c.generatorId) && pIds.has(c.partId)),
      },
      settings: defaultSettings(),
      content: defaultContent(),
    },
  }
}
