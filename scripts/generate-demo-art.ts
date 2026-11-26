/**
 * Generates the DEMO artwork in public/demo/*.svg (technical illustrations on a transparent
 * background — generator sets for every build type, a control-panel detail, and spare-part icons).
 * These are placeholders used by the demo catalogue until real photography is uploaded in the
 * admin media library. Run: `npm run demo:art`
 */
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve(import.meta.dirname, '..', 'public', 'demo')
fs.mkdirSync(OUT, { recursive: true })

const C = {
  carbon: '#0B0E13',
  carbon2: '#161B24',
  carbon3: '#232B38',
  amber: '#F4B400',
  amberLight: '#FFCB3D',
  amberDark: '#D49A00',
  amberDeep: '#B07F00',
  steel: '#4A5568',
  steelLight: '#8B96A6',
  steelPale: '#C9D0DA',
  red: '#D92C20',
}

const svg = (w: number, h: number, body: string, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">\n<defs>${defs}</defs>\n${body}\n</svg>\n`

/** shared gradient / pattern definitions */
const DEFS = `
<linearGradient id="amber" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${C.amberLight}"/><stop offset=".12" stop-color="${C.amber}"/><stop offset="1" stop-color="${C.amberDark}"/>
</linearGradient>
<linearGradient id="amberDark" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${C.amberDark}"/><stop offset="1" stop-color="${C.amberDeep}"/>
</linearGradient>
<linearGradient id="steel" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="${C.steel}"/><stop offset=".28" stop-color="${C.steelPale}"/><stop offset=".55" stop-color="${C.steelLight}"/><stop offset="1" stop-color="${C.steel}"/>
</linearGradient>
<linearGradient id="steelV" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${C.steelPale}"/><stop offset="1" stop-color="${C.steel}"/>
</linearGradient>
<linearGradient id="carbon" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${C.carbon3}"/><stop offset="1" stop-color="${C.carbon}"/>
</linearGradient>
<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset=".28" stop-color="#fff" stop-opacity=".04"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/>
</linearGradient>
<pattern id="hazard" width="28" height="14" patternUnits="userSpaceOnUse" patternTransform="skewX(-35)">
  <rect width="28" height="14" fill="${C.amber}"/><rect width="14" height="14" fill="${C.carbon}"/>
</pattern>
<filter id="blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
`

const shadow = (cx: number, cy: number, rx: number) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="20" fill="${C.carbon}" opacity=".22" filter="url(#blur)"/>`

const slats = (x: number, y: number, w: number, h: number, step = 20, fill = C.carbon2) => {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${C.carbon}"/>`
  for (let yy = y + 8; yy < y + h - 10; yy += step) {
    s += `<rect x="${x + 6}" y="${yy}" width="${w - 12}" height="${step - 9}" rx="2" fill="${fill}"/>`
    s += `<rect x="${x + 6}" y="${yy}" width="${w - 12}" height="2" fill="#fff" opacity=".12"/>`
  }
  return s
}

const bolt = (x: number, y: number, s = 1, fill = C.amber) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M30 0 4 42h20l-8 38L52 30H32z" fill="${fill}"/>`

const lift = (x: number, y: number) =>
  `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${C.carbon}" stroke-width="5"/><rect x="${x - 7}" y="${y + 8}" width="14" height="8" fill="${C.carbon}"/>`

const silencer = (x: number, top: number, bodyTop: number) =>
  `<rect x="${x + 22}" y="${top + 14}" width="36" height="${bodyTop - top + 70}" fill="url(#steel)"/>
   <rect x="${x - 14}" y="${bodyTop + 52}" width="108" height="56" rx="14" fill="url(#steel)"/>
   <rect x="${x - 14}" y="${bodyTop + 52}" width="108" height="56" rx="14" fill="url(#sheen)"/>
   <rect x="${x + 4}" y="${bodyTop + 52}" width="5" height="56" fill="${C.carbon}" opacity=".28"/>
   <rect x="${x + 71}" y="${bodyTop + 52}" width="5" height="56" fill="${C.carbon}" opacity=".28"/>
   <rect x="${x + 16}" y="${top + 28}" width="48" height="8" rx="2" fill="${C.carbon}" opacity=".3"/>
   <path d="M${x + 12} ${top + 16} q28 -22 56 0 z" fill="${C.carbon2}"/>
   <rect x="${x + 36}" y="${top + 8}" width="8" height="10" fill="${C.carbon2}"/>`

const controlPanel = (x: number, y: number, w: number, h: number, kva = '000') => {
  const sx = x + 16
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${C.carbon}"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="none" stroke="${C.steel}" stroke-width="2"/>
  <rect x="${sx}" y="${y + 16}" width="${w - 32}" height="${h * 0.38}" rx="4" fill="#0A1118" stroke="${C.carbon3}" stroke-width="2"/>
  <rect x="${sx + 8}" y="${y + 24}" width="${(w - 48) * 0.55}" height="6" fill="${C.amber}" opacity=".9"/>
  <rect x="${sx + 8}" y="${y + 38}" width="${(w - 48) * 0.8}" height="4" fill="${C.amber}" opacity=".45"/>
  <rect x="${sx + 8}" y="${y + 48}" width="${(w - 48) * 0.65}" height="4" fill="${C.amber}" opacity=".45"/>
  <text x="${sx + (w - 32) - 12}" y="${y + h * 0.38 + 6}" text-anchor="end" font-family="Arial, sans-serif" font-weight="700" font-size="${Math.round(h * 0.13)}" fill="${C.amberLight}">${kva}</text>
  ${[0, 1, 2, 3].map((i) => `<circle cx="${sx + 14 + i * 28}" cy="${y + h * 0.64}" r="8" fill="${C.carbon3}" stroke="${C.steel}" stroke-width="2"/>`).join('')}
  <circle cx="${x + w - 40}" cy="${y + h * 0.64}" r="15" fill="${C.red}" stroke="#7a1812" stroke-width="3"/>
  <rect x="${sx}" y="${y + h * 0.8}" width="${w - 32}" height="8" rx="3" fill="${C.carbon3}"/>
  <rect x="${sx}" y="${y + h * 0.8}" width="${(w - 32) * 0.34}" height="8" rx="3" fill="${C.amber}"/>`
}

/* ───────────────────────── generator side views ───────────────────────── */

function canopySide(): string {
  return `
  ${shadow(600, 648, 520)}
  <rect x="140" y="596" width="920" height="46" rx="4" fill="url(#carbon)"/>
  <rect x="300" y="606" width="120" height="14" rx="2" fill="${C.carbon3}"/><rect x="780" y="606" width="120" height="14" rx="2" fill="${C.carbon3}"/>
  <rect x="170" y="640" width="70" height="10" rx="2" fill="${C.carbon}"/><rect x="960" y="640" width="70" height="10" rx="2" fill="${C.carbon}"/>
  ${silencer(918, 96, 128)}
  <rect x="150" y="250" width="900" height="350" rx="8" fill="url(#amber)"/>
  <rect x="140" y="234" width="920" height="30" rx="7" fill="url(#amberDark)"/>
  <rect x="140" y="234" width="920" height="6" rx="3" fill="#fff" opacity=".28"/>
  ${lift(196, 224)}${lift(1004, 224)}
  ${slats(180, 292, 224, 262)}
  <path d="M432 262v318M722 262v318" stroke="${C.carbon}" stroke-opacity=".34" stroke-width="3"/>
  <rect x="446" y="404" width="14" height="60" rx="5" fill="${C.carbon}"/><rect x="736" y="404" width="14" height="60" rx="5" fill="${C.carbon}"/>
  <rect x="460" y="292" width="228" height="86" rx="8" fill="${C.carbon}"/>
  ${bolt(494, 296, 1.05)}
  <rect x="560" y="312" width="104" height="8" rx="2" fill="${C.amber}"/><rect x="560" y="332" width="76" height="6" rx="2" fill="${C.amber}" opacity=".6"/><rect x="560" y="348" width="90" height="6" rx="2" fill="${C.amber}" opacity=".6"/>
  ${controlPanel(758, 306, 252, 190, '000')}
  <rect x="150" y="572" width="900" height="20" fill="url(#hazard)" opacity=".95"/>
  <rect x="150" y="250" width="900" height="350" rx="8" fill="url(#sheen)"/>`
}

function openSide(): string {
  return `
  ${shadow(600, 648, 500)}
  <rect x="150" y="560" width="900" height="40" rx="4" fill="url(#carbon)"/>
  <rect x="190" y="600" width="820" height="40" rx="6" fill="${C.carbon2}"/><rect x="190" y="600" width="820" height="6" fill="#fff" opacity=".1"/>
  <rect x="180" y="636" width="64" height="10" fill="${C.carbon}"/><rect x="956" y="636" width="64" height="10" fill="${C.carbon}"/>
  <rect x="170" y="330" width="170" height="232" rx="8" fill="${C.carbon}"/>
  ${Array.from({ length: 11 }, (_, i) => `<rect x="180" y="${344 + i * 19}" width="150" height="8" fill="${C.steel}" opacity=".85"/>`).join('')}
  <circle cx="255" cy="446" r="64" fill="none" stroke="${C.steelLight}" stroke-width="5" opacity=".55"/>
  <rect x="340" y="318" width="360" height="244" rx="10" fill="url(#carbon)"/>
  <rect x="340" y="318" width="360" height="40" rx="8" fill="url(#amber)"/>
  ${Array.from({ length: 4 }, (_, i) => `<rect x="${372 + i * 80}" y="372" width="56" height="150" rx="6" fill="${C.carbon3}"/><rect x="${372 + i * 80}" y="372" width="56" height="5" fill="#fff" opacity=".14"/>`).join('')}
  <rect x="700" y="364" width="64" height="190" fill="${C.steel}"/>
  <rect x="764" y="338" width="240" height="224" rx="26" fill="url(#steel)"/>
  <rect x="764" y="338" width="240" height="224" rx="26" fill="url(#sheen)"/>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${786 + i * 26}" y="344" width="6" height="212" fill="${C.carbon}" opacity=".28"/>`).join('')}
  <rect x="1004" y="410" width="34" height="100" rx="6" fill="${C.carbon2}"/>
  ${silencer(560, 130, 150)}
  <rect x="396" y="150" width="14" height="168" fill="${C.carbon3}"/>
  <rect x="770" y="236" width="190" height="104" rx="8" fill="url(#amber)"/>
  ${controlPanel(780, 244, 170, 88, '000')}
  <rect x="150" y="548" width="900" height="14" fill="url(#hazard)" opacity=".9"/>`
}

function containerSide(): string {
  const ribs = Array.from({ length: 44 }, (_, i) => `<rect x="${112 + i * 22}" y="252" width="5" height="326" fill="#000" opacity=".11"/><rect x="${117 + i * 22}" y="252" width="3" height="326" fill="#fff" opacity=".12"/>`).join('')
  return `
  ${shadow(600, 650, 560)}
  <rect x="90" y="596" width="1020" height="48" rx="4" fill="url(#carbon)"/>
  <rect x="110" y="640" width="90" height="10" fill="${C.carbon}"/><rect x="1000" y="640" width="90" height="10" fill="${C.carbon}"/>
  ${silencer(950, 74, 104)}
  <rect x="150" y="196" width="130" height="38" rx="5" fill="${C.carbon3}"/><rect x="330" y="196" width="130" height="38" rx="5" fill="${C.carbon3}"/>
  <rect x="100" y="230" width="1000" height="366" rx="6" fill="url(#amber)"/>
  ${ribs}
  <rect x="96" y="222" width="1008" height="30" rx="5" fill="${C.carbon}"/>
  <rect x="96" y="566" width="1008" height="32" rx="4" fill="${C.carbon}"/>
  ${[100, 1076].flatMap((x) => [222, 574].map((y) => `<rect x="${x - 4}" y="${y}" width="32" height="30" rx="3" fill="${C.carbon2}" stroke="${C.steel}" stroke-width="2"/>`)).join('')}
  <rect x="120" y="270" width="248" height="290" rx="6" fill="${C.carbon}"/>
  ${Array.from({ length: 13 }, (_, i) => `<rect x="130" y="${282 + i * 21}" width="228" height="10" rx="2" fill="${C.carbon3}"/>`).join('')}
  <rect x="420" y="276" width="270" height="92" rx="8" fill="${C.carbon}"/>
  ${bolt(450, 282, 1.1)}
  <rect x="530" y="300" width="130" height="9" rx="2" fill="${C.amber}"/><rect x="530" y="322" width="96" height="7" rx="2" fill="${C.amber}" opacity=".6"/><rect x="530" y="340" width="112" height="7" rx="2" fill="${C.amber}" opacity=".6"/>
  <rect x="780" y="262" width="286" height="300" rx="6" fill="none" stroke="${C.carbon}" stroke-opacity=".5" stroke-width="4"/>
  <path d="M923 262v300" stroke="${C.carbon}" stroke-opacity=".5" stroke-width="4"/>
  ${[860, 984].map((x) => `<rect x="${x}" y="330" width="10" height="150" rx="4" fill="${C.carbon}"/>`).join('')}
  ${controlPanel(430, 396, 250, 168, '000')}
  <rect x="100" y="230" width="1000" height="366" rx="6" fill="url(#sheen)"/>`
}

function trailerSide(): string {
  return `
  ${shadow(620, 650, 500)}
  <path d="M96 566 330 548v22L96 584z" fill="${C.carbon2}"/><circle cx="96" cy="574" r="14" fill="none" stroke="${C.carbon}" stroke-width="7"/>
  <rect x="190" y="574" width="12" height="52" fill="${C.steel}"/><circle cx="196" cy="632" r="18" fill="${C.carbon}"/><circle cx="196" cy="632" r="7" fill="${C.steelLight}"/>
  <rect x="226" y="544" width="754" height="34" rx="4" fill="url(#carbon)"/>
  <rect x="210" y="570" width="780" height="10" fill="${C.steel}"/>
  <path d="M470 566a92 92 0 0 1 184 0z" fill="url(#amberDark)"/><path d="M470 566a92 92 0 0 1 184 0" fill="none" stroke="${C.carbon}" stroke-width="5"/>
  <circle cx="562" cy="566" r="70" fill="${C.carbon}"/><circle cx="562" cy="566" r="46" fill="${C.carbon3}"/><circle cx="562" cy="566" r="16" fill="${C.amber}"/>
  ${Array.from({ length: 5 }, (_, i) => `<circle cx="${562 + 30 * Math.cos((i * 2 * Math.PI) / 5)}" cy="${566 + 30 * Math.sin((i * 2 * Math.PI) / 5)}" r="4" fill="${C.steelLight}"/>`).join('')}
  ${silencer(786, 126, 150)}
  <rect x="240" y="268" width="740" height="278" rx="8" fill="url(#amber)"/>
  <rect x="230" y="254" width="760" height="26" rx="6" fill="url(#amberDark)"/>
  ${lift(270, 246)}${lift(950, 246)}
  ${slats(266, 304, 170, 212)}
  <path d="M460 280v264M700 280v264" stroke="${C.carbon}" stroke-opacity=".34" stroke-width="3"/>
  <rect x="474" y="372" width="12" height="52" rx="4" fill="${C.carbon}"/>
  <rect x="484" y="304" width="196" height="64" rx="8" fill="${C.carbon}"/>${bolt(506, 306, 0.78)}
  <rect x="560" y="322" width="96" height="7" rx="2" fill="${C.amber}"/><rect x="560" y="340" width="70" height="6" rx="2" fill="${C.amber}" opacity=".6"/>
  ${controlPanel(720, 300, 232, 190, '000')}
  <rect x="240" y="268" width="740" height="278" rx="8" fill="url(#sheen)"/>`
}

/* ───────────────────────── end (rear) views ───────────────────────── */

function boxRear(kind: 'canopy' | 'container' | 'open' | 'trailer'): string {
  if (kind === 'open') {
    return `
    ${shadow(600, 648, 330)}
    <rect x="360" y="560" width="480" height="40" rx="4" fill="url(#carbon)"/><rect x="380" y="600" width="440" height="40" rx="6" fill="${C.carbon2}"/>
    <rect x="380" y="270" width="440" height="290" rx="10" fill="url(#carbon)"/>
    <rect x="380" y="270" width="440" height="34" rx="8" fill="url(#amber)"/>
    <circle cx="600" cy="430" r="120" fill="${C.carbon2}" stroke="${C.steel}" stroke-width="8"/>
    ${Array.from({ length: 24 }, (_, i) => `<line x1="600" y1="430" x2="${600 + 112 * Math.cos((i * Math.PI) / 12)}" y2="${430 + 112 * Math.sin((i * Math.PI) / 12)}" stroke="${C.steelLight}" stroke-width="2" opacity=".5"/>`).join('')}
    <circle cx="600" cy="430" r="34" fill="${C.steel}"/><circle cx="600" cy="430" r="14" fill="${C.carbon}"/>
    ${silencer(720, 130, 150)}
    <rect x="360" y="548" width="480" height="14" fill="url(#hazard)"/>`
  }
  const w = kind === 'container' ? 560 : 520
  const x = 600 - w / 2
  const top = kind === 'container' ? 220 : 252
  return `
  ${shadow(600, 648, w / 2 + 70)}
  <rect x="${x - 10}" y="596" width="${w + 20}" height="46" rx="4" fill="url(#carbon)"/>
  ${kind === 'trailer' ? `<circle cx="${x - 30}" cy="570" r="72" fill="${C.carbon}"/><circle cx="${x - 30}" cy="570" r="30" fill="${C.carbon3}"/><circle cx="${x + w + 30}" cy="570" r="72" fill="${C.carbon}"/><circle cx="${x + w + 30}" cy="570" r="30" fill="${C.carbon3}"/>` : ''}
  ${silencer(x + w - 130, 96, 126)}
  <rect x="${x}" y="${top}" width="${w}" height="${600 - top}" rx="8" fill="url(#amber)"/>
  <rect x="${x - 8}" y="${top - 16}" width="${w + 16}" height="30" rx="6" fill="url(#amberDark)"/>
  ${lift(x + 30, top - 26)}${lift(x + w - 30, top - 26)}
  ${slats(x + 36, top + 52, w - 72, 600 - top - 100)}
  <rect x="${x + 36}" y="${top + 16}" width="${w - 72}" height="26" rx="4" fill="${C.carbon}"/>${bolt(x + w / 2 - 12, top + 14, 0.42)}
  <rect x="${x}" y="572" width="${w}" height="20" fill="url(#hazard)"/>
  <rect x="${x}" y="${top}" width="${w}" height="${600 - top}" rx="8" fill="url(#sheen)"/>`
}

const panelOnly = (kva: string) => `
  ${shadow(600, 690, 330)}
  <rect x="270" y="110" width="660" height="560" rx="18" fill="url(#amber)"/>
  <rect x="270" y="110" width="660" height="560" rx="18" fill="url(#sheen)"/>
  <rect x="300" y="140" width="600" height="500" rx="10" fill="${C.carbon}"/>
  ${controlPanel(312, 156, 576, 468, kva)}
  ${[322, 878].flatMap((x) => [150, 630].map((y) => `<circle cx="${x}" cy="${y}" r="6" fill="${C.steelLight}"/>`)).join('')}`

/* ───────────────────────── spare parts ───────────────────────── */

const partShadow = `<ellipse cx="400" cy="650" rx="230" ry="18" fill="${C.carbon}" opacity=".2" filter="url(#blur)"/>`

const PARTS: Record<string, string> = {
  'oil-filter': `${partShadow}
    <rect x="262" y="590" width="276" height="44" rx="6" fill="url(#steel)"/>
    <rect x="250" y="236" width="300" height="360" rx="30" fill="url(#amber)"/>
    <rect x="250" y="236" width="300" height="360" rx="30" fill="url(#sheen)"/>
    <rect x="250" y="360" width="300" height="130" fill="${C.carbon}"/><rect x="250" y="360" width="300" height="6" fill="#fff" opacity=".18"/>
    ${bolt(364, 372, 1.1)}<rect x="420" y="394" width="92" height="9" rx="2" fill="${C.amber}"/><rect x="420" y="416" width="64" height="7" rx="2" fill="${C.amber}" opacity=".6"/>
    <rect x="320" y="190" width="160" height="56" rx="10" fill="url(#steel)"/><rect x="354" y="150" width="92" height="50" rx="8" fill="${C.steel}"/>`,
  'fuel-filter': `${partShadow}
    <rect x="270" y="560" width="260" height="84" rx="22" fill="${C.steelPale}" opacity=".55" stroke="${C.steel}" stroke-width="5"/>
    <rect x="276" y="600" width="248" height="38" rx="14" fill="${C.amber}" opacity=".55"/>
    <rect x="290" y="150" width="220" height="420" rx="24" fill="url(#steel)"/>
    <rect x="290" y="150" width="220" height="420" rx="24" fill="url(#sheen)"/>
    <rect x="290" y="300" width="220" height="110" fill="${C.carbon}"/>${bolt(330, 308, 0.95)}<rect x="396" y="330" width="86" height="9" rx="2" fill="${C.amber}"/>
    <rect x="236" y="170" width="328" height="62" rx="14" fill="${C.carbon3}"/><rect x="200" y="186" width="56" height="30" rx="6" fill="${C.steel}"/><rect x="544" y="186" width="56" height="30" rx="6" fill="${C.steel}"/>`,
  'air-filter': `${partShadow}
    <ellipse cx="400" cy="590" rx="220" ry="56" fill="${C.carbon3}"/>
    <rect x="180" y="290" width="440" height="300" fill="${C.amberDark}"/>
    ${Array.from({ length: 22 }, (_, i) => `<rect x="${186 + i * 20}" y="290" width="9" height="300" fill="${i % 2 ? C.amber : C.amberLight}"/>`).join('')}
    <ellipse cx="400" cy="290" rx="220" ry="56" fill="url(#amber)"/>
    <ellipse cx="400" cy="290" rx="132" ry="32" fill="${C.carbon}"/><ellipse cx="400" cy="296" rx="132" ry="28" fill="${C.carbon3}"/>
    <path d="M180 290v300a220 56 0 0 0 440 0V290" fill="url(#sheen)"/>`,
  belt: `${partShadow}
    <rect x="130" y="250" width="540" height="300" rx="150" fill="none" stroke="${C.carbon}" stroke-width="46"/>
    <rect x="130" y="250" width="540" height="300" rx="150" fill="none" stroke="${C.carbon3}" stroke-width="10" stroke-dasharray="10 12"/>
    <circle cx="280" cy="400" r="86" fill="url(#steel)" stroke="${C.steel}" stroke-width="6"/><circle cx="280" cy="400" r="30" fill="${C.carbon}"/>
    <circle cx="540" cy="400" r="66" fill="url(#steel)" stroke="${C.steel}" stroke-width="6"/><circle cx="540" cy="400" r="22" fill="${C.carbon}"/>
    ${bolt(380, 388, 0.34)}`,
  sensor: `${partShadow}
    <rect x="352" y="130" width="96" height="190" rx="14" fill="${C.carbon}"/>${Array.from({ length: 5 }, (_, i) => `<rect x="364" y="${146 + i * 28}" width="72" height="8" rx="3" fill="${C.carbon3}"/>`).join('')}
    <path d="M330 320h140l20 70H310z" fill="url(#amber)"/>
    <polygon points="318,392 482,392 506,450 294,450" fill="url(#steel)"/>
    <rect x="352" y="450" width="96" height="170" fill="url(#steel)"/>${Array.from({ length: 8 }, (_, i) => `<rect x="350" y="${462 + i * 20}" width="100" height="6" rx="2" fill="${C.steel}"/>`).join('')}
    <rect x="378" y="620" width="44" height="26" rx="6" fill="${C.steelLight}"/>`,
  gasket: `${partShadow}
    <path d="M150 250c0-30 20-50 50-50h400c30 0 50 20 50 50v300c0 30-20 50-50 50H200c-30 0-50-20-50-50z" fill="${C.steelPale}" stroke="${C.steel}" stroke-width="6"/>
    ${[0, 1, 2].map((i) => `<ellipse cx="${260 + i * 140}" cy="400" rx="56" ry="104" fill="#fff" stroke="${C.steel}" stroke-width="6"/>`).join('')}
    ${[200, 600].flatMap((x) => [250, 550].map((y) => `<circle cx="${x}" cy="${y}" r="14" fill="#fff" stroke="${C.steel}" stroke-width="5"/>`)).join('')}
    <rect x="380" y="226" width="40" height="16" rx="4" fill="${C.amber}"/>`,
  thermostat: `${partShadow}
    <circle cx="400" cy="400" r="190" fill="url(#steel)" stroke="${C.steel}" stroke-width="6"/>
    <circle cx="400" cy="400" r="150" fill="${C.carbon3}"/><circle cx="400" cy="400" r="150" fill="none" stroke="${C.amber}" stroke-width="10"/>
    <path d="M400 290c-34 0-34 30 0 30s34 30 0 30-34 30 0 30 34 30 0 30-34 30 0 30" fill="none" stroke="${C.steelPale}" stroke-width="12" stroke-linecap="round"/>
    <circle cx="400" cy="400" r="28" fill="${C.amber}"/>
    ${[210, 590].map((x) => `<circle cx="${x}" cy="400" r="14" fill="${C.carbon}"/>`).join('')}`,
  electrical: `${partShadow}
    <rect x="170" y="230" width="460" height="380" rx="22" fill="url(#carbon)"/>
    <rect x="170" y="230" width="460" height="64" rx="18" fill="url(#amber)"/>${bolt(190, 232, 0.7, C.carbon)}
    <rect x="236" y="330" width="210" height="120" rx="8" fill="#0A1118" stroke="${C.carbon3}" stroke-width="3"/><text x="430" y="428" text-anchor="end" font-family="Arial, sans-serif" font-weight="700" font-size="64" fill="${C.amberLight}">24V</text>
    ${[0, 1, 2].map((i) => `<circle cx="${490 + i * 46}" cy="365" r="11" fill="${i === 0 ? '#3ddc84' : C.carbon3}"/>`).join('')}
    ${Array.from({ length: 9 }, (_, i) => `<rect x="${236 + i * 38}" y="496" width="22" height="64" rx="3" fill="${C.carbon3}"/>`).join('')}
    <rect x="130" y="440" width="40" height="22" rx="4" fill="${C.steel}"/><rect x="630" y="440" width="40" height="22" rx="4" fill="${C.steel}"/>`,
}

/* ───────────────────────── write files ───────────────────────── */

const write = (name: string, content: string) => fs.writeFileSync(path.join(OUT, name), content)

const gens = { canopy: canopySide, open: openSide, container: containerSide, trailer: trailerSide }
for (const [type, fn] of Object.entries(gens)) {
  write(`gen-${type}-side.svg`, svg(1200, 800, fn(), DEFS))
  write(`gen-${type}-rear.svg`, svg(1200, 800, boxRear(type as 'canopy'), DEFS))
  write(`gen-${type}-panel.svg`, svg(1200, 800, panelOnly(type === 'container' ? '500' : type === 'open' ? '220' : type === 'trailer' ? '033' : '100'), DEFS))
}
for (const [key, body] of Object.entries(PARTS)) write(`part-${key}.svg`, svg(800, 800, body, DEFS))

console.log(`[demo-art] wrote ${fs.readdirSync(OUT).length} files to public/demo`)
