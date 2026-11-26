import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router'
import { slugify } from '../../lib/slug.ts'
import { InUseError } from '../../data/store.ts'
import type { Availability, Part } from '../../data/types.ts'
import { useAdminData, useStore } from '../ctx.tsx'
import { CompatPicker, ImageListEditor, PriceEditor, SpecEditor } from '../editors.tsx'
import { ErrorSummary, FormBar, useEntityForm } from '../form.tsx'
import { AVAIL_LABEL, AVAIL_TONE, opts } from '../labels.ts'
import { newPart } from '../records.ts'
import {
  Badge,
  Card,
  CheckField,
  DataTable,
  DemoBadge,
  GuardedLink,
  LTextField,
  PageHeader,
  SelectField,
  StatusBadge,
  Tabs,
  TextField,
  Thumb,
  useConfirm,
  useGuardedNavigate,
  useToast,
} from '../ui.tsx'
import type { Column } from '../ui.tsx'
import { errMsg, errorsForPrefix, fmtDate, pickAz, searchMatch } from '../util.ts'

const PAGE = 50

export function PartsList() {
  const d = useAdminData()
  const store = useStore()
  const toast = useToast()
  const confirm = useConfirm()
  const [q, setQ] = useState('')
  const [mfr, setMfr] = useState('')
  const [cat, setCat] = useState('')
  const [status, setStatus] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const rows = useMemo(() => {
    return d.parts
      .filter((p) => (!mfr || p.manufacturerId === mfr) && (!cat || p.categoryId === cat) && (!status || p.status === status))
      .filter((p) => searchMatch([pickAz(p.name), p.name.ru ?? '', p.name.en ?? '', p.oemCode, p.slug], q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [d.parts, q, mfr, cat, status])

  async function del(p: Part) {
    if (!(await confirm({ title: `“${pickAz(p.name)}” silinsin?`, message: 'Hissə və onun generator əlaqələri silinəcək. Bu əməliyyat geri qaytarılmır.', confirmLabel: 'Sil', danger: true }))) return
    try {
      await store.remove('parts', p.id)
      await d.reload()
      toast.success('Ehtiyat hissəsi silindi.')
    } catch (e) {
      toast.error(e instanceof InUseError ? e.message : errMsg(e))
    }
  }
  async function toggle(p: Part) {
    try {
      await store.save('parts', { ...p, status: p.status === 'published' ? 'draft' : 'published' })
      await d.reload()
      toast.success(p.status === 'published' ? 'Qaralamaya keçirildi.' : 'Dərc olundu.')
    } catch (e) {
      toast.error(errMsg(e))
    }
  }

  const compatN = (p: Part) => d.compat.filter((c) => c.partId === p.id).length

  const cols: Column<Part>[] = [
    {
      key: 'name',
      header: 'Ehtiyat hissəsi',
      render: (p) => (
        <span className="cell-main">
          <Thumb src={p.images[0]?.thumbUrl ?? p.images[0]?.url} />
          <span>
            <GuardedLink to={`/admin/parts/${p.id}`}>
              <b>{pickAz(p.name)}</b>
            </GuardedLink>
            <small>{p.oemCode}</small>
          </span>
          {p.isDemo && <DemoBadge />}
        </span>
      ),
    },
    { key: 'mfr', header: 'İstehsalçı', render: (p) => d.manufacturers.find((m) => m.id === p.manufacturerId)?.name ?? 'Universal' },
    { key: 'cat', header: 'Kateqoriya', render: (p) => pickAz(d.categories.find((c) => c.id === p.categoryId)?.name) || '—' },
    { key: 'compat', header: 'Uyğun generator', render: compatN },
    { key: 'av', header: 'Mövcudluq', className: 'nowrap', render: (p) => <Badge tone={AVAIL_TONE[p.availability]}>{AVAIL_LABEL[p.availability]}</Badge> },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'upd', header: 'Yenilənib', className: 'nowrap', render: (p) => fmtDate(p.updatedAt) },
    {
      key: 'actions',
      header: 'Əməliyyatlar',
      className: 'col-actions',
      render: (p) => (
        <span className="row-actions">
          <GuardedLink className="btn btn--sm" to={`/admin/parts/${p.id}`} aria-label={`Redaktə et: ${pickAz(p.name)}`}>
            Redaktə
          </GuardedLink>
          <button type="button" className="btn btn--sm" onClick={() => toggle(p)} aria-label={`${p.status === 'published' ? 'Qaralamaya keçir' : 'Dərc et'}: ${pickAz(p.name)}`}>
            {p.status === 'published' ? 'Gizlət' : 'Dərc et'}
          </button>
          <button type="button" className="btn btn--sm btn--danger-ghost" onClick={() => del(p)} aria-label={`Sil: ${pickAz(p.name)}`}>
            Sil
          </button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Ehtiyat hissələri"
        sub={`${d.parts.length} hissə`}
        actions={
          <GuardedLink className="btn btn--primary" to="/admin/parts/new">
            + Yeni hissə
          </GuardedLink>
        }
      />
      <div className="toolbar toolbar--filters">
        <input className="input" placeholder="Ad və ya OEM kodu axtar…" aria-label="Hissə axtar" value={q} onChange={(e) => (setQ(e.target.value), setLimit(PAGE))} />
        <select className="input" aria-label="İstehsalçı filtri" value={mfr} onChange={(e) => (setMfr(e.target.value), setLimit(PAGE))}>
          <option value="">Bütün istehsalçılar</option>
          {d.manufacturers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select className="input" aria-label="Kateqoriya filtri" value={cat} onChange={(e) => (setCat(e.target.value), setLimit(PAGE))}>
          <option value="">Bütün kateqoriyalar</option>
          {d.categories
            .filter((c) => c.kind === 'part')
            .map((c) => (
              <option key={c.id} value={c.id}>
                {pickAz(c.name)}
              </option>
            ))}
        </select>
        <select className="input" aria-label="Status filtri" value={status} onChange={(e) => (setStatus(e.target.value), setLimit(PAGE))}>
          <option value="">Bütün statuslar</option>
          <option value="published">Dərc olunub</option>
          <option value="draft">Qaralama</option>
        </select>
      </div>
      <DataTable rows={rows.slice(0, limit)} columns={cols} rowLabel={(p) => pickAz(p.name)} empty="Ehtiyat hissəsi tapılmadı." />
      {rows.length > limit && (
        <div className="more">
          <button type="button" className="btn" onClick={() => setLimit((l) => l + PAGE)}>
            Daha çox göstər ({limit} / {rows.length})
          </button>
        </div>
      )}
    </>
  )
}

export function PartForm() {
  const { id } = useParams()
  const { parts, loading } = useAdminData()
  if (loading) return null
  if (id) {
    const rec = parts.find((p) => p.id === id)
    if (!rec)
      return (
        <Card>
          <p>Hissə tapılmadı.</p>
          <GuardedLink className="btn" to="/admin/parts">
            Siyahıya qayıt
          </GuardedLink>
        </Card>
      )
    return <PartEditor key={id} initial={rec} isNew={false} />
  }
  return <PartEditor key="new" initial={newPart()} isNew />
}

type Tab = 'main' | 'images' | 'specs' | 'compat' | 'seo'
const TAB_FIELDS: Record<Tab, string[]> = {
  main: ['slug', 'name', 'oemCode', 'manufacturerId', 'categoryId', 'description', 'price', 'availability', 'status', 'featured'],
  images: ['images'],
  specs: ['specGroups'],
  compat: [],
  seo: ['seo'],
}

function PartEditor({ initial, isNew }: { initial: Part; isNew: boolean }) {
  const d = useAdminData()
  const store = useStore()
  const go = useGuardedNavigate()
  const [tab, setTab] = useState<Tab>('main')
  const initialGens = useMemo(
    () => d.compat.filter((c) => c.partId === initial.id).map((c) => c.generatorId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initial.id],
  )
  const [genIds, setGenIds] = useState<string[]>(initialGens)
  const [genBase, setGenBase] = useState<string[]>(initialGens)
  const genIdsRef = useRef(genIds)
  genIdsRef.current = genIds
  const compatDirty = JSON.stringify([...genIds].sort()) !== JSON.stringify([...genBase].sort())

  const { rec, patch, errors, saving, dirty, save, remove } = useEntityForm('parts', initial, {
    listPath: '/admin/parts',
    noun: 'ehtiyat hissəsi',
    isNew,
    extraDirty: compatDirty,
  })
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const autoSlug = (name: string, oem: string) => slugify(`${name} ${oem}`)
  const badges = Object.fromEntries((Object.keys(TAB_FIELDS) as Tab[]).map((t) => [t, errorsForPrefix(errors, TAB_FIELDS[t]).length])) as Record<Tab, number>

  const genItems = useMemo(
    () =>
      d.generators.map((g) => {
        const m = d.manufacturers.find((x) => x.id === g.manufacturerId)
        return { id: g.id, title: `${m?.name ?? '—'} ${g.model}`, sub: g.kvaPrime ? `${g.kvaPrime} kVA` : undefined, search: g.slug }
      }),
    [d.generators, d.manufacturers],
  )

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const submittedLinks = genIds // the selection that is being saved; later changes stay unsaved
    const saved = await save(
      async (s) => {
        await store.setPartGenerators(s.id, submittedLinks)
      },
      { stale: () => JSON.stringify([...genIdsRef.current].sort()) !== JSON.stringify([...submittedLinks].sort()) },
    )
    if (saved) setGenBase(submittedLinks)
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader title={isNew ? 'Yeni ehtiyat hissəsi' : pickAz(rec.name) || 'Ehtiyat hissəsi'} back={{ to: '/admin/parts', label: 'Ehtiyat hissələri' }} sub={rec.isDemo ? 'Demo qeyd' : undefined} />
      <ErrorSummary errors={errors} />
      <Tabs
        tabs={[
          { id: 'main', label: 'Əsas' },
          { id: 'images', label: 'Şəkillər' },
          { id: 'specs', label: 'Texniki məlumat' },
          { id: 'compat', label: 'Uyğun generatorlar' },
          { id: 'seo', label: 'SEO' },
        ]}
        value={tab}
        onChange={setTab}
        badges={badges}
      />

      {tab === 'main' && (
        <div className="grid grid--2-1">
          <div className="stack">
            <Card title="Əsas məlumat">
              <LTextField
                label="Ad"
                required
                value={rec.name}
                error={errors.name}
                onChange={(name) => patch({ name, ...(slugTouched ? {} : { slug: autoSlug(name.az ?? '', rec.oemCode) }) })}
              />
              <div className="grid grid--2">
                <TextField
                  label="OEM / istinad kodu"
                  required
                  value={rec.oemCode}
                  error={errors.oemCode}
                  onChange={(oemCode) => patch({ oemCode, ...(slugTouched ? {} : { slug: autoSlug(rec.name.az ?? '', oemCode) }) })}
                />
                <TextField label="Slug (URL)" required value={rec.slug} error={errors.slug} onChange={(slug) => (setSlugTouched(true), patch({ slug }))} hint="Yalnız kiçik latın hərfləri, rəqəmlər və tire." />
                <SelectField
                  label="İstehsalçı"
                  value={rec.manufacturerId ?? ''}
                  empty="Universal (istehsalçısız)"
                  onChange={(v) => patch({ manufacturerId: v || null })}
                  options={d.manufacturers.map((m) => ({ value: m.id, label: m.name }))}
                />
                <SelectField
                  label="Kateqoriya"
                  value={rec.categoryId ?? ''}
                  empty="— kateqoriyasız —"
                  onChange={(v) => patch({ categoryId: v || null })}
                  options={d.categories.filter((c) => c.kind === 'part').map((c) => ({ value: c.id, label: pickAz(c.name) }))}
                />
              </div>
              <LTextField label="Təsvir" multiline rows={5} value={rec.description} onChange={(description) => patch({ description })} />
            </Card>
            <Card title="Qiymət və mövcudluq">
              <PriceEditor value={rec.price} onChange={(price) => patch({ price })} error={errors['price.amount'] ?? errors.price} />
              <SelectField<Availability> label="Mövcudluq" value={rec.availability} onChange={(v) => v && patch({ availability: v })} options={opts(AVAIL_LABEL)} />
            </Card>
          </div>
          <Card title="Dərc">
            <SelectField label="Status" value={rec.status} onChange={(status) => status && patch({ status })} options={[{ value: 'published', label: 'Dərc olunub' }, { value: 'draft', label: 'Qaralama (saytda görünmür)' }]} />
            <CheckField label="Ana səhifədə göstər (seçilmiş)" checked={rec.featured} onChange={(featured) => patch({ featured })} />
            {!isNew && <p className="hint">Yaradılıb: {fmtDate(rec.createdAt)} · Yenilənib: {fmtDate(rec.updatedAt)}</p>}
          </Card>
        </div>
      )}

      {tab === 'images' && (
        <Card title="Şəkillər">
          <ImageListEditor images={rec.images} onChange={(images) => patch({ images })} errors={errors} />
        </Card>
      )}

      {tab === 'specs' && (
        <Card title="Texniki məlumat">
          <SpecEditor groups={rec.specGroups} onChange={(specGroups) => patch({ specGroups })} />
        </Card>
      )}

      {tab === 'compat' && (
        <Card title="Uyğun generatorlar">
          <p className="hint">Bir hissə bir neçə generator modelinə uyğun ola bilər. Dəyişiklik “Saxla” düyməsi ilə yadda qalır.</p>
          <CompatPicker label="Generator" items={genItems} selected={genIds} onChange={setGenIds} empty="Hələ generator yoxdur." />
        </Card>
      )}

      {tab === 'seo' && (
        <Card title="SEO">
          <LTextField label="SEO başlığı" value={rec.seo.title ?? {}} onChange={(title) => patch({ seo: { ...rec.seo, title } })} />
          <LTextField label="SEO təsviri" multiline rows={3} value={rec.seo.description ?? {}} onChange={(description) => patch({ seo: { ...rec.seo, description } })} />
        </Card>
      )}

      <FormBar saving={saving} dirty={dirty || compatDirty} isNew={isNew} onCancel={() => void go('/admin/parts')} onDelete={() => void remove('Hissə və onun generator əlaqələri silinəcək.')} />
    </form>
  )
}
