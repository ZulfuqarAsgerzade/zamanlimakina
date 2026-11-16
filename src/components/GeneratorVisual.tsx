import { useId } from 'react'
import './GeneratorVisual.css'

interface GeneratorVisualProps {
  /** `hero`: kinematik, işıqlı kompozisiya. `blueprint`: texniki çərçivəli variant. */
  variant?: 'hero' | 'blueprint'
  /** Verilərsə, illüstrasiya əvəzinə bu fotoşəkil göstərilir (config → images). */
  photoSrc?: string
  photoAlt?: string
}

/**
 * Sənaye generatoru (canopy tipli generator qurğusu) — vektor illüstrasiya.
 * Heç bir konkret model, marka və ya texniki göstərici təsvir etmir.
 */
export function GeneratorVisual({ variant = 'hero', photoSrc, photoAlt = '' }: GeneratorVisualProps) {
  const uid = useId().replace(/:/g, '')
  const id = (n: string) => `${n}-${uid}`
  const u = (n: string) => `url(#${id(n)})`

  if (photoSrc) {
    return (
      <div className={`gv gv--photo gv--${variant}`}>
        <img src={photoSrc} alt={photoAlt} loading="eager" decoding="async" />
      </div>
    )
  }

  return (
    <div className={`gv gv--${variant}`}>
      <svg
        viewBox="0 0 900 600"
        role="img"
        aria-label="Sənaye generatoru qurğusunun illüstrasiyası"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={id('body')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a2a2a" />
            <stop offset="0.45" stopColor="#171717" />
            <stop offset="1" stopColor="#0c0c0c" />
          </linearGradient>
          <linearGradient id={id('roof')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b3b3b" />
            <stop offset="1" stopColor="#1b1b1b" />
          </linearGradient>
          <linearGradient id={id('steel')} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2b2b2b" />
            <stop offset="0.3" stopColor="#8d8d8d" />
            <stop offset="0.55" stopColor="#4a4a4a" />
            <stop offset="1" stopColor="#1f1f1f" />
          </linearGradient>
          <linearGradient id={id('yellow')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd84f" />
            <stop offset="0.55" stopColor="#f5b900" />
            <stop offset="1" stopColor="#b98a00" />
          </linearGradient>
          <linearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f5b900" stopOpacity="0" />
            <stop offset="0.3" stopColor="#ffd84f" stopOpacity="0.95" />
            <stop offset="0.75" stopColor="#f5b900" stopOpacity="0.9" />
            <stop offset="1" stopColor="#f5b900" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={id('sheen')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.09" />
            <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#f5b900" stopOpacity="0.08" />
          </linearGradient>
          <radialGradient id={id('floor')} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#f5b900" stopOpacity="0.5" />
            <stop offset="1" stopColor="#f5b900" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id('screen')} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#f5b900" stopOpacity="0.38" />
            <stop offset="1" stopColor="#f5b900" stopOpacity="0" />
          </radialGradient>
          <pattern id={id('louver')} width="12" height="14" patternUnits="userSpaceOnUse">
            <rect width="12" height="14" fill="#070707" />
            <rect y="5" width="12" height="1.6" fill="#ffffff" fillOpacity="0.09" />
            <rect y="6.6" width="12" height="4" fill="#161616" />
          </pattern>
          <pattern
            id={id('hazard')}
            width="26"
            height="26"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="26" height="26" fill="#0b0b0b" />
            <rect width="13" height="26" fill={u('yellow')} />
          </pattern>
        </defs>

        {/* Zəmin: işıq və kölgə */}
        <ellipse className="gv-glow" cx="450" cy="528" rx="430" ry="46" fill={u('floor')} />
        <ellipse cx="450" cy="516" rx="372" ry="13" fill="#000" fillOpacity="0.75" />

        {/* Xaric (egzoz) sistemi */}
        <g>
          <rect x="667" y="40" width="24" height="140" rx="4" fill={u('steel')} />
          <rect x="656" y="30" width="46" height="14" rx="3" fill={u('steel')} />
          <rect x="632" y="86" width="94" height="96" rx="16" fill={u('steel')} />
          <rect x="632" y="110" width="94" height="4" fill="#f5b900" fillOpacity="0.85" />
          <rect x="632" y="150" width="94" height="3" fill="#000" fillOpacity="0.35" />
          <rect x="632" y="86" width="94" height="96" rx="16" fill="none" stroke="#fff" strokeOpacity="0.1" />
          <g className="gv-heat" fill="none" stroke="#f5b900" strokeLinecap="round" strokeWidth="2">
            <path d="M672 18c-6-8 6-14 0-22" strokeOpacity="0.4" />
            <path d="M684 20c-6-8 6-14 0-24" strokeOpacity="0.28" />
          </g>
        </g>

        {/* Qaldırma halqası */}
        <rect x="418" y="160" width="64" height="14" rx="3" fill={u('steel')} />
        <circle cx="450" cy="150" r="17" fill="none" stroke={u('steel')} strokeWidth="7" />

        {/* Dam */}
        <path d="M92 204V198Q92 170 122 170H778Q808 170 808 198V204Z" fill={u('roof')} />
        <path d="M122 170.8H778" stroke={u('rim')} strokeWidth="2.4" strokeLinecap="round" />
        <rect x="92" y="200" width="716" height="6" fill="#000" fillOpacity="0.5" />

        {/* Korpus */}
        <rect x="100" y="204" width="700" height="244" fill={u('body')} />
        <rect x="100" y="204" width="700" height="244" fill={u('sheen')} />
        <rect x="100" y="204" width="14" height="244" fill={u('yellow')} />
        <rect x="786" y="204" width="14" height="244" fill="#0a0a0a" />
        <line x1="470" y1="214" x2="470" y2="438" stroke="#000" strokeWidth="3" />
        <line x1="472" y1="214" x2="472" y2="438" stroke="#fff" strokeOpacity="0.07" />

        {/* Ventilyasiya jalüzləri */}
        <rect x="132" y="226" width="318" height="196" rx="8" fill="#050505" />
        <rect x="136" y="230" width="310" height="188" rx="5" fill={u('louver')} />
        <rect x="132" y="226" width="318" height="196" rx="8" fill="none" stroke="#fff" strokeOpacity="0.1" />
        <rect x="438" y="304" width="9" height="52" rx="3" fill={u('steel')} />

        {/* İdarəetmə qapısı */}
        <rect x="496" y="226" width="280" height="196" rx="10" fill="#0e0e0e" stroke="#2a2a2a" />
        <rect x="518" y="248" width="156" height="66" rx="6" fill="#050505" stroke="#2f2f2f" />
        <ellipse className="gv-glow" cx="596" cy="281" rx="96" ry="44" fill={u('screen')} />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M528 292H548L556 270L566 306L576 262L586 298L594 284H610L618 275L626 292H664"
            stroke="#f5b900"
            strokeOpacity="0.22"
            strokeWidth="2.5"
          />
          <path
            className="gv-wave"
            pathLength="260"
            d="M528 292H548L556 270L566 306L576 262L586 298L594 284H610L618 275L626 292H664"
            stroke="#ffd84f"
            strokeWidth="2.8"
          />
        </g>
        <g>
          <circle className="gv-led" cx="706" cy="262" r="5.5" fill="#f5b900" />
          <circle cx="728" cy="262" r="5.5" fill="#d8d8d8" fillOpacity="0.55" />
          <circle cx="750" cy="262" r="5.5" fill="#4a4a4a" />
        </g>
        <circle cx="716" cy="320" r="22" fill="#171717" stroke="#f5b900" strokeOpacity="0.8" strokeWidth="1.5" />
        <circle cx="716" cy="320" r="11" fill="#070707" />
        <path d="M716 308V316" stroke="#f5b900" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="560" cy="368" r="30" fill="#141414" stroke="#2c2c2c" strokeWidth="2" />
        <circle cx="560" cy="368" r="21" fill={u('yellow')} />
        <circle cx="560" cy="368" r="21" fill="none" stroke="#000" strokeOpacity="0.25" />
        <g>
          <rect x="620" y="352" width="44" height="16" rx="8" fill="#070707" stroke="#2c2c2c" />
          <circle cx="632" cy="360" r="5" fill="#8f8f8f" />
          <rect x="680" y="352" width="44" height="16" rx="8" fill="#070707" stroke="#2c2c2c" />
          <circle cx="712" cy="360" r="5" fill="#f5b900" />
          <rect x="620" y="384" width="104" height="5" rx="2.5" fill="#fff" fillOpacity="0.07" />
          <rect x="620" y="398" width="64" height="5" rx="2.5" fill="#fff" fillOpacity="0.05" />
        </g>
        <rect x="758" y="304" width="9" height="52" rx="3" fill={u('steel')} />

        {/* Altlıq: xəbərdarlıq zolağı + skid */}
        <rect x="100" y="438" width="700" height="14" fill={u('hazard')} />
        <rect x="100" y="438" width="700" height="2" fill="#000" fillOpacity="0.5" />
        <rect x="84" y="452" width="732" height="26" rx="3" fill="#151515" stroke="#2c2c2c" />
        <rect x="236" y="459" width="96" height="12" rx="2" fill="#050505" />
        <rect x="568" y="459" width="96" height="12" rx="2" fill="#050505" />
        <rect x="108" y="478" width="70" height="14" rx="2" fill="#0c0c0c" stroke="#262626" />
        <rect x="722" y="478" width="70" height="14" rx="2" fill="#0c0c0c" stroke="#262626" />

        {/* Pərçinlər */}
        <g fill="#fff" fillOpacity="0.16">
          <circle cx="124" cy="187" r="2.6" />
          <circle cx="776" cy="187" r="2.6" />
          <circle cx="146" cy="214" r="2.2" />
          <circle cx="454" cy="214" r="2.2" />
          <circle cx="146" cy="434" r="2.2" />
          <circle cx="454" cy="434" r="2.2" />
        </g>

        {/* Texniki variant: ölçü xətləri (rəqəmsiz, dekorativ) */}
        {variant === 'blueprint' && (
          <g
            className="gv-dim"
            fill="none"
            stroke="#f5b900"
            strokeWidth="1.2"
            strokeDasharray="5 6"
            strokeLinecap="round"
          >
            <path d="M100 556H800" />
            <path d="M100 546V566M800 546V566" strokeDasharray="0" />
            <path d="M52 170V492" />
            <path d="M42 170H62M42 492H62" strokeDasharray="0" />
            <path d="M450 112V56" />
            <circle cx="450" cy="46" r="9" strokeDasharray="0" />
          </g>
        )}
      </svg>
    </div>
  )
}
