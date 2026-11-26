import { useState } from 'react'
import { REMOVE_CONFIRM_WORD } from '../../data/demoPolicy.ts'
import type { DemoReport } from '../../data/store.ts'
import { useAdminData, useStore } from '../ctx.tsx'
import { Badge, Card, DemoBadge, GuardedLink, PageHeader, Thumb, useConfirm, useToast } from '../ui.tsx'
import { errMsg, fmtDate, pickAz } from '../util.ts'

export function Dashboard() {
  const d = useAdminData()
  const store = useStore()
  const confirm = useConfirm()
  const toast = useToast()
  const [report, setReport] = useState<{ kind: 'install' | 'remove'; r: DemoReport } | null>(null)
  const [busy, setBusy] = useState(false)

  const pub = (xs: Array<{ status: string }>) => xs.filter((x) => x.status === 'published').length
  const demoCount = [...d.manufacturers, ...d.categories, ...d.generators, ...d.parts, ...d.media].filter((x) => x.isDemo).length
  const newInq = d.inquiries.filter((i) => i.status === 'new').length

  const recent = [
    ...d.generators.map((g) => ({
      kind: 'generator' as const,
      id: g.id,
      title: `${d.manufacturers.find((m) => m.id === g.manufacturerId)?.name ?? ''} ${g.model}`.trim(),
      img: g.images[0],
      at: g.createdAt,
      status: g.status,
      demo: g.isDemo,
    })),
    ...d.parts.map((p) => ({
      kind: 'part' as const,
      id: p.id,
      title: pickAz(p.name),
      img: p.images[0],
      at: p.createdAt,
      status: p.status,
      demo: p.isDemo,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8)

  const tools = store.demoTools
  // a real (Supabase) database: removal needs a typed confirmation; local browser demo data does not
  const realDb = store.mode === 'supabase'

  async function run(kind: 'install' | 'remove') {
    if (kind === 'install' && !tools.install) return toast.error(tools.installBlockedReason ?? 'Demo məlumat yükləmək söndürülüb.')
    const ok = await confirm(
      kind === 'install'
        ? {
            title: 'Demo məlumatı yüklənsin?',
            message:
              'Demo istehsalçılar, generatorlar, ehtiyat hissələri və kateqoriyalar əlavə olunacaq. Əgər demo qeydləri artıq varsa, onlara etdiyiniz dəyişikliklər ilkin vəziyyətə qaytarılacaq. Real qeydlərə toxunulmur.',
            confirmLabel: 'Yüklə',
          }
        : {
            title: 'Demo məlumatı silinsin?',
            message:
              'Yalnız “Demo” işarəli qeydlər silinəcək. Real şirkət qeydləri silinmir. Demo qeydlərə bağlı real qeydlər isə silinmir — onların demo istehsalçı/kateqoriya bağlantısı boşaldılır (generator qaralamaya keçir).',
            confirmLabel: 'Demo məlumatı sil',
            danger: true,
            typeToConfirm: realDb ? REMOVE_CONFIRM_WORD : undefined,
          },
    )
    if (!ok) return
    setBusy(true)
    try {
      const r = kind === 'install' ? await store.installDemo() : await store.removeDemo()
      await d.reload()
      setReport({ kind, r })
      toast.success(kind === 'install' ? 'Demo məlumat yükləndi.' : 'Demo məlumat silindi.')
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="İdarə paneli" sub="Kataloqun və sayt məzmununun ümumi vəziyyəti." />
      <div className="stats">
        <Stat to="/admin/manufacturers" label="İstehsalçılar" total={d.manufacturers.length} pub={pub(d.manufacturers)} />
        <Stat to="/admin/generators" label="Generatorlar" total={d.generators.length} pub={pub(d.generators)} />
        <Stat to="/admin/parts" label="Ehtiyat hissələri" total={d.parts.length} pub={pub(d.parts)} />
        <div className="stat">
          <span className="stat__label">Dərc olunmuş məhsul</span>
          <b className="stat__num">{pub(d.generators) + pub(d.parts)}</b>
          <span className="stat__sub">Qaralama: {d.generators.length + d.parts.length - pub(d.generators) - pub(d.parts)}</span>
        </div>
        <Stat to="/admin/inquiries" label="Yeni sorğular" total={newInq} sub={`Ümumi: ${d.inquiries.length}`} />
      </div>

      <div className="grid grid--2-1">
        <Card title="Son əlavə olunan məhsullar">
          {recent.length === 0 ? (
            <p className="empty">Hələ məhsul yoxdur.</p>
          ) : (
            <ul className="recent">
              {recent.map((r) => (
                <li key={`${r.kind}-${r.id}`}>
                  <Thumb src={r.img?.thumbUrl ?? r.img?.url} />
                  <div>
                    <GuardedLink to={`/admin/${r.kind === 'generator' ? 'generators' : 'parts'}/${r.id}`}>{r.title}</GuardedLink>
                    <small>
                      {r.kind === 'generator' ? 'Generator' : 'Ehtiyat hissəsi'} · {fmtDate(r.at)}
                    </small>
                  </div>
                  <span className="recent__badges">
                    {r.demo && <DemoBadge />}
                    <Badge tone={r.status === 'published' ? 'ok' : 'warn'}>{r.status === 'published' ? 'Dərc' : 'Qaralama'}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="stack">
          <Card title="Sürətli keçidlər">
            <div className="quick">
              <GuardedLink className="btn" to="/admin/generators/new">+ Generator</GuardedLink>
              <GuardedLink className="btn" to="/admin/parts/new">+ Ehtiyat hissəsi</GuardedLink>
              <GuardedLink className="btn" to="/admin/manufacturers/new">+ İstehsalçı</GuardedLink>
              <GuardedLink className="btn" to="/admin/settings">Tənzimləmələr</GuardedLink>
            </div>
          </Card>
          <Card title="Demo məlumat">
            <p className="hint">
              Hazırda <b>{demoCount}</b> demo qeyd var. Demo qeydlər “Demo” işarəsi daşıyır və real şirkət qeydlərindən ayrılır — silmək real qeydlərə toxunmur.
            </p>
            <div className="quick">
              <button type="button" className="btn" disabled={busy || !tools.install} title={tools.installBlockedReason} onClick={() => run('install')}>
                Demo məlumatı yüklə
              </button>
              <button type="button" className="btn btn--danger-ghost" disabled={busy || demoCount === 0} onClick={() => run('remove')}>
                Demo məlumatı sil
              </button>
            </div>
            {!tools.install && <p className="hint">{tools.installBlockedReason}</p>}
            {report && (
              <div className="alert alert--ok" role="status">
                {report.kind === 'install' ? 'Yükləmə tamamlandı' : 'Silmə tamamlandı'}: əlavə edilən {report.r.added}, silinən {report.r.removed}, ayrılan real bağlantı {report.r.detached}{report.r.skipped ? `, toxunulmayan (demo identifikatoru olmayan) ${report.r.skipped}` : ''}.
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

function Stat({ to, label, total, pub, sub }: { to: string; label: string; total: number; pub?: number; sub?: string }) {
  return (
    <GuardedLink to={to} className="stat">
      <span className="stat__label">{label}</span>
      <b className="stat__num">{total}</b>
      <span className="stat__sub">{pub !== undefined ? `Dərc: ${pub} · Qaralama: ${total - pub}` : sub}</span>
    </GuardedLink>
  )
}
