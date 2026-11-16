import { useState } from 'react'
import { siteConfig } from '../config/site'
import './Logo.css'

interface LogoProps {
  /** Başlıq (header) və ya altlıq (footer) ölçüsü */
  size?: 'md' | 'lg'
  href?: string
}

/**
 * Rəsmi loqo `siteConfig.logo.src` yolundan yüklənir.
 * Fayl hələ əlavə olunmayıbsa, müvəqqəti mətn loqosu göstərilir.
 */
export function Logo({ size = 'md', href = '#ana' }: LogoProps) {
  const [failed, setFailed] = useState(false)
  const { src, alt } = siteConfig.logo

  return (
    <a className={`logo logo--${size}`} href={href} aria-label={siteConfig.brand.name}>
      {failed ? (
        <span className="logo__fallback" aria-hidden="true">
          <span className="logo__bar" />
          <span className="logo__text">
            <b>ZAMANLI</b>
            <i>MAKİNA</i>
          </span>
        </span>
      ) : (
        <>
          <span className="logo__frame">
            <img
              className="logo__img"
              src={src}
              alt=""
              width={400}
              height={400}
              decoding="async"
              onError={() => setFailed(true)}
            />
          </span>
          <span className="logo__name" aria-hidden="true">
            <b>ZAMANLI</b>
            <i>MAKİNA</i>
          </span>
          <span className="sr-only">{alt}</span>
        </>
      )}
    </a>
  )
}
