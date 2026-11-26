import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { getStore } from '../data/index.ts'
import type { AuthUser, Store } from '../data/store.ts'
import type {
  Category,
  Compat,
  Generator,
  ImageRef,
  Inquiry,
  Manufacturer,
  MediaItem,
  Part,
  Settings,
  SiteContent,
} from '../data/types.ts'
import { Spinner } from './ui.tsx'
import { errMsg } from './util.ts'

/* ───────────── store ───────────── */

const StoreCtx = createContext<Store | null>(null)
export const useStore = () => useContext(StoreCtx)!

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    getStore().then(
      (s) => live && setStore(s),
      (e) => live && setError(errMsg(e)),
    )
    return () => {
      live = false
    }
  }, [])
  if (error) return <p className="boot-msg">Verilənlər bazasına qoşulmaq alınmadı: {error}</p>
  if (!store) return <Spinner />
  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>
}

/* ───────────── auth ───────────── */

interface AuthValue {
  user: AuthUser | null
  /** undefined while the session is still being checked */
  ready: boolean
}
const AuthCtx = createContext<AuthValue>({ user: null, ready: false })
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useStore()
  const [state, setState] = useState<AuthValue>({ user: null, ready: false })
  useEffect(() => {
    let live = true
    store.auth.getSession().then(
      (u) => live && setState({ user: u, ready: true }),
      () => live && setState({ user: null, ready: true }),
    )
    const off = store.auth.onChange((u) => live && setState({ user: u, ready: true }))
    return () => {
      live = false
      off()
    }
  }, [store])
  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>
}

/* ───────────── admin data (all lists in memory; catalogues are small) ───────────── */

export interface AdminData {
  manufacturers: Manufacturer[]
  categories: Category[]
  generators: Generator[]
  parts: Part[]
  media: MediaItem[]
  inquiries: Inquiry[]
  compat: Compat[]
  settings: Settings | null
  content: SiteContent | null
  loading: boolean
  error: string
  reload: () => Promise<void>
}

const empty: AdminData = {
  manufacturers: [],
  categories: [],
  generators: [],
  parts: [],
  media: [],
  inquiries: [],
  compat: [],
  settings: null,
  content: null,
  loading: true,
  error: '',
  reload: async () => {},
}
const DataCtx = createContext<AdminData>(empty)
export const useAdminData = () => useContext(DataCtx)

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const store = useStore()
  const [data, setData] = useState<Omit<AdminData, 'reload'>>(() => {
    const { reload: _r, ...rest } = empty
    void _r
    return rest
  })
  const live = useRef(true)
  const seq = useRef(0)

  const reload = useCallback(async () => {
    const mine = ++seq.current // overlapping reloads: only the newest response may be applied
    try {
      const [manufacturers, categories, generators, parts, media, inquiries, compat, settings, content] = await Promise.all([
        store.list('manufacturers'),
        store.list('categories'),
        store.list('generators'),
        store.list('parts'),
        store.list('media'),
        store.list('inquiries'),
        store.getCompat(),
        store.getSettings(),
        store.getContent(),
      ])
      if (!live.current || mine !== seq.current) return
      setData({
        manufacturers: manufacturers.sort((a, b) => a.sortOrder - b.sortOrder),
        categories: categories.sort((a, b) => a.sortOrder - b.sortOrder),
        generators,
        parts,
        media,
        inquiries,
        compat,
        settings,
        content,
        loading: false,
        error: '',
      })
    } catch (e) {
      // a failed RE-load must not replace an open form with an error card (and lose its unsaved state): keep the data we have
      if (live.current && mine === seq.current) setData((d) => ({ ...d, loading: false, error: d.manufacturers.length || d.settings ? d.error : errMsg(e) }))
    }
  }, [store])

  useEffect(() => {
    live.current = true
    void reload()
    return () => {
      live.current = false
    }
  }, [reload])

  // demo mode: another tab of this browser changed the data → refresh what this tab lists (saves still conflict-check)
  useEffect(() => store.onExternalChange?.(() => void reload()), [store, reload])

  const value = useMemo(() => ({ ...data, reload }), [data, reload])
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}

/* ───────────── media usage ───────────── */

export interface MediaUsage {
  where: string
}

export function computeMediaUsage(d: AdminData): Map<string, MediaUsage[]> {
  const map = new Map<string, MediaUsage[]>()
  const byUrl = new Map(d.media.map((m) => [m.url, m.id]))
  const add = (img: ImageRef | undefined, where: string) => {
    if (!img) return
    const id = img.mediaId ?? byUrl.get(img.url)
    if (!id) return
    ;(map.get(id) ?? map.set(id, []).get(id)!).push({ where })
  }
  d.manufacturers.forEach((m) => (add(m.logo, `İstehsalçı: ${m.name} (loqo)`), add(m.cover, `İstehsalçı: ${m.name} (üz qabığı)`)))
  d.generators.forEach((g) => g.images.forEach((i) => add(i, `Generator: ${g.model}`)))
  d.parts.forEach((p) => p.images.forEach((i) => add(i, `Hissə: ${p.oemCode}`)))
  add(d.settings?.logo, 'Tənzimləmələr: loqo')
  add(d.content?.hero.image, 'Sayt məzmunu: ana səhifə şəkli')
  add(d.content?.about.image, 'Sayt məzmunu: haqqımızda şəkli')
  return map
}
