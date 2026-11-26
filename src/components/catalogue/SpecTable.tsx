import type { Generator, Part, SpecGroup } from '../../data/types.ts'
import { useI18n } from '../../i18n/I18nContext.tsx'
import { pick } from '../../lib/text.ts'

/** Professional spec table. Rows without a value — and groups without rows — are never rendered. */
export function SpecTable({ groups }: { groups: SpecGroup[] }) {
  const { locale } = useI18n()
  const visible = groups
    .map((g) => ({
      g,
      items: g.items
        .map((i) => ({ i, value: pick(i.value, locale).value.trim(), label: pick(i.label, locale).value }))
        .filter((r) => r.value && r.label),
    }))
    .filter((x) => x.items.length > 0)
  if (!visible.length) return null
  return (
    <div className="specs">
      {visible.map(({ g, items }) => (
        <section key={g.id} className="specs__group">
          <h3 className="specs__title">{pick(g.title, locale).value}</h3>
          <dl className="specs__list">
            {items.map(({ i, value, label }) => (
              <div key={i.id} className="specs__row">
                <dt>{label}</dt>
                <dd>
                  <span className="num">{value}</span>
                  {i.unit && <span className="specs__unit"> {i.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}

export const hasSpecs = (item: Generator | Part) =>
  item.specGroups.some((g) => g.items.some((i) => Object.values(i.value).some((v) => v?.trim())))
