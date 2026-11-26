import { useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router'
import { slugify } from '../../lib/slug.ts'
import { InUseError } from '../../data/store.ts'
import type { Manufacturer } from '../../data/types.ts'
import { useAdminData, useStore } from '../ctx.tsx'
import { ImageField } from '../editors.tsx'
import { ErrorSummary, FormBar, useEntityForm } from '../form.tsx'
import { newManufacturer } from '../records.ts'
import {
  Card,
  DataTable,
  DemoBadge,
  GuardedLink,
  LTextField,
  PageHeader,
  SelectField,
  StatusBadge,
  TextField,
  Thumb,
  useConfirm,
  useGuardedNavigate,
  useToast,
} from '../ui.tsx'
import type { Column } from '../ui.tsx'
import { errMsg, searchMatch } from '../util.ts'

export function ManufacturersList() {
  const d = useAdminData()
  const store = useStore()
  const toast = useToast()
  const confirm = useConfirm()
  const [q, setQ] = useState('')
  const rows = d.manufacturers.filter((m) => searchMatch([m.name, m.slug], q))

  async function toggle(m: Manufacturer) {
    try {
      await store.save('manufacturers', { ...m, status: m.status === 'published' ? 'draft' : 'published' })
      await d.reload()
      toast.success(m.status === 'published' ? 'Qaralamaya keçirildi.' : 'Dərc olundu.')
    } catch (e) {
      toast.error(errMsg(e))
    }
  }

  async function del(m: Manufacturer) {
    if (!(await confirm({ title: `“${m.name}” silinsin?`, message: 'Bu əməliyyat geri qaytarılmır.', confirmLabel: 'Sil', danger: true }))) return
    try {
      await store.remove('manufacturers', m.id)
      await d.reload()
      toast.success('İstehsalçı silindi.')
    } catch (e) {
      toast.error(e instanceof InUseError ? e.message : errMsg(e))
    }
  }

  const cols: Column<Manufacturer>[] = [
    {
      key: 'name',
      header: 'İstehsalçı',
      render: (m) => (
        <span className="cell-main">
          <Thumb src={m.logo?.thumbUrl ?? m.logo?.url} />
          <span>
            <GuardedLink to={`/admin/manufacturers/${m.id}`}>
              <b>{m.name}</b>
            </GuardedLink>
            <small>/{m.slug}</small>
          </span>
          {m.isDemo && <DemoBadge />}
        </span>
      ),
    },
    { key: 'gens', header: 'Generator', render: (m) => d.generators.filter((g) => g.manufacturerId === m.id).length },
    { key: 'parts', header: 'Hissə', render: (m) => d.parts.filter((p) => p.manufacturerId === m.id).length },
    { key: 'status', header: 'Status', render: (m) => <StatusBadge status={m.status} /> },
    {
      key: 'actions',
      header: 'Əməliyyatlar',
      className: 'col-actions',
      render: (m) => (
        <span className="row-actions">
          <GuardedLink className="btn btn--sm" to={`/admin/manufacturers/${m.id}`} aria-label={`Redaktə et: ${m.name}`}>
            Redaktə
          </GuardedLink>
          <button type="button" className="btn btn--sm" onClick={() => toggle(m)} aria-label={`${m.status === 'published' ? 'Qaralamaya keçir' : 'Dərc et'}: ${m.name}`}>
            {m.status === 'published' ? 'Gizlət' : 'Dərc et'}
          </button>
          <button type="button" className="btn btn--sm btn--danger-ghost" onClick={() => del(m)} aria-label={`Sil: ${m.name}`}>
            Sil
          </button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="İstehsalçılar"
        sub="Saytdakı brendlər. Sıra ictimai səhifədəki göstərilmə ardıcıllığını müəyyən edir."
        actions={
          <GuardedLink className="btn btn--primary" to="/admin/manufacturers/new">
            + Yeni istehsalçı
          </GuardedLink>
        }
      />
      <div className="toolbar">
        <input className="input" placeholder="Ad üzrə axtar…" aria-label="İstehsalçı axtar" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <span className="hint">Axtarış zamanı sıralama söndürülüb.</span>}
      </div>
      <DataTable
        rows={rows}
        columns={cols}
        rowLabel={(m) => m.name}
        onReorder={
          q
            ? undefined
            : async (ids) => {
                try {
                  await store.reorder('manufacturers', ids)
                  await d.reload()
                } catch (e) {
                  toast.error(errMsg(e))
                }
              }
        }
        empty="İstehsalçı tapılmadı."
      />
    </>
  )
}

export function ManufacturerForm() {
  const { id } = useParams()
  const { manufacturers, loading } = useAdminData()
  if (loading) return null
  if (id) {
    const rec = manufacturers.find((m) => m.id === id)
    if (!rec) return <NotFound />
    return <ManufacturerEditor key={id} initial={rec} isNew={false} />
  }
  return <ManufacturerEditor key="new" initial={newManufacturer(Math.max(-1, ...manufacturers.map((m) => m.sortOrder)) + 1)} isNew />
}

function NotFound() {
  return (
    <Card>
      <p>Qeyd tapılmadı. Silinmiş ola bilər.</p>
      <GuardedLink className="btn" to="/admin/manufacturers">
        Siyahıya qayıt
      </GuardedLink>
    </Card>
  )
}

function ManufacturerEditor({ initial, isNew }: { initial: Manufacturer; isNew: boolean }) {
  const go = useGuardedNavigate()
  const { rec, patch, errors, saving, dirty, save, remove } = useEntityForm('manufacturers', initial, {
    listPath: '/admin/manufacturers',
    noun: 'istehsalçı',
    isNew,
  })
  const { generators, parts } = useAdminData()
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const used = generators.filter((g) => g.manufacturerId === rec.id).length + parts.filter((p) => p.manufacturerId === rec.id).length

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void save()
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader title={isNew ? 'Yeni istehsalçı' : rec.name || 'İstehsalçı'} back={{ to: '/admin/manufacturers', label: 'İstehsalçılar' }} />
      <ErrorSummary errors={errors} />
      <div className="grid grid--2-1">
        <div className="stack">
          <Card title="Əsas məlumat">
            <TextField
              label="Ad"
              required
              value={rec.name}
              error={errors.name}
              onChange={(name) => patch({ name, ...(slugTouched ? {} : { slug: slugify(name) }) })}
            />
            <TextField
              label="Slug (URL)"
              required
              value={rec.slug}
              error={errors.slug}
              hint="Yalnız kiçik latın hərfləri, rəqəmlər və tire."
              onChange={(slug) => (setSlugTouched(true), patch({ slug }))}
            />
            <TextField label="Veb sayt" type="url" placeholder="https://" value={rec.website ?? ''} error={errors.website} onChange={(website) => patch({ website })} />
            <LTextField label="Təsvir" multiline rows={5} value={rec.description} onChange={(description) => patch({ description })} />
          </Card>
          <Card title="Şəkillər">
            <ImageField label="Loqo" value={rec.logo} error={errors['logo.url']} onChange={(logo) => patch({ logo })} hint="Loqo yoxdursa, saytda ad mətn şəklində göstərilir." />
            <ImageField label="Üz qabığı şəkli" value={rec.cover} error={errors['cover.url']} onChange={(cover) => patch({ cover })} />
          </Card>
          <Card title="SEO">
            <LTextField label="SEO başlığı" value={rec.seo.title ?? {}} onChange={(title) => patch({ seo: { ...rec.seo, title } })} hint="Boş qalsa, istehsalçı adı istifadə olunur." />
            <LTextField label="SEO təsviri" multiline rows={3} value={rec.seo.description ?? {}} onChange={(description) => patch({ seo: { ...rec.seo, description } })} />
          </Card>
        </div>
        <div className="stack">
          <Card title="Dərc">
            <SelectField
              label="Status"
              value={rec.status}
              onChange={(status) => status && patch({ status })}
              options={[
                { value: 'published', label: 'Dərc olunub' },
                { value: 'draft', label: 'Qaralama (saytda görünmür)' },
              ]}
            />
            {rec.isDemo && <p className="hint">Bu, demo qeyddir.</p>}
            {!isNew && <p className="hint">Bağlı məhsul: {used}</p>}
          </Card>
        </div>
      </div>
      <FormBar
        saving={saving}
        dirty={dirty}
        isNew={isNew}
        onCancel={() => void go('/admin/manufacturers')}
        onDelete={() => void remove(used ? `Bu istehsalçıya ${used} məhsul bağlıdır — silmək mümkün olmayacaq. Əvvəlcə onları başqa istehsalçıya keçirin.` : undefined)}
      />
    </form>
  )
}
