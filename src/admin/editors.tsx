import { useMemo, useRef, useState } from 'react'
import { newId } from '../lib/ids.ts'
import { SPEC_GROUP_TITLES, SPEC_PRESETS } from '../data/specPresets.ts'
import type { SpecPreset } from '../data/specPresets.ts'
import type { Currency, ImageRef, LText, MediaItem, Price, PriceType, SpecGroup, SpecItem } from '../data/types.ts'
import { useAdminData, useStore } from './ctx.tsx'
import { IcUpload } from './icons.tsx'
import { imageFromMedia } from './records.ts'
import {
  CheckField,
  Field,
  LTextField,
  Modal,
  NumberField,
  ReorderButtons,
  SelectField,
  TextField,
  Thumb,
  useToast,
} from './ui.tsx'
import { errMsg, fmtBytes, move, pickAz } from './util.ts'

/* ───────────── uploads ───────────── */

export function useUploader() {
  const store = useStore()
  const { reload } = useAdminData()
  const toast = useToast()
  const [busy, setBusy] = useState<string[]>([])

  /** Upload files one by one; returns the successfully stored media items. */
  async function upload(files: File[]): Promise<MediaItem[]> {
    const done: MediaItem[] = []
    setBusy(files.map((f) => f.name))
    for (const f of files) {
      try {
        done.push(await store.uploadImage(f))
        setBusy((b) => b.filter((n) => n !== f.name))
      } catch (e) {
        setBusy((b) => b.filter((n) => n !== f.name))
        toast.error(`${f.name}: ${errMsg(e)}`)
      }
    }
    if (done.length) await reload()
    return done
  }
  return { upload, busy, uploading: busy.length > 0 }
}

/* ───────────── media picker ───────────── */

export function MediaPicker({
  multiple,
  onPick,
  onClose,
}: {
  multiple?: boolean
  onPick: (items: MediaItem[]) => void
  onClose: () => void
}) {
  const { media } = useAdminData()
  const { upload, uploading } = useUploader()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const list = media.filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase()))

  const toggle = (id: string) => setSel((s) => (multiple ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id]))

  return (
    <Modal
      title="Media kitabxanası"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Ləğv et
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={sel.length === 0}
            onClick={() => onPick(media.filter((m) => sel.includes(m.id)).sort((a, b) => sel.indexOf(a.id) - sel.indexOf(b.id)))}
          >
            Seç{sel.length > 0 ? ` (${sel.length})` : ''}
          </button>
        </>
      }
    >
      <div className="toolbar">
        <input className="input" placeholder="Fayl adı üzrə axtar…" aria-label="Fayl adı üzrə axtar" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="btn" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <IcUpload /> {uploading ? 'Yüklənir…' : 'Yeni şəkil yüklə'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          hidden
          aria-label="Şəkil faylı seç"
          onChange={async (e) => {
            const files = [...(e.target.files ?? [])]
            e.target.value = ''
            const done = await upload(files)
            if (done.length) setSel((s) => (multiple ? [...s, ...done.map((d) => d.id)] : [done[0].id]))
          }}
        />
      </div>
      {list.length === 0 ? (
        <p className="empty">Şəkil tapılmadı.</p>
      ) : (
        <ul className="media-grid media-grid--pick">
          {list.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className={`media-tile${sel.includes(m.id) ? ' is-sel' : ''}`}
                aria-pressed={sel.includes(m.id)}
                onClick={() => toggle(m.id)}
                onDoubleClick={() => !multiple && onPick([m])}
              >
                <img src={m.thumbUrl ?? m.url} alt="" loading="lazy" />
                <span className="media-tile__name">{m.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

/* ───────────── single image ───────────── */

export function ImageField({
  label,
  value,
  onChange,
  error,
  hint,
}: {
  label: string
  value: ImageRef | undefined
  onChange: (v: ImageRef | undefined) => void
  error?: string
  hint?: string
}) {
  const { upload, uploading } = useUploader()
  const [picking, setPicking] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <Field label={label} error={error} hint={hint}>
      <div className="image-field">
        <div className="image-field__preview">
          {value ? <img src={value.thumbUrl ?? value.url} alt={pickAz(value.alt) || label} /> : <span>Şəkil seçilməyib</span>}
        </div>
        <div className="image-field__actions">
          <button type="button" className="btn btn--sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            <IcUpload /> {uploading ? 'Yüklənir…' : 'Yüklə'}
          </button>
          <button type="button" className="btn btn--sm" onClick={() => setPicking(true)}>
            Kitabxanadan seç
          </button>
          {value && (
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => onChange(undefined)}>
              Sil
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            hidden
            aria-label={`${label}: fayl seç`}
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              const [m] = await upload([f])
              if (m) onChange(imageFromMedia(m))
            }}
          />
        </div>
      </div>
      {picking && (
        <MediaPicker
          onClose={() => setPicking(false)}
          onPick={([m]) => {
            setPicking(false)
            if (m) onChange(imageFromMedia(m))
          }}
        />
      )}
    </Field>
  )
}

/* ───────────── image list ───────────── */

export function ImageListEditor({
  images,
  onChange,
  errors,
}: {
  images: ImageRef[]
  onChange: (v: ImageRef[]) => void
  errors?: Record<string, string>
}) {
  const { upload, uploading } = useUploader()
  const [picking, setPicking] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div className="image-list">
      <div className="toolbar">
        <button type="button" className="btn" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <IcUpload /> {uploading ? 'Yüklənir…' : 'Şəkil yüklə'}
        </button>
        <button type="button" className="btn" onClick={() => setPicking(true)}>
          Kitabxanadan əlavə et
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          hidden
          aria-label="Şəkil faylları seç"
          onChange={async (e) => {
            const files = [...(e.target.files ?? [])]
            e.target.value = ''
            const done = await upload(files)
            if (done.length) onChange([...images, ...done.map(imageFromMedia)])
          }}
        />
      </div>
      {images.length === 0 && <p className="hint">Hələ şəkil əlavə edilməyib. İlk şəkil əsas şəkil kimi istifadə olunur.</p>}
      <ol className="image-list__items">
        {images.map((img, i) => (
          <li key={`${img.url.slice(-40)}-${i}`} className="image-list__item">
            <div className="image-list__thumb">
              <Thumb src={img.thumbUrl ?? img.url} size={72} alt={pickAz(img.alt)} />
              {i === 0 && <span className="badge badge--ok">Əsas</span>}
            </div>
            <div className="image-list__main">
              <LTextField
                label={`Alt mətn (#${i + 1})`}
                value={img.alt ?? {}}
                onChange={(alt) => onChange(images.map((x, j) => (j === i ? { ...x, alt } : x)))}
                error={errors?.[`images.${i}.url`]}
              />
            </div>
            <div className="image-list__side">
              <ReorderButtons index={i} count={images.length} onMove={(to) => onChange(move(images, i, to))} label={`şəkil ${i + 1}`} />
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange(images.filter((_, j) => j !== i))}>
                Sil
              </button>
            </div>
          </li>
        ))}
      </ol>
      {picking && (
        <MediaPicker
          multiple
          onClose={() => setPicking(false)}
          onPick={(items) => {
            setPicking(false)
            onChange([...images, ...items.map(imageFromMedia)])
          }}
        />
      )}
    </div>
  )
}

/* ───────────── price ───────────── */

export function PriceEditor({ value, onChange, error }: { value: Price; onChange: (p: Price) => void; error?: string }) {
  return (
    <div className="grid grid--3">
      <SelectField<PriceType>
        label="Qiymət növü"
        value={value.type}
        onChange={(type) =>
          type &&
          onChange(
            type === 'fixed'
              ? { type, amount: value.amount, currency: value.currency ?? 'USD' }
              : { type },
          )
        }
        options={[
          { value: 'request', label: 'Sorğu ilə (Qiymət sorğu ilə)' },
          { value: 'fixed', label: 'Sabit qiymət' },
          { value: 'hidden', label: 'Gizli' },
        ]}
      />
      {value.type === 'fixed' && (
        <>
          <NumberField label="Məbləğ" value={value.amount ?? null} onChange={(n) => onChange({ ...value, amount: n ?? undefined })} error={error} />
          <SelectField<Currency>
            label="Valyuta"
            value={value.currency ?? 'USD'}
            onChange={(c) => c && onChange({ ...value, currency: c })}
            options={[
              { value: 'AZN', label: 'AZN' },
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
            ]}
          />
        </>
      )}
    </div>
  )
}

/* ───────────── compatibility multi-select ───────────── */

export interface PickItem {
  id: string
  title: string
  sub?: string
  /** extra text matched by the search box */
  search?: string
}

export function CompatPicker({
  items,
  selected,
  onChange,
  label,
  empty,
}: {
  items: PickItem[]
  selected: string[]
  onChange: (ids: string[]) => void
  label: string
  empty: string
}) {
  const [q, setQ] = useState('')
  const [onlySel, setOnlySel] = useState(false)
  const set = useMemo(() => new Set(selected), [selected])
  const list = items.filter((it) => {
    if (onlySel && !set.has(it.id)) return false
    const hay = `${it.title} ${it.sub ?? ''} ${it.search ?? ''}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })
  const toggle = (id: string) => onChange(set.has(id) ? selected.filter((x) => x !== id) : [...selected, id])
  return (
    <div className="compat">
      <div className="toolbar">
        <input className="input" placeholder={`${label} üzrə axtar…`} aria-label={`${label} üzrə axtar`} value={q} onChange={(e) => setQ(e.target.value)} />
        <CheckField label="Yalnız seçilmişlər" checked={onlySel} onChange={setOnlySel} />
        <span className="toolbar__count">Seçilib: {selected.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
        <ul className="compat__list">
          {list.map((it) => (
            <li key={it.id}>
              <label className="compat__row">
                <input type="checkbox" checked={set.has(it.id)} onChange={() => toggle(it.id)} />
                <span>
                  <b>{it.title}</b>
                  {it.sub && <small>{it.sub}</small>}
                </span>
              </label>
            </li>
          ))}
          {list.length === 0 && <li className="empty">Uyğun nəticə yoxdur.</li>}
        </ul>
      )}
      {selected.length > 0 && (
        <div className="compat__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange([])}>
            Seçimi təmizlə
          </button>
        </div>
      )}
    </div>
  )
}

/* ───────────── dynamic specification editor ───────────── */

const neutral = (v: LText) => v.az ?? v.ru ?? v.en ?? ''
const isLangSpecific = (v: LText) =>
  [v.ru, v.en].some((x) => x !== undefined && x.trim() !== '' && x !== v.az)

function ValueInput({ item, onChange }: { item: SpecItem; onChange: (v: LText) => void }) {
  const [multi, setMulti] = useState(isLangSpecific(item.value))
  if (multi)
    return (
      <div>
        <LTextField label="Dəyər" value={item.value} onChange={onChange} />
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => (onChange({ az: neutral(item.value), ru: neutral(item.value), en: neutral(item.value) }), setMulti(false))}>
          Bütün dillər üçün eyni dəyər
        </button>
      </div>
    )
  return (
    <div>
      <TextField
        label="Dəyər"
        value={neutral(item.value)}
        onChange={(v) => onChange(v === '' ? {} : { az: v, ru: v, en: v })}
        hint="Boş dəyərli sətir saytda göstərilmir."
      />
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setMulti(true)}>
        Dillərə görə fərqli dəyər
      </button>
    </div>
  )
}

export function SpecEditor({ groups, onChange }: { groups: SpecGroup[]; onChange: (g: SpecGroup[]) => void }) {
  const [preset, setPreset] = useState('')
  const [groupPreset, setGroupPreset] = useState('')

  const setGroup = (gi: number, patch: Partial<SpecGroup>) => onChange(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)))
  const setItem = (gi: number, ii: number, patch: Partial<SpecItem>) =>
    setGroup(gi, { items: groups[gi].items.map((it, i) => (i === ii ? { ...it, ...patch } : it)) })

  const addPreset = (p: SpecPreset) => {
    const title = SPEC_GROUP_TITLES[p.group]
    const item: SpecItem = { id: newId(), label: p.label, value: {}, unit: p.unit }
    const gi = groups.findIndex((g) => g.title.az === title.az)
    if (gi >= 0) setGroup(gi, { items: [...groups[gi].items, item] })
    else onChange([...groups, { id: newId(), title, items: [item] }])
  }

  const addGroup = () => {
    const titleKey = groupPreset as keyof typeof SPEC_GROUP_TITLES | ''
    onChange([...groups, { id: newId(), title: titleKey ? SPEC_GROUP_TITLES[titleKey] : {}, items: [] }])
    setGroupPreset('')
  }

  const used = new Set(groups.flatMap((g) => g.items.map((i) => i.label.az)))

  return (
    <div className="specs">
      <p className="hint">
        Texniki göstəriciləri qruplar üzrə əlavə edin. Dəyəri boş qalan sətirlər ictimai saytda göstərilmir. Sahələri və qrupları yuxarı/aşağı daşıyaraq sıranı dəyişin.
      </p>
      {groups.length === 0 && <p className="empty">Hələ texniki göstərici əlavə edilməyib.</p>}
      {groups.map((g, gi) => (
        <fieldset className="spec-group" key={g.id}>
          <legend>Qrup #{gi + 1}</legend>
          <div className="spec-group__head">
            <div className="spec-group__title">
              <LTextField label={`Qrup adı #${gi + 1}`} value={g.title} onChange={(title) => setGroup(gi, { title })} />
            </div>
            <div className="spec-group__tools">
              <ReorderButtons index={gi} count={groups.length} onMove={(to) => onChange(move(groups, gi, to))} label={`qrup ${pickAz(g.title) || gi + 1}`} />
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange(groups.filter((_, i) => i !== gi))}>
                Qrupu sil
              </button>
            </div>
          </div>
          {g.items.length === 0 && <p className="hint">Bu qrupda sahə yoxdur.</p>}
          {g.items.map((it, ii) => (
            <div className="spec-item" key={it.id}>
              <div className="spec-item__label">
                <LTextField label={`Sahə adı (${gi + 1}.${ii + 1})`} value={it.label} onChange={(label) => setItem(gi, ii, { label })} />
              </div>
              <div className="spec-item__value">
                <ValueInput item={it} onChange={(value) => setItem(gi, ii, { value })} />
              </div>
              <div className="spec-item__unit">
                <TextField label="Vahid" value={it.unit ?? ''} onChange={(unit) => setItem(gi, ii, { unit: unit || undefined })} />
              </div>
              <div className="spec-item__tools">
                <ReorderButtons
                  index={ii}
                  count={g.items.length}
                  onMove={(to) => setGroup(gi, { items: move(g.items, ii, to) })}
                  label={`sahə ${pickAz(it.label) || ii + 1}`}
                />
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  aria-label={`Sahəni sil: ${pickAz(it.label) || ii + 1}`}
                  onClick={() => setGroup(gi, { items: g.items.filter((_, i) => i !== ii) })}
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => setGroup(gi, { items: [...g.items, { id: newId(), label: {}, value: {} }] })}
          >
            + Xüsusi sahə
          </button>
        </fieldset>
      ))}

      <div className="spec-add">
        <div className="spec-add__row">
          <div className="field">
            <label htmlFor="spec-preset">Hazır sahə əlavə et</label>
            <select id="spec-preset" className="input" value={preset} onChange={(e) => setPreset(e.target.value)}>
              <option value="">— sahə seçin —</option>
              {(Object.keys(SPEC_GROUP_TITLES) as Array<SpecPreset['group']>).map((grp) => (
                <optgroup key={grp} label={SPEC_GROUP_TITLES[grp].az}>
                  {SPEC_PRESETS.filter((p) => p.group === grp).map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label.az}
                      {p.unit ? ` (${p.unit})` : ''}
                      {used.has(p.label.az) ? ' ✓' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn"
            disabled={!preset}
            onClick={() => {
              const p = SPEC_PRESETS.find((x) => x.key === preset)
              if (p) {
                addPreset(p)
                setPreset('')
              }
            }}
          >
            + Sahə əlavə et
          </button>
        </div>
        <div className="spec-add__row">
          <div className="field">
            <label htmlFor="spec-group-preset">Yeni qrup</label>
            <select id="spec-group-preset" className="input" value={groupPreset} onChange={(e) => setGroupPreset(e.target.value)}>
              <option value="">Boş (xüsusi adlı) qrup</option>
              {(Object.keys(SPEC_GROUP_TITLES) as Array<SpecPreset['group']>).map((grp) => (
                <option key={grp} value={grp}>
                  {SPEC_GROUP_TITLES[grp].az}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn" onClick={addGroup}>
            + Qrup əlavə et
          </button>
        </div>
      </div>
    </div>
  )
}

export function mediaMeta(m: MediaItem): string {
  return [m.width && m.height ? `${m.width}×${m.height}` : '', fmtBytes(m.size)].filter(Boolean).join(' · ')
}
