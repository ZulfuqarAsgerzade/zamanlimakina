// Build-dən sonra işləyir: React tətbiqini HTML-ə çevirib dist/index.html-ə yerləşdirir.
// Brauzerdə main.tsx həmin HTML-i "hydrate" edir.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const ssrDir = path.join(root, 'dist-ssr')
const indexFile = path.join(root, 'dist', 'index.html')

const entry = fs.readdirSync(ssrDir).find((f) => /^entry-server\.(m?js)$/.test(f))
if (!entry) throw new Error('dist-ssr/entry-server tapılmadı')
const { render } = await import(pathToFileURL(path.join(ssrDir, entry)).href)

const html = fs.readFileSync(indexFile, 'utf8')
const marker = '<div id="root"></div>'
if (!html.includes(marker)) throw new Error('dist/index.html-də boş #root tapılmadı (artıq prerender olunub?)')

const app = render()
if (!app || app.length < 1000) throw new Error('Prerender nəticəsi gözlənildiyindən qısadır')

fs.writeFileSync(indexFile, html.replace(marker, `<div id="root">${app}</div>`))
fs.rmSync(ssrDir, { recursive: true, force: true })
console.log(`[prerender] dist/index.html — ${(app.length / 1024).toFixed(1)} KB HTML yerləşdirildi`)
