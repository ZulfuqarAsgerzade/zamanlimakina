import { defaultHeroFacts } from '../data/defaults.ts'
import type { LText, SiteContent } from '../data/types.ts'

export interface ResolvedFact {
  id: string
  label: string
  value: string
}

/**
 * Facts for the hero strip in the active language.
 *  • content saved before the feature existed (`facts` undefined) → the documented defaults;
 *  • an item with an empty value is dropped; an empty label just shows the value;
 *  • no usable items (or an explicit empty list) → no strip at all.
 */
export function resolveHeroFacts(content: SiteContent, text: (t: LText | undefined) => string): ResolvedFact[] {
  const source = content.hero.facts ?? defaultHeroFacts()
  return source
    .map((f) => ({ id: f.id, label: text(f.label).trim(), value: text(f.value).trim() }))
    .filter((f) => f.value)
}
