import { StaticRouter } from 'react-router'
import { prerender } from 'react-dom/static'
import App from './App.tsx'
import { HeadCollectorContext, renderHeadHtml } from './lib/head.ts'
import type { HeadCollector, HeadSpec } from './lib/head.ts'
import type { Snapshot } from './data/types.ts'

export { renderHeadHtml }

/**
 * Server entry used ONLY by `scripts/prerender.ts` at build time (never shipped to the browser).
 * `prerender` waits for every lazy route chunk, so the returned HTML is the complete page; the page's head
 * (title, canonical, hreflang, Open Graph, JSON-LD) is captured through the HeadCollector context.
 */
export async function render(url: string, snapshot: Snapshot): Promise<{ html: string; head: HeadSpec | null }> {
  const collector: HeadCollector = { spec: null }
  const { prelude } = await prerender(
    <HeadCollectorContext.Provider value={collector}>
      <StaticRouter location={url}>
        <App initial={snapshot} />
      </StaticRouter>
    </HeadCollectorContext.Provider>,
    {
      onError(error) {
        throw error
      },
    },
  )
  const html = await new Response(prelude).text()
  return { html, head: collector.spec }
}
