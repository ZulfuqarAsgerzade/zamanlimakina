import type { ReactNode } from 'react'
import { IconGenerator, IconHandshake, IconShield } from './Icons'
import { useReveal } from '../hooks/useReveal'
import './Expect.css'

interface Feature {
  num: string
  title: string
  text: string
  icon: ReactNode
}

const features: Feature[] = [
  {
    num: '01',
    title: 'GENERATOR HƏLLƏRİ',
    text: 'Fərqli enerji ehtiyacları üçün generator seçimləri.',
    icon: <IconGenerator />,
  },
  {
    num: '02',
    title: 'KEYFİYYƏT VƏ ETİBAR',
    text: 'Etibarlı və davamlı enerji həllərinə fokuslanan yanaşma.',
    icon: <IconShield />,
  },
  {
    num: '03',
    title: 'PEŞƏKAR YANAŞMA',
    text: 'Müştəri ehtiyaclarına uyğun həllər və peşəkar xidmət.',
    icon: <IconHandshake />,
  },
]

export function Expect() {
  const ref = useReveal<HTMLDivElement>(0.1)

  return (
    <section id="gozlentiler" className="expect" aria-labelledby="expect-title">
      <div className="container" ref={ref}>
        <header className="expect__head">
          <p className="eyebrow reveal">Tezliklə</p>
          <h2 id="expect-title" className="display expect__title reveal" style={{ ['--d' as string]: '0.1s' }}>
            Nə <span className="text-yellow">gözləməli</span>
          </h2>
        </header>

        <ul className="expect__grid">
          {features.map((f, i) => (
            <li
              key={f.num}
              className="card reveal"
              style={{ ['--d' as string]: `${0.12 + i * 0.12}s` }}
            >
              <span className="card__num" aria-hidden="true">
                {f.num}
              </span>
              <span className="card__icon">{f.icon}</span>
              <h3 className="card__title display">{f.title}</h3>
              <p className="card__text">{f.text}</p>
              <span className="card__line" aria-hidden="true" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
