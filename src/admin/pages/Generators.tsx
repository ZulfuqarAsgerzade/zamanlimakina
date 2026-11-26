import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router'
import { slugify } from '../../lib/slug.ts'
import { InUseError } from '../../data/store.ts'
import { COOLING_SYSTEMS, FUEL_TYPES, GENERATOR_TYPES } from '../../data/types.ts'
import type { Availability, CoolingSystem, FuelType, Generator, GeneratorType, Phase } from '../../data/types.ts'
import { useAdminData, useStore } from '../ctx.tsx'
import { CompatPicker, ImageListEditor, PriceEditor, SpecEditor } from '../editors.tsx'
import { ErrorSummary, FormBar, useEntityForm } from '../form.tsx'
import { AVAIL_LABEL, AVAIL_TONE, COOLING_LABEL, FUEL_LABEL, GTYPE_LABEL, opts } from '../labels.ts'
import { newGenerator } from '../records.ts'
import {
  Badge,
  Card,
  CheckField,
  DataTable,
  DemoBadge,
  GuardedLink,
  LTextField,
  LTextListEditor,
  NumberField,
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

export function GeneratorsList() {
  const d = useAdminData()
  const store = useStore()
  const toast = useToast()
  const confirm = useConfirm()
  const [q, setQ] = useState('')
  const [mfr, setMfr] = useState('')
  const [cat, setCat] = useState('')
  const [status, setStatus] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const mname = (id: string | null) => d.manufacturers.find((m) => m.id === id)?.name ?? ''
  const gname = (g: Generator) => `${mname(g.manufacturerId)} ${g.model}`.trim()

  const rows = useMemo(() => {
    return d.generators
      .filter((g) => (!mfr || g.manufacturerId === mfr) && (!cat || g.categoryId === cat) && (!status || g.status === status))
      .filter((g) => searchMatch([mname(g.manufacturerId), g.model, g.slug], q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.generators, d.manufacturers, q, mfr, cat, status])

  async function del(g: Generator) {
    const name = gname(g)
    if (!(await confirm({ title: `“${name}” silinsin?`, message: 'Generator və onun uyğun hissə əlaqələri silinəcək. Bu əməliyyat geri qaytarılmır.', confirmLabel: 'Sil', danger: true }))) return
    try {
      await store.remove('generators', g.id)
      await d.reload()
      toast.success('Generator silindi.')
    } catch (e) {
      toast.error(e instanceof InUseError ? e.message : errMsg(e))
    }
  }
  async function toggle(g: Generator) {
    try {
      await store.save('generators', { ...g, status: g.status === 'published' ? 'draft' : 'published' })
      await d.reload()
      toast.success(g.status === 'published' ? 'Qaralamaya keçirildi.' : 'Dərc olundu.')
    } catch (e) {
      toast.error(errMsg(e))
    }
  }

  const cols: Column<Generator>[] = [
    {
      key: 'name',
      header: 'Generator',
      render: (g) => (
        <span className="cell-main">
          <Thumb src={g.images[0]?.thumbUrl ?? g.images[0]?.url} />
          <span>
            <GuardedLink to={`/admin/generators/${g.id}`}>
              <b>{gname(g)}</b>
            </GuardedLink>
            <small>/{g.slug}</small>
          </span>
          {g.isDemo && <DemoBadge />}
        </span>
      ),
    },
    { key: 'kva', header: 'Güc', className: 'nowrap', render: (g) => (g.kvaPrime ? `${g.kvaPrime} kVA` : '—') },
    { key: 'cat', header: 'Kateqoriya', render: (g) => pickAz(d.categories.find((c) => c.id === g.categoryId)?.name) || '—' },
    { key: 'av', header: 'Mövcudluq', className: 'nowrap', render: (g) => <Badge tone={AVAIL_TONE[g.availability]}>{AVAIL_LABEL[g.availability]}</Badge> },
    {
      key: 'status',
      header: 'Status',
      render: (g) => (
        <span className="cell-stack">
          <StatusBadge status={g.status} />
          {g.featured && <Badge tone="info">★ Seçilmiş</Badge>}
        </span>
      ),
    },
    { key: 'upd', header: 'Yenilənib', className: 'nowrap', render: (g) => fmtDate(g.updatedAt) },
    {
      key: 'actions',
      header: 'Əməliyyatlar',
      className: 'col-actions',
      render: (g) => {
        const name = gname(g)
        return (
          <span className="row-actions">
            <GuardedLink className="btn btn--sm" to={`/admin/generators/${g.id}`} aria-label={`Redaktə et: ${name}`}>
              Redaktə
            </GuardedLink>
            <button type="button" className="btn btn--sm" onClick={() => toggle(g)} aria-label={`${g.status === 'published' ? 'Qaralamaya keçir' : 'Dərc et'}: ${name}`}>
              {g.status === 'published' ? 'Gizlət' : 'Dərc et'}
            </button>
            <button type="button" className="btn btn--sm btn--danger-ghost" onClick={() => del(g)} aria-label={`Sil: ${name}`}>
              Sil
            </button>
          </span>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        title="Generatorlar"
        sub={`${d.generators.length} generator`}
        actions={
          <GuardedLink className="btn btn--primary" to="/admin/generators/new">
            + Yeni generator
          </GuardedLink>
        }
      />
      <div className="toolbar toolbar--filters">
        <input className="input" placeholder="Model və ya istehsalçı axtar…" aria-label="Generator axtar" value={q} onChange={(e) => (setQ(e.target.value), setLimit(PAGE))} />
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
            .filter((c) => c.kind === 'generator')
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
      <DataTable rows={rows.slice(0, limit)} columns={cols} rowLabel={gname} empty="Generator tapılmadı." />
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

export function GeneratorForm() {
  const { id } = useParams()
  const { generators, loading } = useAdminData()
  if (loading) return null
  if (id) {
    const rec = generators.find((g) => g.id === id)
    if (!rec)
      return (
        <Card>
          <p>Generator tapılmadı.</p>
          <GuardedLink className="btn" to="/admin/generators">
            Siyahıya qayıt
          </GuardedLink>
        </Card>
      )
    return <GeneratorEditor key={id} initial={rec} isNew={false} />
  }
  return <GeneratorEditor key="new" initial={newGenerator()} isNew />
}

type Tab = 'main' | 'desc' | 'images' | 'specs' | 'compat' | 'seo'

const TAB_FIELDS: Record<Tab, string[]> = {
  main: ['slug', 'manufacturerId', 'categoryId', 'model', 'title', 'price', 'availability', 'kvaPrime', 'kvaStandby', 'generatorType', 'fuelType', 'phase', 'coolingSystem', 'status', 'featured'],
  desc: ['shortDescription', 'description', 'advantages', 'applications'],
  images: ['images'],
  specs: ['specGroups'],
  compat: [],
  seo: ['seo'],
}

function GeneratorEditor({ initial, isNew }: { initial: Generator; isNew: boolean }) {
  const d = useAdminData()
  const store = useStore()
  const go = useGuardedNavigate()
  const [tab, setTab] = useState<Tab>('main')
  const initialParts = useMemo(
    () => d.compat.filter((c) => c.generatorId === initial.id).map((c) => c.partId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initial.id],
  )
  const [partIds, setPartIds] = useState<string[]>(initialParts)
  const [partBase, setPartBase] = useState<string[]>(initialParts)
  const partIdsRef = useRef(partIds)
  partIdsRef.current = partIds
  const compatDirty = JSON.stringify([...partIds].sort()) !== JSON.stringify([...partBase].sort())

  const { rec, patch, errors, saving, dirty, save, remove } = useEntityForm('generators', initial, {
    listPath: '/admin/generators',
    noun: 'generator',
    isNew,
    extraDirty: compatDirty,
  })
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const mname = (id: string | null) => d.manufacturers.find((m) => m.id === id)?.name ?? ''

  const autoSlug = (manufacturerId: string | null, model: string) => slugify(`${mname(manufacturerId)} ${model}`)

  const badges = Object.fromEntries((Object.keys(TAB_FIELDS) as Tab[]).map((t) => [t, errorsForPrefix(errors, TAB_FIELDS[t]).length])) as Record<Tab, number>

  const partItems = useMemo(
    () =>
      d.parts.map((p) => ({
        id: p.id,
        title: pickAz(p.name),
        sub: `${p.oemCode}${p.categoryId ? ` · ${pickAz(d.categories.find((c) => c.id === p.categoryId)?.name)}` : ''}`,
        search: mname(p.manufacturerId),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [d.parts, d.categories, d.manufacturers],
  )

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const submittedLinks = partIds // the selection that is being saved; later changes stay unsaved
    const saved = await save(
      async (s) => {
        await store.setGeneratorParts(s.id, submittedLinks)
      },
      { stale: () => JSON.stringify([...partIdsRef.current].sort()) !== JSON.stringify([...submittedLinks].sort()) },
    )
    if (saved) setPartBase(submittedLinks)
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={isNew ? 'Yeni generator' : `${mname(rec.manufacturerId)} ${rec.model}`.trim() || 'Generator'}
        back={{ to: '/admin/generators', label: 'Generatorlar' }}
        sub={rec.isDemo ? 'Demo qeyd' : undefined}
      />
      <ErrorSummary errors={errors} />
      <Tabs
        tabs={[
          { id: 'main', label: 'Əsas' },
          { id: 'desc', label: 'Təsvir' },
          { id: 'images', label: 'Şəkillər' },
          { id: 'specs', label: 'Texniki göstəricilər' },
          { id: 'compat', label: 'Uyğun hissələr' },
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
              <div className="grid grid--2">
                <SelectField
                  label="İstehsalçı"
                  value={rec.manufacturerId ?? ''}
                  empty="— seçin —"
                  error={errors.manufacturerId}
                  onChange={(v) => patch({ manufacturerId: v || null, ...(slugTouched ? {} : { slug: autoSlug(v || null, rec.model) }) })}
                  options={d.manufacturers.map((m) => ({ value: m.id, label: m.name }))}
                />
                <TextField
                  label="Model"
                  required
                  value={rec.model}
                  error={errors.model}
                  onChange={(model) => patch({ model, ...(slugTouched ? {} : { slug: autoSlug(rec.manufacturerId, model) }) })}
                  hint="Məsələn: 1104A-44TG2"
                />
              </div>
              <TextField label="Slug (URL)" required value={rec.slug} error={errors.slug} onChange={(slug) => (setSlugTouched(true), patch({ slug }))} hint="Yalnız kiçik latın hərfləri, rəqəmlər və tire." />
              <SelectField
                label="Kateqoriya"
                value={rec.categoryId ?? ''}
                empty="— kateqoriyasız —"
                error={errors.categoryId}
                onChange={(v) => patch({ categoryId: v || null })}
                options={d.categories.filter((c) => c.kind === 'generator').map((c) => ({ value: c.id, label: pickAz(c.name) }))}
              />
              <LTextField label="Başlıq (istəyə bağlı)" value={rec.title} onChange={(title) => patch({ title })} hint="Boş qalsa, “İstehsalçı Model” istifadə olunur." />
            </Card>
            <Card title="Texniki parametrlər (filtrlər üçün)">
              <div className="grid grid--2">
                <NumberField label="Əsas güc (prime)" suffix="kVA" value={rec.kvaPrime} error={errors.kvaPrime} onChange={(kvaPrime) => patch({ kvaPrime })} />
                <NumberField label="Ehtiyat güc (standby)" suffix="kVA" value={rec.kvaStandby} error={errors.kvaStandby} onChange={(kvaStandby) => patch({ kvaStandby })} />
                <SelectField<GeneratorType> label="Generator tipi" value={rec.generatorType ?? ''} empty="— göstərilməyib —" onChange={(v) => patch({ generatorType: v || null })} options={opts(GTYPE_LABEL).filter((o) => GENERATOR_TYPES.includes(o.value))} />
                <SelectField<FuelType> label="Yanacaq növü" value={rec.fuelType ?? ''} empty="— göstərilməyib —" onChange={(v) => patch({ fuelType: v || null })} options={opts(FUEL_LABEL).filter((o) => FUEL_TYPES.includes(o.value))} />
                <SelectField<'1' | '3'> label="Faza" value={rec.phase ? (String(rec.phase) as '1' | '3') : ''} empty="— göstərilməyib —" onChange={(v) => patch({ phase: v ? (Number(v) as Phase) : null })} options={[{ value: '1', label: 'Bir fazalı' }, { value: '3', label: 'Üç fazalı' }]} />
                <SelectField<CoolingSystem> label="Soyutma sistemi" value={rec.coolingSystem ?? ''} empty="— göstərilməyib —" onChange={(v) => patch({ coolingSystem: v || null })} options={opts(COOLING_LABEL).filter((o) => COOLING_SYSTEMS.includes(o.value))} />
              </div>
              <p className="hint">Bu sahələr kataloq filtrləri üçündür. Məhsul səhifəsindəki cədvəl “Texniki göstəricilər” sekmesindən idarə olunur.</p>
            </Card>
            <Card title="Qiymət və mövcudluq">
              <PriceEditor value={rec.price} onChange={(price) => patch({ price })} error={errors['price.amount'] ?? errors.price} />
              <SelectField<Availability> label="Mövcudluq" value={rec.availability} onChange={(v) => v && patch({ availability: v })} options={opts(AVAIL_LABEL)} />
            </Card>
          </div>
          <div className="stack">
            <Card title="Dərc">
              <SelectField label="Status" value={rec.status} onChange={(status) => status && patch({ status })} options={[{ value: 'published', label: 'Dərc olunub' }, { value: 'draft', label: 'Qaralama (saytda görünmür)' }]} hint="Dərc etmək üçün istehsalçı və əsas güc tələb olunur." />
              <CheckField label="Ana səhifədə seçilmiş" checked={rec.featured} onChange={(featured) => patch({ featured })} />
              {!isNew && <p className="hint">Yaradılıb: {fmtDate(rec.createdAt)} · Yenilənib: {fmtDate(rec.updatedAt)}</p>}
            </Card>
          </div>
        </div>
      )}

      {tab === 'desc' && (
        <div className="stack">
          <Card title="Təsvir">
            <LTextField label="Qısa təsvir" multiline rows={3} value={rec.shortDescription} onChange={(shortDescription) => patch({ shortDescription })} />
            <LTextField label="Ətraflı təsvir" multiline rows={8} value={rec.description} onChange={(description) => patch({ description })} />
          </Card>
          <Card title="Üstünlüklər və tətbiq sahələri">
            <LTextListEditor label="Üstünlük" addLabel="Üstünlük əlavə et" items={rec.advantages} onChange={(advantages) => patch({ advantages })} />
            <LTextListEditor label="Tətbiq sahəsi" addLabel="Tətbiq sahəsi əlavə et" items={rec.applications} onChange={(applications) => patch({ applications })} />
          </Card>
        </div>
      )}

      {tab === 'images' && (
        <Card title="Məhsul şəkilləri">
          <ImageListEditor images={rec.images} onChange={(images) => patch({ images })} errors={errors} />
        </Card>
      )}

      {tab === 'specs' && (
        <Card title="Texniki göstəricilər">
          <SpecEditor groups={rec.specGroups} onChange={(specGroups) => patch({ specGroups })} />
        </Card>
      )}

      {tab === 'compat' && (
        <Card title="Uyğun ehtiyat hissələri">
          <p className="hint">Seçilən hissələr bu generatorun səhifəsində “Uyğun ehtiyat hissələri” bölməsində görünəcək. Dəyişiklik “Saxla” düyməsi ilə yadda qalır.</p>
          <CompatPicker label="Ehtiyat hissəsi" items={partItems} selected={partIds} onChange={setPartIds} empty="Hələ ehtiyat hissəsi yoxdur. Əvvəlcə “Ehtiyat hissələri” bölməsində əlavə edin." />
        </Card>
      )}

      {tab === 'seo' && (
        <Card title="SEO">
          <LTextField label="SEO başlığı" value={rec.seo.title ?? {}} onChange={(title) => patch({ seo: { ...rec.seo, title } })} hint="Boş qalsa, avtomatik yaradılır." />
          <LTextField label="SEO təsviri" multiline rows={3} value={rec.seo.description ?? {}} onChange={(description) => patch({ seo: { ...rec.seo, description } })} hint="Tövsiyə: 140–160 simvol." />
        </Card>
      )}

      <FormBar saving={saving} dirty={dirty || compatDirty} isNew={isNew} onCancel={() => void go('/admin/generators')} onDelete={() => void remove('Generator və onun uyğun hissə əlaqələri silinəcək.')} />
    </form>
  )
}
