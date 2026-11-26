import type { EntityName } from './types.ts'

/** camelCase (app) ↔ snake_case (Postgres) for TOP-LEVEL keys only; jsonb payloads keep their camelCase shape. */
const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())

export function toRow(rec: object): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(rec)) if (v !== undefined) out[toSnake(k)] = v
  return out
}

export function fromRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    // optional jsonb columns come back as null → treat as "not set"
    if (v === null && ['logo', 'cover', 'website', 'icon', 'thumb_url', 'path', 'width', 'height', 'size'].includes(k)) continue
    out[toCamel(k)] = v
  }
  return out as T
}

export const TABLE: Record<EntityName, string> = {
  manufacturers: 'manufacturers',
  categories: 'categories',
  generators: 'generators',
  parts: 'parts',
  media: 'media',
  inquiries: 'inquiries',
}
