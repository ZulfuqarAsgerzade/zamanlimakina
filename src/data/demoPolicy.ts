import type { DataMode } from './types.ts'

/**
 * Which demo tools the admin panel / store may run. Pure and env-injectable so it can be unit-tested.
 *
 *  - local demo mode (browser IndexedDB): install and remove are always fine — nothing but the visitor's own browser is touched.
 *  - Supabase mode (a real database): INSTALL is disabled unless the build sets `VITE_ALLOW_DEMO_TOOLS=true`, which the
 *    production build refuses (see vite.config.ts). REMOVE stays available as the clean-up path for leftover demo rows; it is
 *    restricted to rows that carry the demo flag AND a dataset id (see `demoIdSets`) and needs a typed confirmation.
 */
export interface DemoToolsPolicy {
  install: boolean
  remove: boolean
  /** Shown instead of the install button when it is disabled. */
  installBlockedReason?: string
}

export const INSTALL_BLOCKED_REASON =
  'Bu sayt real Supabase layihəsinə qoşulub — demo məlumat yükləmək söndürülüb ki, real verilənlər bazasına test qeydləri düşməsin.'

export function demoToolsPolicy(mode: DataMode, env: { VITE_ALLOW_DEMO_TOOLS?: string } = {}): DemoToolsPolicy {
  if (mode === 'demo') return { install: true, remove: true }
  const allowed = env.VITE_ALLOW_DEMO_TOOLS === 'true'
  return allowed ? { install: true, remove: true } : { install: false, remove: true, installBlockedReason: INSTALL_BLOCKED_REASON }
}

/** Text the admin must type to confirm removing demo data from a real (Supabase) database. */
export const REMOVE_CONFIRM_WORD = 'DEMO SİL'
