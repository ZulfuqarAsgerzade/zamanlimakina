import type { CSSProperties } from 'react'
import type { ImageRef } from '../../data/types.ts'
import { pickText } from '../../lib/text.ts'
import type { Locale } from '../../data/types.ts'

interface Props {
  image?: ImageRef
  locale: Locale
  /** Fallback alt text (used when the image has no alt of its own). */
  alt: string
  sizes?: string
  priority?: boolean
  className?: string
  fit?: 'cover' | 'contain'
  style?: CSSProperties
}

/**
 * Responsive image with explicit dimensions (no layout shift), lazy loading and a srcset built from
 * the thumbnail + full renditions when both exist. Uploaded photos are already WebP (see lib/image.ts).
 */
export function Picture({ image, locale, alt, sizes, priority, className, fit = 'contain', style }: Props) {
  if (!image) return <div className={`pic pic--empty ${className ?? ''}`} aria-hidden="true" style={style} />
  const text = pickText(image.alt, locale) || alt
  const srcSet = image.thumbUrl && image.width ? `${image.thumbUrl} 480w, ${image.url} ${image.width}w` : undefined
  return (
    <img
      className={`pic ${className ?? ''}`}
      src={image.url}
      srcSet={srcSet}
      sizes={srcSet ? (sizes ?? '(min-width: 1024px) 33vw, 100vw') : undefined}
      alt={text}
      width={image.width ?? 1200}
      height={image.height ?? 800}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      style={{ objectFit: fit, ...style }}
    />
  )
}
