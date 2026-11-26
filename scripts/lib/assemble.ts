import type { HeadSpec } from '../../src/lib/head.ts'

const strip = (html: string) =>
  html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[\s\S]*?>/i, '')
    .replace(/<meta\s+property="og:[^"]*"[\s\S]*?>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[\s\S]*?>/gi, '')

/** Builds one prerendered page from the app shell: head tags + marker in <head>, rendered markup in #root. */
export function assemblePage(
  shell: string,
  urlPath: string,
  html: string,
  head: HeadSpec,
  renderHeadHtml: (h: HeadSpec) => string,
): string {
  let out = strip(shell)
  out = out.replace(/<html lang="[^"]*"/, () => `<html lang="${head.locale}"`)
  // replacer FUNCTIONS: a string replacement would interpret `$&`, `$'`, `$$` … which may legitimately occur in product text
  const headHtml = `    ${renderHeadHtml(head)}\n    <meta name="zm-prerender" content="${urlPath}">\n  </head>`
  out = out.replace('</head>', () => headHtml)
  return out.replace('<div id="root"></div>', () => `<div id="root">${html}</div>`)
}
