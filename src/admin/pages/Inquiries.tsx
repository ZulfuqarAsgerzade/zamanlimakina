import type { Inquiry, InquiryStatus } from '../../data/types.ts'
import { useAdminData, useStore } from '../ctx.tsx'
import { Badge, DataTable, PageHeader, useConfirm, useToast } from '../ui.tsx'
import type { Column } from '../ui.tsx'
import { errMsg, fmtDate } from '../util.ts'

const STATUS: Record<InquiryStatus, { label: string; tone: 'warn' | 'info' | 'ok' }> = {
  new: { label: 'Yeni', tone: 'warn' },
  read: { label: 'Oxunub', tone: 'info' },
  done: { label: 'Tamamlanıb', tone: 'ok' },
}

export function InquiriesPage() {
  const d = useAdminData()
  const store = useStore()
  const toast = useToast()
  const confirm = useConfirm()
  const rows = [...d.inquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  async function setStatus(i: Inquiry, status: InquiryStatus) {
    try {
      await store.save('inquiries', { ...i, status })
      await d.reload()
    } catch (e) {
      toast.error(errMsg(e))
    }
  }
  async function del(i: Inquiry) {
    if (!(await confirm({ title: `“${i.name}” sorğusu silinsin?`, message: 'Bu əməliyyat geri qaytarılmır.', confirmLabel: 'Sil', danger: true }))) return
    try {
      await store.remove('inquiries', i.id)
      await d.reload()
      toast.success('Sorğu silindi.')
    } catch (e) {
      toast.error(errMsg(e))
    }
  }

  const cols: Column<Inquiry>[] = [
    { key: 'date', header: 'Tarix', render: (i) => fmtDate(i.createdAt) },
    {
      key: 'who',
      header: 'Ad / telefon',
      render: (i) => (
        <span className="cell-stack">
          <b>{i.name}</b>
          <a href={`tel:${i.phone.replace(/[^\d+]/g, '')}`}>{i.phone}</a>
        </span>
      ),
    },
    { key: 'product', header: 'Məhsul', render: (i) => i.product || '—' },
    { key: 'msg', header: 'Mesaj', className: 'col-wide', render: (i) => i.message || '—' },
    { key: 'status', header: 'Status', render: (i) => <Badge tone={STATUS[i.status].tone}>{STATUS[i.status].label}</Badge> },
    {
      key: 'actions',
      header: 'Əməliyyatlar',
      className: 'col-actions',
      render: (i) => (
        <span className="row-actions">
          {i.status === 'new' && (
            <button type="button" className="btn btn--sm" onClick={() => setStatus(i, 'read')} aria-label={`Oxunmuş et: ${i.name}`}>
              Oxunub
            </button>
          )}
          {i.status !== 'done' && (
            <button type="button" className="btn btn--sm" onClick={() => setStatus(i, 'done')} aria-label={`Tamamlanmış et: ${i.name}`}>
              Tamamlandı
            </button>
          )}
          <button type="button" className="btn btn--sm btn--danger-ghost" onClick={() => del(i)} aria-label={`Sil: ${i.name}`}>
            Sil
          </button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Sorğular" sub="Saytdakı əlaqə formasından daxil olan sorğular. Əsas sorğu kanalı WhatsApp-dır." />
      <DataTable rows={rows} columns={cols} rowLabel={(i) => i.name} empty="Hələ sorğu daxil olmayıb." />
    </>
  )
}
