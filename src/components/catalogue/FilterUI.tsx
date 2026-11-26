import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useI18n } from '../../i18n/I18nContext.tsx'
import { closeDialog, openDialog } from '../ui/dialog.ts'
import { IconChevron, IconClose } from '../ui/Icons.tsx'

export interface FacetOption {
  value: string
  label: string
  count: number
}

export function FilterGroup({
  title,
  options,
  selected,
  onToggle,
  defaultOpen = true,
}: {
  title: string
  options: FacetOption[]
  selected: string[]
  onToggle: (value: string) => void
  defaultOpen?: boolean
}) {
  if (!options.length) return null
  return (
    <details className="fgroup" open={defaultOpen}>
      <summary>
        <span>{title}</span>
        <IconChevron />
      </summary>
      <ul>
        {options.map((o) => {
          const on = selected.includes(o.value)
          return (
            <li key={o.value}>
              <label className="check" data-disabled={!on && o.count === 0}>
                <input type="checkbox" checked={on} onChange={() => onToggle(o.value)} disabled={!on && o.count === 0} />
                <span>{o.label}</span>
                <span className="count">{o.count}</span>
              </label>
            </li>
          )
        })}
      </ul>
    </details>
  )
}

export const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/** Modal bottom-sheet drawer (native <dialog>: focus trap + Esc for free). Used for mobile filters. */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const { t } = useI18n()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open) openDialog(d)
    else closeDialog(d)
    document.body.classList.toggle('is-locked', open)
    return () => document.body.classList.remove('is-locked')
  }, [open])
  return (
    <dialog ref={ref} className="drawer" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-label={title}>
      <div className="drawer__panel">
        <header className="drawer__head">
          <h2 className="h3">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <IconClose />
          </button>
        </header>
        <div className="drawer__body">{children}</div>
        {footer && <footer className="drawer__foot">{footer}</footer>}
      </div>
    </dialog>
  )
}

export function ActiveChips({
  chips,
  onClear,
  clearLabel,
}: {
  chips: Array<{ key: string; label: string; remove: () => void }>
  onClear: () => void
  clearLabel: string
}) {
  const { t } = useI18n()
  if (!chips.length) return null
  return (
    <div className="chips" aria-label={t('cat.activeFilters')}>
      {chips.map((c) => (
        <button key={c.key} type="button" className="chip" onClick={c.remove} aria-label={`${c.label} — ${t('common.clear')}`}>
          {c.label}
          <IconClose />
        </button>
      ))}
      <button type="button" className="chip chip--clear" onClick={onClear}>
        {clearLabel}
      </button>
    </div>
  )
}
