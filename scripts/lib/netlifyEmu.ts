import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

/**
 * Minimal emulation of how Netlify serves a `dist/` folder, used to verify REAL HTTP responses locally and in tests:
 * real files first (with "pretty URLs": /a → /a/index.html or /a.html), then `_redirects` rewrites (status 200),
 * otherwise `404.html` with HTTP 404. (Headers from netlify.toml are not emulated.)
 */
export function createDistServer(dist: string): http.Server {
  const rules = fs
    .readFileSync(path.join(dist, '_redirects'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const [from, to, status] = l.split(/\s+/)
      return { from, to, status: Number(status) }
    })

  const mime: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.txt': 'text/plain; charset=utf-8',
    '.woff2': 'font/woff2',
    '.ico': 'image/x-icon',
  }
  const isFile = (f: string) => f.startsWith(dist) && fs.existsSync(f) && fs.statSync(f).isFile()
  const resolve = (p: string): string | null => {
    const base = path.join(dist, p)
    for (const c of [base, path.join(base, 'index.html'), `${base}.html`]) if (isFile(c)) return c
    return null
  }
  const matches = (from: string, p: string) => (from.endsWith('/*') ? p === from.slice(0, -2) || p.startsWith(from.slice(0, -1)) : p === from)

  return http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const p = decodeURIComponent(url.pathname)
    const send = (file: string, status: number) => {
      res.writeHead(status, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream' })
      res.end(fs.readFileSync(file))
    }
    const hit = resolve(p)
    if (hit) return send(hit, 200)
    const rule = rules.find((r) => matches(r.from, p))
    if (rule) return send(path.join(dist, rule.to), rule.status)
    return send(path.join(dist, '404.html'), 404)
  })
}
