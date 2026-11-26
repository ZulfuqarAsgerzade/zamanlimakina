/** Only absolute http(s) URLs may become links (blocks javascript:, data:, vbscript: … even if stored by mistake). */
export function safeHttpUrl(value: string | undefined | null): string | undefined {
  const v = (value ?? '').trim()
  if (!v) return undefined
  try {
    const u = new URL(v)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : undefined
  } catch {
    return undefined
  }
}
