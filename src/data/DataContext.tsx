import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getStore } from './index.ts'
import { defaultContent, defaultSettings } from './defaults.ts'
import { indexCatalogue } from './queries.ts'
import type { CatalogueIndex } from './queries.ts'
import type { Catalogue, DataMode, Settings, SiteContent, Snapshot } from './types.ts'

export type DataStatus = 'loading' | 'ready' | 'error'

interface DataValue {
  status: DataStatus
  mode: DataMode
  catalogue: Catalogue
  index: CatalogueIndex
  settings: Settings
  content: SiteContent
  reload: () => void
}

const emptyCatalogue: Catalogue = { manufacturers: [], categories: [], generators: [], parts: [], compat: [] }
const emptyIndex = indexCatalogue(emptyCatalogue)
const Ctx = createContext<DataValue | null>(null)

/**
 * Loads the public (published-only) catalogue, settings and site content once per session.
 * With `initial` (build-time snapshot, used by prerendering and hydration) the first render is already complete and the
 * live data is fetched in the background (stale-while-revalidate).
 */
export function DataProvider({ children, initial }: { children: ReactNode; initial?: Snapshot }) {
  const [status, setStatus] = useState<DataStatus>(initial ? 'ready' : 'loading')
  const [mode, setMode] = useState<DataMode>(initial?.mode ?? 'demo')
  const [catalogue, setCatalogue] = useState<Catalogue>(initial?.catalogue ?? emptyCatalogue)
  const [settings, setSettings] = useState<Settings>(initial?.settings ?? defaultSettings())
  const [content, setContent] = useState<SiteContent>(initial?.content ?? defaultContent())
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    if (!initial) setStatus('loading')
    ;(async () => {
      try {
        const store = await getStore()
        const [c, s, ct] = await Promise.all([store.getCatalogue(), store.getSettings(), store.getContent()])
        if (!alive) return
        setMode(store.mode)
        setCatalogue(c)
        setSettings(s)
        setContent(ct)
        setStatus('ready')
      } catch (e) {
        console.error('[data] failed to load', e)
        if (alive && !initial) setStatus('error')
      }
    })()
    return () => {
      alive = false
    }
    // `initial` is a build-time constant for the lifetime of the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  // demo mode: another tab (e.g. the admin) changed the browser-local data → refresh what this tab shows
  useEffect(() => {
    let off: (() => void) | undefined
    void getStore().then((store) => {
      off = store.onExternalChange?.(() => setNonce((n) => n + 1))
    })
    return () => off?.()
  }, [])
  const index = useMemo(() => indexCatalogue(catalogue), [catalogue])
  const value = useMemo(
    () => ({ status, mode, catalogue, index: status === 'ready' ? index : emptyIndex, settings, content, reload }),
    [status, mode, catalogue, index, settings, content, reload],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData(): DataValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useData must be used inside <DataProvider>')
  return v
}
