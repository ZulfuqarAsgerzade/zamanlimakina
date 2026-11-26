import type { ReactNode } from 'react'
import { Breadcrumbs } from '../components/ui/Bits.tsx'
import type { Crumb } from '../components/ui/Bits.tsx'

export function PageHeader({ crumbs, title, lead, children, aside }: { crumbs: Crumb[]; title: string; lead?: string; children?: ReactNode; aside?: ReactNode }) {
  return (
    <section className="phead">
      <div className="container">
        <Breadcrumbs items={crumbs} />
        <div className="phead__row">
          <div>
            <h1 className="h1">{title}</h1>
            {lead && <p className="lead">{lead}</p>}
            {children}
          </div>
          {aside && <div className="phead__aside">{aside}</div>}
        </div>
      </div>
    </section>
  )
}
