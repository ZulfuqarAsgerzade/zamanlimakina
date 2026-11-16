import { GeneratorVisual } from './GeneratorVisual'
import { siteConfig } from '../config/site'
import { useReveal } from '../hooks/useReveal'
import './About.css'

export function About() {
  const ref = useReveal<HTMLDivElement>(0.12)

  return (
    <section id="haqqimizda" className="about" aria-labelledby="about-title">
      <div className="container about__inner" ref={ref}>
        <div className="about__text">
          <p className="eyebrow reveal" style={{ ['--d' as string]: '0s' }}>
            Haqqımızda
          </p>

          <h2 id="about-title" className="display about__title">
            <span className="reveal" style={{ ['--d' as string]: '0.08s' }}>
              GÜC.
            </span>
            <span className="reveal text-yellow" style={{ ['--d' as string]: '0.18s' }}>
              ETİBAR.
            </span>
            <span className="reveal" style={{ ['--d' as string]: '0.28s' }}>
              DAVAMLILIQ.
            </span>
          </h2>

          <p className="about__desc reveal" style={{ ['--d' as string]: '0.4s' }}>
            Zamanlı Makina enerji ehtiyaclarınız üçün güvənə biləcəyiniz generator həllərini təqdim
            etməyə hazırlaşır.
          </p>
        </div>

        <div className="about__visual reveal reveal--right" style={{ ['--d' as string]: '0.2s' }}>
          <div className="about__frame">
            <span className="about__corner about__corner--tl" aria-hidden="true" />
            <span className="about__corner about__corner--tr" aria-hidden="true" />
            <span className="about__corner about__corner--bl" aria-hidden="true" />
            <span className="about__corner about__corner--br" aria-hidden="true" />
            <GeneratorVisual
              variant="blueprint"
              photoSrc={siteConfig.images.about || undefined}
              photoAlt="Zamanlı Makina generator həlləri"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
