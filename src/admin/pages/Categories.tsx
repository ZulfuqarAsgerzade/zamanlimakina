import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { slugify } from '../../lib/slug.ts'
import { InUseError } from '../../data/store.ts'
import type { Category, CategoryKind } from '../../data/types.ts'
import { useAdminData, useStore } from '../ctx.tsx'
import { CompatPicker } from '../editors.tsx'
import { ErrorSummary, FormBar, useEntityForm } from '../form.tsx'
import { newCategory } from '../records.ts'
import {
  Card,
  DataTable,
  DemoBadge,
  GuardedLink,
  LTextField,
  PageHeader,
  SelectField,
  StatusBadge,
  Tabs,
  TextField,
  useConfirm,
  useGuardedNavigate,
  useToast,
} from '../ui.tsx'
import type { Column } from '../ui.tsx'
import { errMsg, pickAz } from '../util.ts'

const KIND_LABEL: Record<CategoryKind, string> = { generator: 'Generator kateqoriyaları', part: 'Ehtiyat hissəsi kateqoriyaları' }

export function CategoriesList() {
  const d = useAdminData()
  const store = useStore()
  const toast = useToast()
  const confirm = useConfirm()
  const [kind, setKind] = useState<CategoryKind>('generator')
  const rows = d.categories.filter((c) => c.kind === kind)
  const count = (c: Category) => (c.kind === 'generator' ? d.generators : d.parts).filter((p) => p.categoryId === c.id).length

  async function del(c: Category) {
    if (!(await confirm({ title: `“${pickAz(c.name)}” silinsin?`, message: 'Bu əməliyyat geri qaytarılmır.', confirmLabel: 'Sil', danger: true }))) return
    try {
      await store.remove('categories', c.id)
      await d.reload()
      toast.success('Kateqoriya silindi.')
    } catch (e) {
      toast.error(e instanceof InUseError ? e.message : errMsg(e))
    }
  }

  const cols: Column<Category>[] = [
    {
      key: 'name',
      header: 'Kateqoriya',
      render: (c) => (
        <span className="cell-main">
          <span>
            <GuardedLink to={`/admin/categories/${c.id}`}>
              <b>{pickAz(c.name)}</b>
            </GuardedLink>
            <small>/{c.slug}</small>
          </span>
          {c.isDemo && <DemoBadge />}
        </span>
      ),
    },
    { key: 'count', header: 'Məhsul', render: count },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'actions',
      header: 'Əməliyyatlar',
      className: 'col-actions',
      render: (c) => (
        <span className="row-actions">
          <GuardedLink className="btn btn--sm" to={`/admin/categories/${c.id}`} aria-label={`Redaktə et: ${pickAz(c.name)}`}>
            Redaktə
          </GuardedLink>
          <button type="button" className="btn btn--sm btn--danger-ghost" onClick={() => del(c)} aria-label={`Sil: ${pickAz(c.name)}`}>
            Sil
          </button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Kateqoriyalar"
        sub="Generatorlar və ehtiyat hissələri üçün ayrı kateqoriya siyahıları."
        actions={
          <GuardedLink className="btn btn--primary" to={`/admin/categories/new?kind=${kind}`}>
            + Yeni kateqoriya
          </GuardedLink>
        }
      />
      <Tabs
        tabs={[
          { id: 'generator', label: KIND_LABEL.generator },
          { id: 'part', label: KIND_LABEL.part },
        ]}
        value={kind}
        onChange={setKind}
      />
      <DataTable
        rows={rows}
        columns={cols}
        rowLabel={(c) => pickAz(c.name)}
        empty="Bu bölmədə kateqoriya yoxdur."
        onReorder={async (ids) => {
          try {
            await store.reorder('categories', ids)
            await d.reload()
          } catch (e) {
            toast.error(errMsg(e))
          }
        }}
      />
    </>
  )
}

export function CategoryForm() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const { categories, loading } = useAdminData()
  if (loading) return null
  if (id) {
    const rec = categories.find((c) => c.id === id)
    if (!rec)
      return (
        <Card>
          <p>Kateqoriya tapılmadı.</p>
          <GuardedLink className="btn" to="/admin/categories">
            Siyahıya qayıt
          </GuardedLink>
        </Card>
      )
    return <CategoryEditor key={id} initial={rec} isNew={false} />
  }
  const kind: CategoryKind = sp.get('kind') === 'part' ? 'part' : 'generator'
  const max = Math.max(-1, ...categories.filter((c) => c.kind === kind).map((c) => c.sortOrder))
  return <CategoryEditor key={`new-${kind}`} initial={newCategory(kind, max + 1)} isNew />
}

const ICONS = ['oil-filter', 'fuel-filter', 'air-filter', 'belt', 'sensor', 'gasket', 'thermostat', 'electrical']

function CategoryEditor({ initial, isNew }: { initial: Category; isNew: boolean }) {
  const go = useGuardedNavigate()
  const store = useStore()
  const toast = useToast()
  const d = useAdminData()
  const { rec, patch, errors, saving, dirty, save, remove } = useEntityForm('categories', initial, {
    listPath: '/admin/categories',
    noun: 'kateqoriya',
    isNew,
  })
  const [slugTouched, setSlugTouched] = useState(!isNew)

  const products = useMemo(
    () =>
      rec.kind === 'generator'
        ? d.generators.map((g) => ({
            id: g.id,
            title: `${d.manufacturers.find((m) => m.id === g.manufacturerId)?.name ?? '—'} ${g.model}`,
            sub: g.categoryId && g.categoryId !== rec.id ? `Hazırda: ${pickAz(d.categories.find((c) => c.id === g.categoryId)?.name)}` : undefined,
            inCat: g.categoryId === rec.id,
          }))
        : d.parts.map((p) => ({
            id: p.id,
            title: pickAz(p.name),
            sub: p.oemCode,
            inCat: p.categoryId === rec.id,
          })),
    [rec.kind, rec.id, d.generators, d.parts, d.manufacturers, d.categories],
  )
  const current = useMemo(() => products.filter((p) => p.inCat).map((p) => p.id), [products])
  const [selected, setSelected] = useState<string[] | null>(null)
  const sel = selected ?? current
  const changed = selected !== null && (sel.length !== current.length || sel.some((x) => !current.includes(x)))

  async function saveAssignments() {
    let failed = 0
    const toAdd = sel.filter((x) => !current.includes(x))
    const toRemove = current.filter((x) => !sel.includes(x))
    for (const pid of [...toAdd, ...toRemove]) {
      const categoryId = toAdd.includes(pid) ? rec.id : null
      try {
        if (rec.kind === 'generator') {
          const g = d.generators.find((x) => x.id === pid)!
          await store.save('generators', { ...g, categoryId })
        } else {
          const p = d.parts.find((x) => x.id === pid)!
          await store.save('parts', { ...p, categoryId })
        }
      } catch {
        failed++
      }
    }
    await d.reload()
    setSelected(null)
    if (failed) toast.error(`${failed} qeydi yeniləmək alınmadı (məsələn, doldurulmamış məcburi sahələr).`)
    else toast.success('Kateqoriya təyinatları saxlanıldı.')
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void save()
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate>
        <PageHeader
          title={isNew ? 'Yeni kateqoriya' : pickAz(rec.name) || 'Kateqoriya'}
          sub={KIND_LABEL[rec.kind]}
          back={{ to: '/admin/categories', label: 'Kateqoriyalar' }}
        />
        <ErrorSummary errors={errors} />
        <div className="grid grid--2-1">
          <Card title="Əsas məlumat">
            <LTextField
              label="Ad"
              required
              value={rec.name}
              error={errors.name}
              onChange={(name) => patch({ name, ...(slugTouched ? {} : { slug: slugify(name.az ?? '') }) })}
            />
            <TextField
              label="Slug (URL)"
              required
              value={rec.slug}
              error={errors.slug}
              onChange={(slug) => (setSlugTouched(true), patch({ slug }))}
              hint="Yalnız kiçik latın hərfləri, rəqəmlər və tire."
            />
            <LTextField label="Təsvir" multiline rows={3} value={rec.description} onChange={(description) => patch({ description })} />
            {rec.kind === 'part' && (
              <>
                <TextField label="İkon açarı" value={rec.icon ?? ''} onChange={(icon) => patch({ icon: icon || undefined })} hint={`Məsələn: ${ICONS.join(', ')}`} />
                <datalist id="icon-keys">{ICONS.map((i) => <option key={i} value={i} />)}</datalist>
              </>
            )}
          </Card>
          <Card title="Dərc">
            <SelectField
              label="Status"
              value={rec.status}
              onChange={(status) => status && patch({ status })}
              options={[
                { value: 'published', label: 'Dərc olunub' },
                { value: 'draft', label: 'Qaralama' },
              ]}
            />
            {rec.isDemo && <p className="hint">Bu, demo qeyddir.</p>}
          </Card>
        </div>
        <FormBar saving={saving} dirty={dirty} isNew={isNew} onCancel={() => void go('/admin/categories')} onDelete={() => void remove()} />
      </form>

      {!isNew && (
        <Card
          title={`Bu kateqoriyaya aid ${rec.kind === 'generator' ? 'generatorlar' : 'ehtiyat hissələri'}`}
          id="assign"
          actions={
            <button type="button" className="btn btn--primary btn--sm" disabled={!changed} onClick={saveAssignments}>
              Təyinatı saxla
            </button>
          }
        >
          <p className="hint">Seçilənlər bu kateqoriyaya təyin olunur, seçimi götürülənlər kateqoriyasız qalır.</p>
          <CompatPicker
            label="Məhsul"
            items={products}
            selected={sel}
            onChange={setSelected}
            empty="Hələ məhsul yoxdur."
          />
        </Card>
      )}
    </>
  )
}
