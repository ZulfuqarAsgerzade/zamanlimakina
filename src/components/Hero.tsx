import { GeneratorVisual } from './GeneratorVisual'
import { IconArrow } from './Icons'
import { getPrimaryCta } from '../config/contact'
import { siteConfig } from '../config/site'
import './Hero.css'

export function Hero() {
  const cta = getPrimaryCta()

  return (
    <section id="ana" className="hero" aria-labelledby="hero-title">
      {/* Fon qatları */}
      <div className="hero__bg" aria-hidden="true">
        <div className="hero__glow hero__glow--a" />
        <div className="hero__glow hero__glow--b" />
        <div className="hero__grid" />
        <div className="hero__slash hero__slash--1" />
        <div className="hero__slash hero__slash--2" />
        <div className="hero__noise" />
        <div className="hero__vignette" />
      </div>

      <div className="container hero__inner">
        <div className="hero__content">
          <p className="hero__label">
            <span className="hero__label-line" />
            {siteConfig.brand.nameUpper}
          </p>

          <h1 id="hero-title" className="display hero__title">
            <span className="line">
              <span style={{ ['--i' as string]: 0 }}>GÜCÜN&nbsp;</span>
              <span className="text-yellow" style={{ ['--i' as string]: 1 }}>
                GƏLƏCƏYİ
              </span>
            </span>{' '}
            <span className="line">
              <span style={{ ['--i' as string]: 2 }}>YAXINDA&nbsp;</span>
              <span className="text-yellow" style={{ ['--i' as string]: 3 }}>
                SİZİNLƏ.
              </span>
            </span>
          </h1>

          <p className="hero__text">
            Etibarlı enerji həlləri və güclü performans. Zamanlı Makina-nın yeni rəqəmsal dünyası
            çox yaxında istifadənizdə olacaq.
          </p>

          <div className="hero__status" role="status">
            <span className="pulse" aria-hidden="true">
              <i />
            </span>
            WEBSITE COMING SOON
          </div>

          <div className="hero__actions">
            <a
              className="btn btn--primary"
              href={cta.href}
              {...(cta.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              Bizimlə əlaqə saxlayın
              <IconArrow />
            </a>
            <a className="btn btn--ghost" href="#tezlikle">
              Tezliklə buradayıq
            </a>
          </div>
        </div>

        <div className="hero__visual">
          <GeneratorVisual
            variant="hero"
            photoSrc={siteConfig.images.hero || undefined}
            photoAlt="Zamanlı Makina generator qurğusu"
          />
        </div>
      </div>

      <a className="hero__scroll" href="#haqqimizda" aria-label="Aşağı sürüşdür">
        <span>SCROLL</span>
        <i />
      </a>
    </section>
  )
}
