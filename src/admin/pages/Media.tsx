import { useCallback, useMemo, useRef, useState } from 'react'
import type { MediaItem } from '../../data/types.ts'
import { computeMediaUsage, useAdminData, useStore } from '../ctx.tsx'
import { mediaMeta, useUploader } from '../editors.tsx'
import { IcUpload } from '../icons.tsx'
import { Badge, CheckField, DemoBadge, LTextField, Modal, PageHeader, useConfirm, useDirtyGuard, useToast } from '../ui.tsx'
import { errMsg, searchMatch } from '../util.ts'

export function MediaPage() {
  const d = useAdminData()
  const store = useStore()
  const toast = useToast()
  const confirm = useConfirm()
  const { upload, busy, uploading } = useUploader()
  const [q, setQ] = useState('')
  const [unused, setUnused] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const usage = useMemo(() => computeMediaUsage(d), [d])

  const list = d.media.filter((m) => searchMatch([m.name], q) && (!unused || !usage.get(m.id)?.length))
  const unusedAll = d.media.filter((m) => !usage.get(m.id)?.length)
  const open = d.media.find((m) => m.id === openId) ?? null

  async function purgeUnused() {
    if (
      !(await confirm({
        title: 'İstifadə olunmayan şəkillər silinsin?',
        message: `${unusedAll.length} şəkil heç bir yerdə istifadə olunmur və silinəcək. Bu əməliyyat geri qaytarılmır.`,
        confirmLabel: 'Sil',
        danger: true,
      }))
    )
      return
    let n = 0
    for (const m of unusedAll) {
      try {
        await store.deleteMedia(m.id)
        n++
      } catch (e) {
        toast.error(errMsg(e))
      }
    }
    await d.reload()
    toast.success(`${n} şəkil silindi.`)
  }

  return (
    <>
      <PageHeader
        title="Media kitabxanası"
        sub={`${d.media.length} şəkil · ${unusedAll.length} istifadə olunmayan`}
        actions={
          <>
            <button type="button" className="btn btn--danger-ghost" disabled={unusedAll.length === 0} onClick={purgeUnused}>
              İstifadə olunmayanları sil
            </button>
            <button type="button" className="btn btn--primary" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <IcUpload /> {uploading ? 'Yüklənir…' : 'Şəkil yüklə'}
            </button>
            <input
              ref={fileRef}
              type="file"
              hidden
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              aria-label="Şəkil faylları seç"
              onChange={async (e) => {
                const files = [...(e.target.files ?? [])]
                e.target.value = ''
                const done = await upload(files)
                if (done.length) toast.success(`${done.length} şəkil yükləndi.`)
              }}
            />
          </>
        }
      />
      {busy.length > 0 && (
        <div className="alert" role="status">
          Yüklənir: {busy.join(', ')}
        </div>
      )}
      <p className="hint">Yüklənən şəkillər avtomatik WebP formatına (maks. 1600 px) və kiçik önizləməyə çevrilir. Yalnız JPG, PNG, WebP, AVIF qəbul edilir.</p>
      <div className="toolbar">
        <input className="input" placeholder="Fayl adı üzrə axtar…" aria-label="Media axtar" value={q} onChange={(e) => setQ(e.target.value)} />
        <CheckField label="Yalnız istifadə olunmayanlar" checked={unused} onChange={setUnused} />
      </div>
      {list.length === 0 ? (
        <p className="empty">Şəkil tapılmadı.</p>
      ) : (
        <ul className="media-grid">
          {list.map((m) => {
            const n = usage.get(m.id)?.length ?? 0
            return (
              <li key={m.id}>
                <button type="button" className="media-tile" onClick={() => setOpenId(m.id)} aria-label={`Aç: ${m.name}`}>
                  <img src={m.thumbUrl ?? m.url} alt="" loading="lazy" />
                  <span className="media-tile__name">{m.name}</span>
                  <span className="media-tile__meta">
                    {n > 0 ? <Badge tone="ok">{n} yerdə</Badge> : <Badge tone="warn">İstifadə olunmur</Badge>}
                    {m.isDemo && <DemoBadge />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {open && <MediaDetail item={open} uses={usage.get(open.id) ?? []} onClose={() => setOpenId(null)} />}
    </>
  )
}

function MediaDetail({ item, uses, onClose }: { item: MediaItem; uses: Array<{ where: string }>; onClose: () => void }) {
  const store = useStore()
  const d = useAdminData()
  const toast = useToast()
  const confirm = useConfirm()
  const [alt, setAlt] = useState(item.alt)
  // the version of the alt text that is stored; "dirty" is always derived, never toggled by hand
  const [baseline, setBaseline] = useState(() => JSON.stringify(item.alt))
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const altRef = useRef(alt)
  altRef.current = alt
  const replaceRef = useRef<HTMLInputElement>(null)
  const dirty = JSON.stringify(alt) !== baseline
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  // blocks in-app navigation (links, Back/Forward) and tab close while the alt text is unsaved
  const clearGuard = useDirtyGuard(dirty)

  /** Every way of dismissing the dialog (Bağla, ✕, backdrop, Esc) goes through here. */
  const requestClose = useCallback(async () => {
    if (dirtyRef.current) {
      const leave = await confirm({
        title: 'Saxlanmamış dəyişikliklər',
        message: 'Alt mətndə saxlanmamış dəyişikliklər var. Dialoqu bağlasanız itəcək.',
        confirmLabel: 'Bağla, itir',
        cancelLabel: 'Qal',
        danger: true,
      })
      if (!leave) return
    }
    clearGuard()
    onClose()
  }, [confirm, clearGuard, onClose])

  async function saveAlt() {
    if (savingRef.current) return // no duplicate submissions
    savingRef.current = true
    setSaving(true)
    setBusy(true)
    const submitted = altRef.current
    try {
      await store.save('media', { ...item, alt: submitted })
      await d.reload()
      // only the submitted version is now saved; anything typed while the request was running stays unsaved
      setBaseline(JSON.stringify(submitted))
      const editedMeanwhile = JSON.stringify(altRef.current) !== JSON.stringify(submitted)
      toast.success(editedMeanwhile ? 'Göndərilən alt mətn saxlanıldı. Saxlama zamanı etdiyiniz yeni dəyişikliklər hələ saxlanılmayıb.' : 'Alt mətn saxlanıldı.')
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      savingRef.current = false
      setSaving(false)
      setBusy(false)
    }
  }
  async function replace(file: File) {
    setBusy(true)
    try {
      await store.replaceImage(item.id, file)
      await d.reload()
      toast.success('Şəkil əvəz olundu. Onu istifadə edən bütün yerlər yeniləndi.')
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }
  async function del() {
    const ok = await confirm({
      title: `“${item.name}” silinsin?`,
      message: uses.length
        ? `Diqqət: bu şəkil ${uses.length} yerdə istifadə olunur. Silsəniz, həmin yerlərdə şəkil kitabxanada tapılmayacaq (ünvan qalsa da, fayl itə bilər).`
        : 'Bu şəkil heç bir yerdə istifadə olunmur. Bu əməliyyat geri qaytarılmır.',
      confirmLabel: 'Sil',
      danger: true,
    })
    if (!ok) return
    try {
      await store.deleteMedia(item.id)
      await d.reload()
      toast.success('Şəkil silindi.')
      clearGuard()
      onClose()
    } catch (e) {
      toast.error(errMsg(e))
    }
  }

  return (
    <Modal
      title={item.name}
      size="lg"
      onClose={() => void requestClose()}
      footer={
        <>
          <button type="button" className="btn btn--danger-ghost" onClick={del}>
            Sil
          </button>
          <button type="button" className="btn" onClick={() => void requestClose()}>
            Bağla
          </button>
        </>
      }
    >
      <div className="media-detail">
        <div className="media-detail__preview">
          <img src={item.url} alt={item.alt.az || item.name} />
        </div>
        <div className="media-detail__side">
          <p className="hint">{mediaMeta(item) || '—'}</p>
          <h3>İstifadə olunduğu yerlər</h3>
          {uses.length === 0 ? (
            <p className="hint">Heç bir yerdə istifadə olunmur.</p>
          ) : (
            <ul className="plain">
              {uses.map((u, i) => (
                <li key={i}>{u.where}</li>
              ))}
            </ul>
          )}
          <LTextField label="Alt mətn" value={alt} onChange={setAlt} />
          <div className="row-actions">
            <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={saveAlt}>
              {saving ? 'Saxlanılır…' : 'Alt mətni saxla'}
            </button>
            <span className="hint" role="status" aria-live="polite">
              {saving ? '' : dirty ? 'Saxlanmamış dəyişikliklər var' : ''}
            </span>
            <button type="button" className="btn btn--sm" disabled={busy} onClick={() => replaceRef.current?.click()}>
              Faylı əvəz et
            </button>
            <input
              ref={replaceRef}
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp,image/avif"
              aria-label="Əvəzedici fayl"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void replace(f)
              }}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
