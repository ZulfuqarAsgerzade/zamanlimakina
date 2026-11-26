import { useCallback, useEffect, useRef, useState } from 'react'
import type { ImageRef, Locale } from '../../data/types.ts'
import { useI18n } from '../../i18n/I18nContext.tsx'
import { closeDialog, openDialog } from '../ui/dialog.ts'
import { Picture } from '../ui/Picture.tsx'
import { IconChevronLeft, IconChevronRight, IconClose, IconExpand } from '../ui/Icons.tsx'

interface Props {
  images: ImageRef[]
  alt: string
  locale: Locale
  badges?: React.ReactNode
}

export function Gallery({ images, alt, locale, badges }: Props) {
  const { t } = useI18n()
  const [i, setI] = useState(0)
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const count = images.length
  const go = useCallback((d: number) => setI((x) => (x + d + count) % count), [count])

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open) openDialog(d)
    else closeDialog(d)
  }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, go])

  if (!count)
    return (
      <div className="gallery">
        <div className="gallery__stage gallery__stage--empty">
          <span className="muted">{t('gen.noImage')}</span>
        </div>
      </div>
    )

  return (
    <div className="gallery">
      <div className="gallery__stage">
        <Picture image={images[i]} locale={locale} alt={alt} priority={i === 0} sizes="(min-width: 1024px) 56vw, 100vw" />
        {badges && <div className="gallery__badges">{badges}</div>}
        <button type="button" className="gallery__expand" onClick={() => setOpen(true)} aria-label={t('gen.fullscreen')}>
          <IconExpand />
        </button>
        {count > 1 && (
          <>
            <button type="button" className="gallery__nav gallery__nav--prev" onClick={() => go(-1)} aria-label={t('gen.prevImage')}>
              <IconChevronLeft />
            </button>
            <button type="button" className="gallery__nav gallery__nav--next" onClick={() => go(1)} aria-label={t('gen.nextImage')}>
              <IconChevronRight />
            </button>
          </>
        )}
      </div>
      {count > 1 && (
        <ul className="gallery__thumbs" aria-label={t('gen.gallery')}>
          {images.map((img, n) => (
            <li key={`${img.url}-${n}`}>
              <button
                type="button"
                className="gallery__thumb"
                aria-current={n === i ? 'true' : undefined}
                aria-label={t('common.imageOf', { n: n + 1, total: count })}
                onClick={() => setI(n)}
              >
                <Picture image={{ ...img, url: img.thumbUrl ?? img.url, thumbUrl: undefined }} locale={locale} alt="" sizes="120px" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog ref={dialog} className="lightbox" onClose={() => setOpen(false)} onClick={(e) => e.target === dialog.current && setOpen(false)}>
        <button type="button" className="lightbox__close" onClick={() => setOpen(false)} aria-label={t('common.close')}>
          <IconClose />
        </button>
        {open && (
          <div className="lightbox__stage">
            <Picture image={images[i]} locale={locale} alt={alt} priority sizes="100vw" />
          </div>
        )}
        {count > 1 && (
          <>
            <button type="button" className="gallery__nav gallery__nav--prev" onClick={() => go(-1)} aria-label={t('gen.prevImage')}>
              <IconChevronLeft />
            </button>
            <button type="button" className="gallery__nav gallery__nav--next" onClick={() => go(1)} aria-label={t('gen.nextImage')}>
              <IconChevronRight />
            </button>
            <p className="lightbox__count">{t('common.imageOf', { n: i + 1, total: count })}</p>
          </>
        )}
      </dialog>
    </div>
  )
}
