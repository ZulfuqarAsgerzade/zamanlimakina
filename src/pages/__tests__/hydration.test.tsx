import { StrictMode } from 'react'
import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import App from '../../App.tsx'
import fs from 'node:fs'
import path from 'node:path'
import { loadSnapshot } from '../../../scripts/lib/loadSnapshot.ts'

/**
 * Production (Supabase) hydrates the prerendered HTML with the build-time snapshot. If the server and client trees
 * differed, React would report a hydration mismatch and discard the server HTML. Here the same snapshot is rendered
 * into the prerendered HTML and hydrated in jsdom; any error/warning fails the test.
 */
const dist = path.resolve(import.meta.dirname, '../../../dist')
const built = fs.existsSync(path.join(dist, 'generatorlar/perkins-1104a-44tg2/index.html'))

// The server HTML comes from the real build output (dist/**/index.html), not from rendering in this process:
// React's server and client renderers share context state, so mixing them in one process is not representative.
describe.skipIf(!built)('prerender → hydrate (needs `npm run build`)', () => {
  const urls = ['/', '/generatorlar', '/generatorlar/perkins-1104a-44tg2', '/ru/generatory/perkins-1106a-70tag4', '/en/spare-parts/cm-oil', '/brendler/perkins']
  for (const url of urls) {
    it(`hydrates ${url} without mismatches`, async () => {
      const { snapshot } = await loadSnapshot({ VITE_DATA_MODE: 'demo' } as NodeJS.ProcessEnv)
      const file = path.join(dist, url === '/' ? '' : url, 'index.html')
      const page = fs.readFileSync(file, 'utf8')
      const html = page.slice(page.indexOf('<div id="root">') + '<div id="root">'.length, page.lastIndexOf('</div>\n  </body>'))
      expect(html.length).toBeGreaterThan(5000)
      expect(html).toContain('<h1')
      expect(html).toContain('</footer>')
      const container = document.createElement('div')
      container.innerHTML = html
      document.body.appendChild(container)

      const errors: unknown[] = []
      const spy = vi.spyOn(console, 'error').mockImplementation((...a) => void errors.push(a))
      // real production hydrates with the live data store; here only the first (snapshot) render matters
      ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
      let root!: ReturnType<typeof hydrateRoot>
      await act(async () => {
        root = hydrateRoot(
          container,
          <StrictMode>
            <MemoryRouter initialEntries={[url]}>
              <App initial={snapshot} />
            </MemoryRouter>
          </StrictMode>,
          { onRecoverableError: (e) => void errors.push(e) },
        )
      })
      spy.mockRestore()
      expect(errors.map(String)).toEqual([])
      expect(container.querySelector('h1')).not.toBeNull()
      await act(async () => root.unmount()) // no pending React work may outlive the jsdom environment
      container.remove()
    })
  }
})
