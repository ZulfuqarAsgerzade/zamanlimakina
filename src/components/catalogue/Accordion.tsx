import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { IconPlus } from '../ui/Icons.tsx'

export interface AccordionItem {
  id: string
  title: string
  body: ReactNode
}

export function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null)
  const uid = useId()
  return (
    <div className="acc">
      {items.map((it) => {
        const isOpen = open === it.id
        return (
          <div key={it.id} className="acc__item" data-open={isOpen}>
            <h3>
              <button
                type="button"
                className="acc__btn"
                aria-expanded={isOpen}
                aria-controls={`${uid}-${it.id}`}
                id={`${uid}-h-${it.id}`}
                onClick={() => setOpen(isOpen ? null : it.id)}
              >
                <span>{it.title}</span>
                <IconPlus />
              </button>
            </h3>
            <div id={`${uid}-${it.id}`} role="region" aria-labelledby={`${uid}-h-${it.id}`} className="acc__panel" hidden={!isOpen}>
              <div className="acc__body">{it.body}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
