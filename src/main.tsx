import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router'

import '@fontsource-variable/inter/wght.css'
import '@fontsource-variable/inter-tight/wght.css'
import '@fontsource/rajdhani/latin-600.css'
import '@fontsource/rajdhani/latin-700.css'

import './styles/base.css'
import './styles/layout.css'
import './styles/catalogue.css'
import './styles/pages.css'
import App from './App'
import { resolveMode } from './data/index.ts'
import type { Snapshot } from './data/types.ts'

const root = document.getElementById('root')!

/**
 * Prerendered pages (see scripts/prerender.ts) carry <meta name="zm-prerender" content="/path">.
 * In production (Supabase) the build-time snapshot lets the very first client render equal the prerendered HTML:
 *   • same URL, no query string → hydrate the HTML (no flash, nothing re-created);
 *   • same page but with a query string (shared filter/search links render a different list) → render client-side from the
 *     snapshot, instantly, instead of hydrating HTML that would not match.
 * The live data is then fetched in the background. In every other case (demo mode, SPA shell, other path) the app renders from scratch.
 */
/**
 * A DATA router (createBrowserRouter) is required for `useBlocker`, which protects unsaved admin forms on Back/Forward.
 * It has a single splat route that renders the existing <Routes> tree, so every URL, locale prefix and lazy page works exactly
 * as before (the prerender step keeps using StaticRouter — the public pages never call useBlocker).
 */
const appRouter = (initial?: Snapshot) => createBrowserRouter([{ path: '*', element: <App initial={initial} /> }])

async function start() {
  const normalize = (p: string) => p.replace(/\/+$/, '') || '/'
  const marker = document.querySelector('meta[name="zm-prerender"]')?.getAttribute('content')
  const isAdmin = location.pathname.startsWith('/admin')
  if (marker && !isAdmin && normalize(marker) === normalize(location.pathname) && resolveMode() === 'supabase') {
    try {
      const res = await fetch('/_snapshot.json', { cache: 'no-cache' })
      const snapshot = (await res.json()) as Snapshot
      if (snapshot.source === 'supabase') {
        const tree = (
          <StrictMode>
            <RouterProvider router={appRouter(snapshot)} />
          </StrictMode>
        )
        if (location.search) createRoot(root).render(tree)
        else hydrateRoot(root, tree)
        return
      }
    } catch {
      /* fall through to a normal client render */
    }
  }
  createRoot(root).render(
    <StrictMode>
      <RouterProvider router={appRouter()} />
    </StrictMode>,
  )
}
void start()
