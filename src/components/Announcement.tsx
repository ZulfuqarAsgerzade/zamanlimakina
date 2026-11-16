import { IconBolt } from './Icons'
import { useReveal } from '../hooks/useReveal'
import './Announcement.css'

const TICKS = Array.from({ length: 72 }, (_, i) => i)

/** Fırlanan texniki üzük — dekorativ element. */
function TechRing() {
  return (
    <div className="ring" aria-hidden="true">
      <svg viewBox="0 0 400 400">
        <defs>
          <linearGradient id="ringSweep" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f5b900" stopOpacity="0" />
            <stop offset="1" stopColor="#ffd04a" stopOpacity="0.95" />
          </linearGradient>
          <radialGradient id="ringCore" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#f5b900" stopOpacity="0.4" />
            <stop offset="1" stopColor="#f5b900" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="200" cy="200" r="120" fill="url(#ringCore)" className="ring__core" />

        <circle cx="200" cy="200" r="196" className="ring__line" />
        <circle cx="200" cy="200" r="142" className="ring__line" />

        <g className="ring__spin ring__spin--slow">
          {TICKS.map((i) => {
            const major = i % 6 === 0
            return (
              <line
                key={i}
                x1="200"
                y1={major ? 10 : 14}
                x2="200"
                y2="22"
                transform={`rotate(${i * 5} 200 200)`}
                className={major ? 'ring__tick ring__tick--major' : 'ring__tick'}
              />
            )
          })}
        </g>

        <g className="ring__spin ring__spin--rev">
          <circle cx="200" cy="200" r="168" className="ring__dash" />
        </g>

        <g className="ring__spin ring__spin--fast">
          <path d="M200 58A142 142 0 0 1 342 200" className="ring__sweep" />
          <circle cx="342" cy="200" r="6" className="ring__dot" />
        </g>
      </svg>
      <span className="ring__bolt">
        <IconBolt />
      </span>
    </div>
  )
}

export function Announcement() {
  const ref = useReveal<HTMLDivElement>(0.15)

  return (
    <section id="tezlikle" className="soon" aria-labelledby="soon-title">
      <div className="soon__bg" aria-hidden="true" />
      <div className="container soon__inner" ref={ref}>
        <div className="soon__text">
          <p className="eyebrow reveal">Yeni vebsayt</p>
          <h2 id="soon-title" className="display soon__title">
            <span className="reveal" style={{ ['--d' as string]: '0.1s' }}>
              BÖYÜK GÜC.
            </span>
            <span className="reveal text-yellow" style={{ ['--d' as string]: '0.22s' }}>
              ÇOX YAXINDA.
            </span>
          </h2>
          <p className="soon__desc reveal" style={{ ['--d' as string]: '0.36s' }}>
            Yeni vebsaytımız üzərində işləyirik. Yeniliklərdən xəbərdar olmaq üçün bizimlə əlaqədə
            qalın.
          </p>
          <a
            className="btn btn--ghost reveal"
            href="#elaqe"
            style={{ ['--d' as string]: '0.48s', marginTop: 34 }}
          >
            Əlaqə məlumatları
          </a>
        </div>

        <div className="soon__ring reveal" style={{ ['--d' as string]: '0.25s' }}>
          <TechRing />
        </div>
      </div>
    </section>
  )
}
