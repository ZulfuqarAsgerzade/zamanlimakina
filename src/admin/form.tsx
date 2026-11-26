import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ConflictError, InUseError } from '../data/store.ts'
import { validateEntity } from '../data/schema.ts'
import type { FieldErrors } from '../data/schema.ts'
import type { EntityMap, EntityName } from '../data/types.ts'
import { useAdminData, useStore } from './ctx.tsx'
import { useConfirm, useDirtyGuard, useToast } from './ui.tsx'
import { errMsg, toFieldErrors } from './util.ts'

interface Options {
  /** e.g. '/admin/manufacturers' */
  listPath: string
  /** noun used in confirm / toast messages, e.g. 'istehsalçı' */
  noun: string
  isNew: boolean
  /** Dirty state that lives outside the record (e.g. compatibility selection). */
  extraDirty?: boolean
}

/** Shared create/edit behaviour: validation errors, dirty guard, save, delete (with InUse handling). */
export function useEntityForm<E extends EntityName>(entity: E, initial: EntityMap[E], opts: Options) {
  type T = EntityMap[E]
  const store = useStore()
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const { reload } = useAdminData()

  const [rec, setRec] = useState<T>(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  // Dirty state is DERIVED (current value vs last saved value). It used to be set from inside a setState updater, which React may
  // re-run later against a newer baseline — leaving the form stuck "dirty" after a save under load.
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial))
  const dirty = useMemo(() => JSON.stringify(rec) !== baseline, [rec, baseline])
  const recRef = useRef(rec)
  recRef.current = rec
  const savingRef = useRef(false)
  const hasErrors = useRef(false)
  hasErrors.current = Object.keys(errors).length > 0

  const clearGuard = useDirtyGuard(dirty || !!opts.extraDirty)

  // After a failed save, keep the error list in sync while the editor fixes fields (no stale messages)
  useEffect(() => {
    if (!hasErrors.current) return
    const v = validateEntity(entity, rec)
    setErrors(v.ok ? {} : v.errors)
  }, [rec, entity])

  const update = useCallback((next: T | ((r: T) => T)) => {
    setRec((r) => (typeof next === 'function' ? (next as (r: T) => T)(r) : next))
  }, [])
  const patch = useCallback((p: Partial<T>) => update((r) => ({ ...r, ...p })), [update])

  /**
   * Save the record; `after` runs with the stored record before the lists are reloaded.
   *
   * VERSIONED: the exact version sent is captured up front. Whatever the user types while the request is in flight is NOT
   * overwritten by the stored copy: only the submitted version becomes the new "saved" baseline, the newer edits stay in the form
   * (adopting just the new version stamp so the next save is not flagged as a conflict), and the form stays dirty.
   * `stale` lets a page report newer edits to state that lives outside the record (e.g. the compatibility selection).
   */
  async function save(after?: (saved: T) => Promise<void>, hooks?: { stale?: () => boolean }): Promise<T | null> {
    if (savingRef.current) return null // double-click / double Enter protection
    savingRef.current = true
    setSaving(true)
    setErrors({})
    const submitted = recRef.current
    const submittedJson = JSON.stringify(submitted)
    try {
      const saved = (await store.save(entity, submitted)) as T
      if (after) await after(saved)
      await reload()
      const editedMeanwhile = JSON.stringify(recRef.current) !== submittedJson || !!hooks?.stale?.()
      setBaseline(JSON.stringify(saved))
      if (JSON.stringify(recRef.current) === submittedJson) setRec(saved)
      else setRec((cur) => ({ ...cur, createdAt: saved.createdAt, updatedAt: saved.updatedAt }))
      if (editedMeanwhile) {
        toast.success('Göndərilən dəyişikliklər saxlanıldı. Saxlama zamanı etdiyiniz yeni dəyişikliklər hələ saxlanılmayıb.')
      } else {
        toast.success('Dəyişikliklər saxlanıldı.')
        clearGuard() // intentional redirect after saving must not be blocked
        if (opts.isNew) navigate(`${opts.listPath}/${saved.id}`, { replace: true })
      }
      return saved
    } catch (e) {
      const fe = toFieldErrors(e)
      if (fe) {
        setErrors(fe)
        toast.error('Formda xətalar var. Qırmızı sahələri yoxlayın.')
      } else {
        toast.error(errMsg(e))
        if (e instanceof ConflictError) void reload() // show the current stored version in the lists
      }
      return null
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  async function remove(extra?: string) {
    const ok = await confirm({
      title: `Bu ${opts.noun} silinsin?`,
      message: extra ?? 'Bu əməliyyat geri qaytarılmır.',
      confirmLabel: 'Sil',
      danger: true,
    })
    if (!ok) return false
    try {
      await store.remove(entity, recRef.current.id)
      await reload()
      clearGuard()
      toast.success('Silindi.')
      navigate(opts.listPath, { replace: true })
      return true
    } catch (e) {
      toast.error(e instanceof InUseError ? e.message : errMsg(e))
      return false
    }
  }

  return { rec, update, patch, errors, setErrors, saving, dirty, save, remove }
}

export function ErrorSummary({ errors }: { errors: FieldErrors }) {
  const msgs = [...new Set(Object.values(errors))]
  if (msgs.length === 0) return null
  return (
    <div className="alert alert--err" role="alert">
      <strong>Xətalar:</strong>
      <ul>
        {msgs.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  )
}

/** Status line shown in every form bar: progress while saving, then dirty / clean. */
export const formStateText = (saving: boolean, dirty: boolean, isNew = false) =>
  saving ? 'Saxlanılır…' : dirty ? 'Saxlanmamış dəyişikliklər var' : isNew ? 'Yeni qeyd' : 'Bütün dəyişikliklər saxlanılıb'

export function FormBar({
  saving,
  dirty,
  isNew,
  onCancel,
  onDelete,
  extra,
}: {
  saving: boolean
  dirty: boolean
  isNew: boolean
  onCancel: () => void
  onDelete?: () => void
  extra?: ReactNode
}) {
  return (
    <div className="formbar">
      <div className="formbar__state" role="status" aria-live="polite">
        {formStateText(saving, dirty, isNew)}
      </div>
      <div className="formbar__actions">
        {onDelete && !isNew && (
          <button type="button" className="btn btn--danger-ghost" onClick={onDelete}>
            Sil
          </button>
        )}
        {extra}
        <button type="button" className="btn" onClick={onCancel}>
          Geri
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saxlanılır…' : 'Saxla'}
        </button>
      </div>
    </div>
  )
}

/** Form for a singleton document (settings, site content). */
export function useDocForm<T>(initial: T, saveFn: (v: T) => Promise<T>, extraValidate?: (v: T) => FieldErrors) {
  const toast = useToast()
  const [value, setValue] = useState<T>(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial))
  const dirty = useMemo(() => JSON.stringify(value) !== baseline, [value, baseline])
  const ref = useRef(value)
  ref.current = value
  useDirtyGuard(dirty)

  const update = useCallback((fn: (v: T) => T) => setValue((v) => fn(v)), [])

  const submitting = useRef(false)
  async function submit(): Promise<boolean> {
    if (submitting.current) return false // double-click protection
    setErrors({})
    const extra = extraValidate?.(ref.current) ?? {}
    if (Object.keys(extra).length) {
      setErrors(extra)
      toast.error('Formda xətalar var.')
      return false
    }
    submitting.current = true
    setSaving(true)
    // versioned, like the record forms: only the submitted version becomes "saved"; edits made meanwhile are kept (and stay dirty)
    const submitted = ref.current
    const submittedJson = JSON.stringify(submitted)
    try {
      const saved = await saveFn(submitted)
      const editedMeanwhile = JSON.stringify(ref.current) !== submittedJson
      setBaseline(JSON.stringify(saved))
      if (!editedMeanwhile) setValue(saved)
      toast.success(
        editedMeanwhile
          ? 'Göndərilən dəyişikliklər saxlanıldı. Saxlama zamanı etdiyiniz yeni dəyişikliklər hələ saxlanılmayıb.'
          : 'Dəyişikliklər saxlanıldı.',
      )
      return true
    } catch (e) {
      const fe = toFieldErrors(e)
      if (fe) {
        setErrors(fe)
        toast.error('Formda xətalar var.')
      } else toast.error(errMsg(e))
      return false
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }
  return { value, update, errors, saving, dirty, submit }
}
