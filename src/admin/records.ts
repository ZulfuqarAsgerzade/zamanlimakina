import { newId } from '../lib/ids.ts'
import type { Category, CategoryKind, Generator, ImageRef, Manufacturer, MediaItem, Part } from '../data/types.ts'

const base = () => {
  const now = new Date().toISOString()
  return { id: newId(), createdAt: now, updatedAt: now, isDemo: false }
}

export const newManufacturer = (sortOrder: number): Manufacturer => ({
  ...base(),
  slug: '',
  name: '',
  description: {},
  website: '',
  seo: {},
  status: 'draft',
  sortOrder,
})

export const newCategory = (kind: CategoryKind, sortOrder: number): Category => ({
  ...base(),
  kind,
  slug: '',
  name: {},
  description: {},
  icon: kind === 'part' ? 'oil-filter' : undefined,
  sortOrder,
  status: 'published',
})

export const newGenerator = (): Generator => ({
  ...base(),
  slug: '',
  manufacturerId: null,
  categoryId: null,
  model: '',
  title: {},
  shortDescription: {},
  description: {},
  advantages: [],
  applications: [],
  images: [],
  price: { type: 'request' },
  availability: 'in_stock',
  featured: false,
  status: 'draft',
  kvaPrime: null,
  kvaStandby: null,
  generatorType: null,
  fuelType: 'diesel',
  phase: 3,
  coolingSystem: 'water',
  specGroups: [],
  seo: {},
})

export const newPart = (): Part => ({
  ...base(),
  slug: '',
  name: {},
  oemCode: '',
  manufacturerId: null,
  categoryId: null,
  description: {},
  images: [],
  price: { type: 'request' },
  availability: 'in_stock',
  featured: false,
  status: 'draft',
  specGroups: [],
  seo: {},
})

export const imageFromMedia = (m: MediaItem): ImageRef => ({
  mediaId: m.id,
  url: m.url,
  thumbUrl: m.thumbUrl,
  width: m.width,
  height: m.height,
  alt: m.alt,
})
