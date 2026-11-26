/**
 * Browser-side image preparation for uploads: validates the file, then produces a WebP
 * full-size rendition (max 1600px) and a WebP thumbnail (max 480px) so the public site
 * always serves light, correctly sized images (<img srcset> uses both).
 */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
export const FULL_MAX = 1600
export const THUMB_MAX = 480

export interface ProcessedImage {
  full: Blob
  thumb: Blob
  width: number
  height: number
}

export class UploadError extends Error {}

export function validateImageFile(file: File): void {
  if (!ACCEPTED.includes(file.type))
    throw new UploadError('Yalnız JPG, PNG, WebP və ya AVIF şəkilləri yükləmək olar (SVG qəbul edilmir).')
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError('Şəkil 15 MB-dan böyük ola bilməz.')
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new UploadError('Şəkil emal edilə bilmədi.'))), type, quality),
  )
}

async function render(bitmap: ImageBitmap, maxSide: number, quality: number) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new UploadError('Şəkil emal edilə bilmədi.')
  ctx.drawImage(bitmap, 0, 0, w, h)
  return { blob: await toBlob(canvas, 'image/webp', quality), w, h }
}

export async function processImage(file: File): Promise<ProcessedImage> {
  validateImageFile(file)
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new UploadError('Şəkil oxuna bilmədi. Fayl zədələnmiş ola bilər.')
  }
  try {
    const full = await render(bitmap, FULL_MAX, 0.82)
    const thumb = await render(bitmap, THUMB_MAX, 0.78)
    return { full: full.blob, thumb: thumb.blob, width: full.w, height: full.h }
  } finally {
    bitmap.close()
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new UploadError('Şəkil oxuna bilmədi.'))
    r.readAsDataURL(blob)
  })
}
