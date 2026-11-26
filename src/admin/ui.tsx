import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { Link, useBlocker, useNavigate } from 'react-router'
import { LOCALES } from '../data/types.ts'
import type { LText, Locale } from '../data/types.ts'
import { IcDown, IcDrag, IcUp } from './icons.tsx'
import { LOCALE_LABEL, filled, move } from './util.ts'

/* ───────────── toasts ───────────── */

interface ToastItem {
  id: number
  kind: 'success' | 'error' | 'info'
  text: string
}
interface ToastApi {
  success(text: string): void
  error(text: string): void
  info(text: string): void
}
const ToastCtx = createContext<ToastApi | null>(null)
export const useToast = () => useContext(ToastCtx)!

/* ───────────── confirm dialog ───────────── */

export interface ConfirmOptions {
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  /** The user must type exactly this text before the confirm button enables (destructive, hard-to-undo actions). */
  typeToConfirm?: string
}
type ConfirmFn = (o: ConfirmOptions) => Promise<boolean>
const ConfirmCtx = createContext<ConfirmFn | null>(null)
export const useConfirm = () => useContext(ConfirmCtx)!

/* ───────────── unsaved-changes guard ───────────── */

interface GuardApi {
  setDirty(v: boolean): void
  isDirty(): boolean
}
const GuardCtx = createContext<GuardApi | null>(null)

/**
 * Registers the form's dirty state. Returns `clear()`, which resets the flag SYNCHRONOUSLY — call it right before an
 * intentional navigation (save → redirect, delete → list) so the router blocker does not stop the app's own navigation.
 * Also warns on tab close / refresh (`beforeunload`).
 */
export function useDirtyGuard(dirty: boolean) {
  const g = useContext(GuardCtx)
  useEffect(() => {
    g?.setDirty(dirty)
    return () => g?.setDirty(false)
  }, [dirty, g])
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])
  return useCallback(() => g?.setDirty(false), [g])
}

/**
 * Blocks EVERY in-app navigation that would leave a dirty form: links, programmatic navigate(), and the browser's
 * Back / Forward buttons (needs a data router — see main.tsx). Staying on the same path (e.g. tab/query changes) is allowed.
 */
function UnsavedChangesPrompt() {
  const guard = useContext(GuardCtx)!
  const confirm = useConfirm()
  const blocker = useBlocker(({ currentLocation, nextLocation }) => guard.isDirty() && currentLocation.pathname !== nextLocation.pathname)
  const ref = useRef(blocker)
  ref.current = blocker
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    void confirm({
      title: 'Saxlanmamış dəyişikliklər',
      message: 'Dəyişikliklər saxlanılmayıb. Bu səhifədən çıxmaq istəyirsiniz?',
      confirmLabel: 'Çıx',
      cancelLabel: 'Qal',
      danger: true,
    }).then((ok) => {
      const b = ref.current
      if (b.state !== 'blocked') return
      if (ok) {
        guard.setDirty(false)
        b.proceed()
      } else b.reset()
    })
  }, [blocker.state, confirm, guard])
  return null
}

/** navigate() — unsaved-changes protection is handled centrally by the router blocker. */
export function useGuardedNavigate() {
  const navigate = useNavigate()
  return useCallback(async (to: string) => void navigate(to), [navigate])
}

export const GuardedLink = Link

/** Open modal dialogs, oldest first. */
const modalStack: HTMLElement[] = []

/**
 * Ask before leaving the admin altogether (logout) while a form has unsaved changes. The router blocker cannot see this:
 * signing out unmounts the form (clearing its dirty flag) before the redirect happens.
 */
export function useConfirmLeave() {
  const guard = useContext(GuardCtx)
  const confirm = useConfirm()
  return useCallback(async () => {
    if (!guard?.isDirty()) return true
    return confirm({
      title: 'Saxlanmamış dəyişikliklər',
      message: 'Dəyişikliklər saxlanılmayıb. Çıxış etsəniz itəcək.',
      confirmLabel: 'Çıx',
      cancelLabel: 'Qal',
      danger: true,
    })
  }, [guard, confirm])
}

/* ───────────── providers ───────────── */

export function UiProviders({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const push = useCallback((kind: ToastItem['kind'], text: string) => {
    const id = ++seq.current
    setToasts((t) => [...t, { id, kind, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 8000 : 4500)
  }, [])
  const toastApi = useMemo<ToastApi>(
    () => ({
      success: (t) => push('success', t),
      error: (t) => push('error', t),
      info: (t) => push('info', t),
    }),
    [push],
  )

  const [pending, setPending] = useState<{ opts: ConfirmOptions; resolve: (v: boolean) => void } | null>(null)
  const [typed, setTyped] = useState('')
  const confirm = useCallback<ConfirmFn>(
    (opts) =>
      new Promise((resolve) => {
        setTyped('')
        setPending({ opts, resolve })
      }),
    [],
  )
  const answer = (v: boolean) => {
    if (v && pending?.opts.typeToConfirm && typed.trim() !== pending.opts.typeToConfirm) return // never confirm without the typed text
    pending?.resolve(v)
    setPending(null)
  }
  const needsTyping = !!pending?.opts.typeToConfirm && typed.trim() !== pending.opts.typeToConfirm

  const dirty = useRef(false)
  const guard = useMemo<GuardApi>(() => ({ setDirty: (v) => (dirty.current = v), isDirty: () => dirty.current }), [])

  return (
    <ToastCtx.Provider value={toastApi}>
      <ConfirmCtx.Provider value={confirm}>
        <GuardCtx.Provider value={guard}>
          {children}
          <UnsavedChangesPrompt />
          <div className="toasts" aria-live="polite" role="status">
            {toasts.map((t) => (
              <div key={t.id} className={`toast toast--${t.kind}`}>
                {t.text}
                <button type="button" className="toast__x" aria-label="Bağla" onClick={() => setToasts((l) => l.filter((x) => x.id !== t.id))}>
                  ×
                </button>
              </div>
            ))}
          </div>
          {pending && (
            <Modal
              title={pending.opts.title}
              onClose={() => answer(false)}
              size="sm"
              footer={
                <>
                  <button type="button" className="btn" onClick={() => answer(false)}>
                    {pending.opts.cancelLabel ?? 'Ləğv et'}
                  </button>
                  <button
                    type="button"
                    className={`btn ${pending.opts.danger ? 'btn--danger' : 'btn--primary'}`}
                    disabled={needsTyping}
                    onClick={() => answer(true)}
                  >
                    {pending.opts.confirmLabel ?? 'Təsdiqlə'}
                  </button>
                </>
              }
            >
              {pending.opts.message && <div className="modal__text">{pending.opts.message}</div>}
              {pending.opts.typeToConfirm && (
                <TextField label={`Təsdiq üçün “${pending.opts.typeToConfirm}” yazın`} value={typed} onChange={setTyped} autoComplete="off" />
              )}
            </Modal>
          )}
        </GuardCtx.Provider>
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  )
}

/* ───────────── modal with focus trap ───────────── */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function Modal({
  title,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const el = ref.current!
    const first = el.querySelector<HTMLElement>('[data-autofocus]') ?? el.querySelector<HTMLElement>(FOCUSABLE) ?? el
    first.focus()
    const onKey = (e: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== el) return // only the TOP dialog reacts (Esc on a confirm must not also close the dialog beneath it)
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current()
      } else if (e.key === 'Tab') {
        const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)]
        if (!items.length) return
        const a = items[0]
        const z = items[items.length - 1]
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault()
          z.focus()
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault()
          a.focus()
        }
      }
    }
    modalStack.push(el)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      modalStack.splice(modalStack.indexOf(el), 1)
      prev?.focus?.()
    }
  }, [])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`modal modal--${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="modal__head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Bağla" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  )
}

/* ───────────── form fields ───────────── */

interface FieldShell {
  label: string
  error?: string
  hint?: ReactNode
  required?: boolean
}

export function Field({ label, error, hint, required, htmlFor, children }: FieldShell & { htmlFor?: string; children: ReactNode }) {
  return (
    <div className={`field${error ? ' field--err' : ''}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required && <span className="req" aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && <p className="hint">{hint}</p>}
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  type = 'text',
  ...rest
}: FieldShell & {
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  inputMode?: 'numeric' | 'decimal' | 'tel' | 'email' | 'text'
  autoComplete?: string
  maxLength?: number
  disabled?: boolean
}) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={id}>
      <input id={id} className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} {...rest} />
    </Field>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  suffix,
}: FieldShell & { value: number | null | undefined; onChange: (v: number | null) => void; suffix?: string }) {
  const id = useId()
  const parse = (s: string): number | null => {
    const t = s.trim().replace(',', '.')
    if (t === '') return null
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }
  const [raw, setRaw] = useState(value == null ? '' : String(value))
  useEffect(() => {
    if (parse(raw) !== (value ?? null)) setRaw(value == null ? '' : String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={id}>
      <div className="input-suffix">
        <input
          id={id}
          className="input"
          inputMode="decimal"
          value={raw}
          aria-invalid={!!error}
          onChange={(e) => {
            setRaw(e.target.value)
            onChange(parse(e.target.value))
          }}
        />
        {suffix && <span>{suffix}</span>}
      </div>
    </Field>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  error,
  hint,
  required,
  empty,
}: FieldShell & {
  value: T | ''
  onChange: (v: T | '') => void
  options: Array<{ value: T; label: string }>
  /** label of the empty option; omit to disallow empty */
  empty?: string
}) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={id}>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value as T | '')} aria-invalid={!!error}>
        {empty !== undefined && <option value="">{empty}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function CheckField({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId()
  return (
    <div className="check">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>
        {label}
        {hint && <span className="hint"> {hint}</span>}
      </label>
    </div>
  )
}

/** Translatable text input with AZ / RU / EN tabs and per-language completeness dots. */
export function LTextField({
  label,
  value,
  onChange,
  multiline,
  rows = 4,
  error,
  hint,
  required,
}: FieldShell & { value: LText; onChange: (v: LText) => void; multiline?: boolean; rows?: number }) {
  const [lang, setLang] = useState<Locale>('az')
  const id = useId()
  const text = value[lang] ?? ''
  const set = (v: string) => onChange({ ...value, [lang]: v })
  const missing = LOCALES.filter((l) => !filled(value, l))
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={id}>
      <div className="ltext">
        <div className="ltext__tabs" role="tablist" aria-label={`${label} — dillər`}>
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={lang === l}
              className={`ltext__tab${lang === l ? ' is-on' : ''}`}
              onClick={() => setLang(l)}
              aria-label={`${LOCALE_LABEL[l]}${filled(value, l) ? '' : ' (boşdur)'}`}
            >
              {LOCALE_LABEL[l]}
              <i className={`dot${filled(value, l) ? ' dot--on' : ''}`} aria-hidden="true" />
            </button>
          ))}
          <span className="ltext__state">{missing.length === 0 ? 'Bütün dillər doldurulub' : `Boş: ${missing.map((m) => LOCALE_LABEL[m]).join(', ')}`}</span>
        </div>
        {multiline ? (
          <textarea id={id} className="input" rows={rows} value={text} onChange={(e) => set(e.target.value)} aria-invalid={!!error} />
        ) : (
          <input id={id} className="input" value={text} onChange={(e) => set(e.target.value)} aria-invalid={!!error} />
        )}
      </div>
    </Field>
  )
}

/* ───────────── buttons / misc ───────────── */

export function ReorderButtons({
  index,
  count,
  onMove,
  label,
}: {
  index: number
  count: number
  onMove: (to: number) => void
  label: string
}) {
  return (
    <span className="reorder">
      <button type="button" className="icon-btn" aria-label={`Yuxarı daşı: ${label}`} disabled={index === 0} onClick={() => onMove(index - 1)}>
        <IcUp />
      </button>
      <button type="button" className="icon-btn" aria-label={`Aşağı daşı: ${label}`} disabled={index === count - 1} onClick={() => onMove(index + 1)}>
        <IcDown />
      </button>
    </span>
  )
}

export function PageHeader({ title, sub, actions, back }: { title: string; sub?: ReactNode; actions?: ReactNode; back?: { to: string; label: string } }) {
  return (
    <header className="page-head">
      <div>
        {back && (
          <GuardedLink to={back.to} className="back">
            ← {back.label}
          </GuardedLink>
        )}
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </header>
  )
}

export function Card({ title, children, actions, id }: { title?: string; children: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <section className="card" id={id}>
      {(title || actions) && (
        <div className="card__head">
          {title && <h2>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'ok' | 'warn' | 'info' | 'off'; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}

export const StatusBadge = ({ status }: { status: 'published' | 'draft' }) =>
  status === 'published' ? <Badge tone="ok">Dərc olunub</Badge> : <Badge tone="warn">Qaralama</Badge>

export function DemoBadge() {
  return <Badge tone="info">Demo</Badge>
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}

export function Spinner({ label = 'Yüklənir…' }: { label?: string }) {
  return (
    <p className="loading" role="status">
      {label}
    </p>
  )
}

export function Thumb({ src, alt = '', size = 44 }: { src?: string; alt?: string; size?: number }) {
  return src ? (
    <img className="thumb" src={src} alt={alt} width={size} height={size} loading="lazy" />
  ) : (
    <span className="thumb thumb--empty" style={{ width: size, height: size }} aria-hidden="true" />
  )
}

/* ───────────── data table (cards on mobile) ───────────── */

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  rowLabel,
  onReorder,
  empty = 'Qeyd tapılmadı.',
}: {
  rows: T[]
  columns: Column<T>[]
  rowLabel: (row: T) => string
  /** When set, rows can be reordered by drag-and-drop or with the up/down buttons. */
  onReorder?: (orderedIds: string[]) => void
  empty?: ReactNode
}) {
  const dragId = useRef<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  if (rows.length === 0) return <Empty>{empty}</Empty>
  const reorderTo = (from: number, to: number) => onReorder?.(move(rows, from, to).map((r) => r.id))
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {onReorder && <th className="col-order">Sıra</th>}
            {columns.map((c) => (
              <th key={c.key} className={c.className}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id}
              className={overId === row.id ? 'is-over' : undefined}
              draggable={!!onReorder}
              onDragStart={(e) => {
                dragId.current = row.id
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', row.id)
              }}
              onDragOver={(e) => {
                if (!onReorder || !dragId.current) return
                e.preventDefault()
                setOverId(row.id)
              }}
              onDragLeave={() => setOverId((o) => (o === row.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault()
                const from = rows.findIndex((r) => r.id === dragId.current)
                dragId.current = null
                setOverId(null)
                if (from >= 0) reorderTo(from, i)
              }}
              onDragEnd={() => {
                dragId.current = null
                setOverId(null)
              }}
            >
              {onReorder && (
                <td data-label="Sıra" className="col-order">
                  <span className="drag" aria-hidden="true" title="Sürüşdürərək daşıyın">
                    <IcDrag />
                  </span>
                  <ReorderButtons index={i} count={rows.length} onMove={(to) => reorderTo(i, to)} label={rowLabel(row)} />
                </td>
              )}
              {columns.map((c) => (
                <td key={c.key} data-label={c.header} className={c.className}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Simple tab bar. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  badges,
}: {
  tabs: Array<{ id: T; label: string }>
  value: T
  onChange: (v: T) => void
  badges?: Partial<Record<T, number>>
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          className={`tabs__tab${value === t.id ? ' is-on' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {!!badges?.[t.id] && <span className="tabs__badge" aria-label={`${badges[t.id]} xəta`}>{badges[t.id]}</span>}
        </button>
      ))}
    </div>
  )
}

/** List of simple LText entries (advantages, applications, paragraphs). */
export function LTextListEditor({
  label,
  items,
  onChange,
  addLabel,
  multiline,
}: {
  label: string
  items: LText[]
  onChange: (v: LText[]) => void
  addLabel: string
  multiline?: boolean
}) {
  return (
    <div className="list-editor">
      <h3>{label}</h3>
      {items.length === 0 && <p className="hint">Hələ əlavə edilməyib.</p>}
      {items.map((it, i) => (
        <div className="list-editor__row" key={i}>
          <div className="list-editor__main">
            <LTextField
              label={`${label} #${i + 1}`}
              value={it}
              multiline={multiline}
              rows={3}
              onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))}
            />
          </div>
          <div className="list-editor__side">
            <ReorderButtons index={i} count={items.length} onMove={(to) => onChange(move(items, i, to))} label={`${label} #${i + 1}`} />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              Sil
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn--sm" onClick={() => onChange([...items, {}])}>
        + {addLabel}
      </button>
    </div>
  )
}
