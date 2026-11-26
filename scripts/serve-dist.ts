/** Serve ./dist with Netlify-like semantics (real files → _redirects rewrites → 404.html). Usage: npm run serve:dist [port] */
import path from 'node:path'
import { createDistServer } from './lib/netlifyEmu.ts'

const port = Number(process.argv[2] ?? 4180)
createDistServer(path.resolve(import.meta.dirname, '..', 'dist')).listen(port, '127.0.0.1', () =>
  console.log(`dist served at http://127.0.0.1:${port} (Netlify-like routing)`),
)
