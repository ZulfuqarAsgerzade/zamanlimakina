import type { DemoToolsPolicy } from './demoPolicy.ts'
import type {
  Catalogue,
  Compat,
  DataMode,
  EntityMap,
  EntityName,
  Inquiry,
  Locale,
  MediaItem,
  Settings,
  SiteContent,
} from './types.ts'

export interface AuthUser {
  id: string
  email: string
}

export interface AuthApi {
  getSession(): Promise<AuthUser | null>
  /** Subscribe to sign-in / sign-out. Returns an unsubscribe function. */
  onChange(cb: (user: AuthUser | null) => void): () => void
  signIn(email: string, password: string): Promise<AuthUser>
  signOut(): Promise<void>
  /** Invalidate every other session of this account (Supabase). No-op in local demo mode. */
  signOutOthers(): Promise<void>
  /** `current` is required by the local demo store; Supabase re-authenticates through the session. */
  changePassword(next: string, current?: string): Promise<void>
  /** Demo mode only: no admin exists yet, so the first visit creates one (no default credentials). */
  needsSetup(): Promise<boolean>
  setup(email: string, password: string): Promise<AuthUser>
}

export interface InquiryInput {
  name: string
  phone: string
  product: string
  message: string
  locale: Locale
}

export interface DemoReport {
  added: number
  removed: number
  /** Real records that referenced demo records and were detached (never deleted). */
  detached: number
  /** Rows flagged is_demo that do NOT carry a dataset id: left untouched because they are not provably demo data. */
  skipped?: number
}

/** Thrown when a record was changed (or deleted) by someone else since the editor loaded it. */
export class ConflictError extends Error {
  constructor(message = 'Bu qeyd başqa yerdə dəyişdirilib və ya silinib. Səhifəni yeniləyin və dəyişikliyi yenidən edin — əks halda başqasının işi üzərinə yazılar.') {
    super(message)
    this.name = 'ConflictError'
  }
}

/** Thrown when a delete would orphan records that still reference the target. */
export class InUseError extends Error {
  usedBy: Partial<Record<EntityName, number>>
  constructor(message: string, usedBy: Partial<Record<EntityName, number>>) {
    super(message)
    this.name = 'InUseError'
    this.usedBy = usedBy
  }
}

export interface Store {
  readonly mode: DataMode
  /** What the demo tools may do against THIS backend (see demoPolicy.ts). Stores also enforce it, not only the UI. */
  readonly demoTools: DemoToolsPolicy
  readonly auth: AuthApi
  /** Demo store only: where data lives. 'memory' means it will be lost on reload (storage blocked / private window). */
  readonly persistence?: 'indexeddb' | 'memory'
  /** Demo store only: fires when another tab of this browser changed the demo data. */
  onExternalChange?(cb: () => void): () => void

  /* ───────── public reads ───────── */
  /** Published records only unless `includeDrafts` is set AND the caller is a signed-in admin. */
  getCatalogue(opts?: { includeDrafts?: boolean }): Promise<Catalogue>
  getSettings(): Promise<Settings>
  getContent(): Promise<SiteContent>
  submitInquiry(input: InquiryInput): Promise<void>

  /* ───────── admin (require a session; RLS enforces this server-side in Supabase mode) ───────── */
  list<E extends EntityName>(entity: E): Promise<EntityMap[E][]>
  /** Validates (throws ValidationError), stamps updatedAt, upserts. */
  save<E extends EntityName>(entity: E, record: EntityMap[E]): Promise<EntityMap[E]>
  /** Throws InUseError when other records still reference the target. */
  remove(entity: EntityName, id: string): Promise<void>
  reorder(entity: 'manufacturers' | 'categories', orderedIds: string[]): Promise<void>
  getCompat(): Promise<Compat[]>
  setPartGenerators(partId: string, generatorIds: string[]): Promise<void>
  setGeneratorParts(generatorId: string, partIds: string[]): Promise<void>
  saveSettings(settings: Settings): Promise<Settings>
  saveContent(content: SiteContent): Promise<SiteContent>

  /* ───────── media ───────── */
  uploadImage(file: File): Promise<MediaItem>
  /** Replace the file behind a media item; every reference to it picks up the new image. */
  replaceImage(id: string, file: File): Promise<MediaItem>
  deleteMedia(id: string): Promise<void>

  /* ───────── demo data ───────── */
  installDemo(): Promise<DemoReport>
  removeDemo(): Promise<DemoReport>
}

export type { Inquiry }
