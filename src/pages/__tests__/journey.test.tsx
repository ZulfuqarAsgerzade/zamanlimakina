import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../../App.tsx'
import { DemoStore } from '../../data/demoStore.ts'
import { setStoreForTests } from '../../data/index.ts'
import { defaultSettings } from '../../data/defaults.ts'
import { newId } from '../../lib/ids.ts'
import type { Generator, Manufacturer, Part } from '../../data/types.ts'

/**
 * Customer-journey and edge-case tests: Home → Manufacturer → Generator → Specs → Compatible parts → WhatsApp,
 * plus products with missing specs / images / compatibility, drafts, empty results and price modes.
 */
let store: DemoStore
const now = () => new Date().toISOString()

const baseGen = (over: Partial<Generator> = {}): Generator => ({
  id: newId(), createdAt: now(), updatedAt: now(), isDemo: false, slug: 'real-gen', manufacturerId: null, categoryId: null, model: 'R1', title: {},
  shortDescription: { az: 'Qısa təsvir' }, description: { az: 'Uzun təsvir' }, advantages: [], applications: [], images: [], price: { type: 'request' }, availability: 'in_stock',
  featured: false, status: 'published', kvaPrime: 80, kvaStandby: null, generatorType: 'canopy', fuelType: 'diesel', phase: 3, coolingSystem: 'water', specGroups: [], seo: {}, ...over,
})
const basePart = (over: Partial<Part> = {}): Part => ({
  id: newId(), createdAt: now(), updatedAt: now(), isDemo: false, slug: 'real-part', name: { az: 'Real hissə' }, oemCode: 'RP-1', manufacturerId: null, categoryId: null, description: {},
  images: [], price: { type: 'request' }, availability: 'in_stock', featured: false, status: 'published', specGroups: [], seo: {}, ...over,
})
const baseMfr = (over: Partial<Manufacturer> = {}): Manufacturer => ({
  id: newId(), createdAt: now(), updatedAt: now(), isDemo: false, slug: 'real-mfr', name: 'RealMfr', description: { az: 'Təsvir' }, seo: {}, status: 'published', sortOrder: 50, ...over,
})

async function setup(url: string, seed?: (s: DemoStore) => Promise<void>, opts: { wipeDemo?: boolean } = {}) {
  sessionStorage.clear()
  store = new DemoStore({ persist: false })
  await store.auth.setup('admin@example.com', 'Correct-horse-9')
  await store.saveSettings({ ...defaultSettings(), whatsapp: '994501234567' })
  if (opts.wipeDemo) await store.removeDemo()
  await seed?.(store)
  await store.auth.signOut()
  setStoreForTests(store)
  return render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>,
  )
}
beforeEach(() => {
  window.scrollTo = () => {}
})
afterEach(() => setStoreForTests(null))

describe('customer journey', () => {
  it('Home → manufacturer → generator → specs → compatible part → WhatsApp inquiry', async () => {
    const user = userEvent.setup()
    await setup('/')
    // home → brand card
    const brandsHeading = await screen.findByRole('heading', { name: 'İstehsalçılar' })
    const brandsSection = brandsHeading.closest('section')!
    await user.click(within(brandsSection).getByRole('link', { name: /Perkins/ }))
    // manufacturer page lists only its models
    expect(await screen.findByRole('heading', { level: 1, name: 'Perkins' })).toBeInTheDocument()
    await waitFor(() => expect(document.querySelector('.browser__meta')).toHaveTextContent('4 nəticə'))
    // generator card → detail
    await user.click(screen.getAllByRole('link', { name: 'Perkins 1104A-44TG2' })[0])
    expect(await screen.findByRole('heading', { level: 1, name: 'Perkins 1104A-44TG2' })).toBeInTheDocument()
    // technical specifications table
    const specs = (await screen.findByRole('heading', { level: 2, name: 'Texniki göstəricilər' })).closest('section')!
    expect(within(specs).getByText('Əsas güc (prime)')).toBeInTheDocument()
    expect(within(specs).getByText('Mühərrik modeli')).toBeInTheDocument()
    // compatible spare parts → part page
    const partsSection = document.getElementById('parts')!
    await user.click(within(partsSection).getAllByRole('link', { name: /Yağ filtri — Perkins 1100 seriyası/ })[0])
    expect(await screen.findByRole('heading', { level: 1, name: /Yağ filtri — Perkins 1100/ })).toBeInTheDocument()
    expect(screen.getAllByText('DEMO-PK-OF-1100').length).toBeGreaterThan(0)
    // the part lists the generator back (compatibility is bidirectional)
    const fits = (await screen.findByRole('heading', { name: 'Uyğun generatorlar' })).closest('div')!
    expect(within(fits).getAllByRole('link').some((a) => /1104A-44TG2/.test(a.textContent ?? ''))).toBe(true)
    // WhatsApp inquiry carries the part and a compatible model
    const wa = screen.getAllByRole('link', { name: 'WhatsApp ilə sorğu' })[0] as HTMLAnchorElement
    const text = decodeURIComponent(wa.href.split('?text=')[1])
    expect(wa.href.startsWith('https://wa.me/994501234567?text=')).toBe(true)
    expect(text).toContain('Hissə: Yağ filtri — Perkins 1100 seriyası')
    expect(text).toContain('OEM kodu: DEMO-PK-OF-1100')
    expect(text).toMatch(/Uyğun model: .*Perkins/)
    expect(text).toContain('Product URL: https://zamanlimakina.az/ehtiyat-hisseleri/pk-oil-1100')
  })

  it('one generator shows several compatible parts, filterable by part category', async () => {
    const user = userEvent.setup()
    await setup('/generatorlar/perkins-1104a-44tg2')
    const section = document.getElementById('parts') ?? (await screen.findByRole('heading', { name: 'Uyğun ehtiyat hissələri' })).closest('section')!
    await screen.findByRole('heading', { name: 'Uyğun ehtiyat hissələri' })
    const cards = () => within(document.getElementById('parts')!).getAllByRole('article')
    expect(cards().length).toBeGreaterThanOrEqual(6)
    await user.click(within(section).getByRole('button', { name: /Yağ filtrləri/ }))
    expect(cards()).toHaveLength(1)
    await user.click(within(section).getByRole('button', { name: /Hamısı/ }))
    expect(cards().length).toBeGreaterThanOrEqual(6)
  })

  it('related generators appear on the detail page and never include the item itself', async () => {
    await setup('/generatorlar/perkins-1104a-44tg2')
    const heading = await screen.findByRole('heading', { name: 'Oxşar generatorlar' })
    const links = within(heading.closest('section')!).getAllByRole('link').map((a) => a.textContent)
    expect(links.length).toBeGreaterThan(0)
    expect(links.join(' ')).not.toContain('1104A-44TG2')
  })
})

describe('catalogue search and filters', () => {
  const meta = () => document.querySelector('.browser__meta') as HTMLElement
  const type = async (q: string) => {
    const user = userEvent.setup()
    const box = (await screen.findAllByRole('searchbox'))[0]
    await user.clear(box)
    await user.type(box, q)
  }

  it('searches by model, by manufacturer and by OEM code, folding Azerbaijani letters', async () => {
    await setup('/generatorlar')
    await screen.findByRole('heading', { level: 1, name: 'Generatorlar' })
    await type('1106a')
    await waitFor(() => expect(meta()).toHaveTextContent('1 nəticə'))
    await type('volvo')
    await waitFor(() => expect(meta()).toHaveTextContent('3 nəticə'))
    await type('MTU 16V')
    await waitFor(() => expect(meta()).toHaveTextContent('1 nəticə'))
  })

  it('OEM search finds parts (also with punctuation removed)', async () => {
    await setup('/ehtiyat-hisseleri')
    await screen.findByRole('heading', { level: 1, name: 'Ehtiyat hissələri' })
    await type('demopkof1100')
    await waitFor(() => expect(meta()).toHaveTextContent('1 nəticə'))
  })

  it('empty results offer a way back, and sorting by power reorders the grid', async () => {
    const user = userEvent.setup()
    await setup('/generatorlar')
    await screen.findByRole('heading', { level: 1, name: 'Generatorlar' })
    await type('zzzzzz-no-such-model')
    expect(await screen.findByText('Heç bir nəticə tapılmadı')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Bütün filtrləri təmizlə' }).at(-1)!)
    await waitFor(() => expect(meta()).toHaveTextContent('16 nəticə'))
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'powerDesc')
    await waitFor(() => {
      const first = document.querySelector('.grid--gen .gen-card__title')
      expect(first).toHaveTextContent('MTU 16V4000G63') // 1800 kVA is the largest published
    })
  })

  it('combines filters (manufacturer + power range) and keeps them in the URL', async () => {
    await setup('/generatorlar?brand=perkins&min=100&max=300')
    await screen.findByRole('heading', { level: 1, name: 'Generatorlar' })
    await waitFor(() => expect(meta()).toHaveTextContent('2 nəticə')) // 1104A (100) and 1106A (220)
  })
})

describe('edge cases', () => {
  it('generator with no images, no specs, no parts and no description still renders cleanly', async () => {
    await setup(
      '/generatorlar/bare-gen',
      async (s) => {
        const m = await s.save('manufacturers', baseMfr())
        await s.save('generators', baseGen({ slug: 'bare-gen', manufacturerId: m.id, shortDescription: {}, description: {}, specGroups: [], images: [] }))
      },
      { wipeDemo: true },
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'RealMfr R1' })).toBeInTheDocument()
    expect(screen.getAllByText('Şəkil yoxdur').length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: 'Texniki göstəricilər' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Texniki göstəricilər' })).not.toBeInTheDocument() // no dead anchor in the sub-navigation
    expect(screen.queryByRole('heading', { name: 'Təsvir' })).not.toBeInTheDocument()
    expect(screen.getByText('Bu model üçün hələ uyğun hissə əlavə edilməyib.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Oxşar generatorlar' })).not.toBeInTheDocument()
    // WhatsApp still works
    expect(screen.getAllByRole('link', { name: 'WhatsApp ilə sorğu' })[0]).toHaveAttribute('href', expect.stringContaining('wa.me/994501234567'))
  })

  it('spec rows without a value, and groups with only empty rows, are not rendered', async () => {
    await setup(
      '/generatorlar/spec-gen',
      async (s) => {
        const m = await s.save('manufacturers', baseMfr())
        await s.save(
          'generators',
          baseGen({
            slug: 'spec-gen',
            manufacturerId: m.id,
            specGroups: [
              { id: 'g1', title: { az: 'Güc' }, items: [{ id: 'a', label: { az: 'Dolu sətir' }, value: { az: '50' }, unit: 'kVA' }, { id: 'b', label: { az: 'Boş sətir' }, value: {} }, { id: 'c', label: { az: 'Boşluq sətir' }, value: { az: '   ' } }] },
              { id: 'g2', title: { az: 'Tam boş qrup' }, items: [{ id: 'd', label: { az: 'Heç nə' }, value: {} }] },
            ],
          }),
        )
      },
      { wipeDemo: true },
    )
    await screen.findByRole('heading', { level: 1, name: 'RealMfr R1' })
    expect(screen.getByText('Dolu sətir')).toBeInTheDocument()
    expect(screen.queryByText('Boş sətir')).not.toBeInTheDocument()
    expect(screen.queryByText('Boşluq sətir')).not.toBeInTheDocument()
    expect(screen.queryByText('Tam boş qrup')).not.toBeInTheDocument()
  })

  it('shows fixed prices, "price on request" for request and hidden, and keeps drafts private', async () => {
    await setup(
      '/generatorlar',
      async (s) => {
        const m = await s.save('manufacturers', baseMfr())
        await s.save('generators', baseGen({ slug: 'p-fixed', model: 'FIX', manufacturerId: m.id, price: { type: 'fixed', amount: 12345, currency: 'AZN' } }))
        await s.save('generators', baseGen({ slug: 'p-hidden', model: 'HID', manufacturerId: m.id, price: { type: 'hidden' } }))
        await s.save('generators', baseGen({ slug: 'p-draft', model: 'DRAFTED', manufacturerId: null, kvaPrime: null, status: 'draft' }))
      },
      { wipeDemo: true },
    )
    await screen.findByRole('heading', { level: 1, name: 'Generatorlar' })
    const fix = (await screen.findByText('RealMfr FIX')).closest('article')!
    expect(fix.textContent).toMatch(/12[.,\s\u00a0\u202f]?345/)
    expect(fix.textContent).not.toContain('Qiymət sorğu ilə')
    const hid = screen.getByText('RealMfr HID').closest('article')!
    expect(hid.textContent).toContain('Qiymət sorğu ilə')
    expect(hid.textContent).not.toMatch(/12[.,\s\u00a0\u202f]?345/)
    expect(screen.queryByText(/DRAFTED/)).not.toBeInTheDocument()
  })

  it('draft products and unpublished manufacturers are not reachable on the public site', async () => {
    await setup(
      '/generatorlar/p-draft',
      async (s) => {
        await s.save('generators', baseGen({ slug: 'p-draft', model: 'DRAFTED', status: 'draft', kvaPrime: null }))
        await s.save('manufacturers', baseMfr({ slug: 'hidden-mfr', status: 'draft' }))
      },
      { wipeDemo: true },
    )
    expect(await screen.findByRole('heading', { name: 'Səhifə tapılmadı' })).toBeInTheDocument()
  })

  it('part without images or compatible generators renders, and a published generator whose manufacturer is unpublished does not crash', async () => {
    await setup(
      '/ehtiyat-hisseleri/real-part',
      async (s) => {
        await s.save('parts', basePart())
        const m = await s.save('manufacturers', baseMfr({ slug: 'draft-m', status: 'draft' }))
        await s.save('generators', baseGen({ slug: 'orphan-brand', model: 'OB1', manufacturerId: m.id }))
      },
      { wipeDemo: true },
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'Real hissə' })).toBeInTheDocument()
    expect(screen.getAllByText('Şəkil yoxdur').length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: 'Uyğun generatorlar' })).not.toBeInTheDocument()
  })

  it('an empty catalogue (no demo, no real data) shows empty states instead of errors', async () => {
    await setup('/generatorlar', undefined, { wipeDemo: true })
    expect(await screen.findByText('Heç bir nəticə tapılmadı')).toBeInTheDocument()
  })

  it('a product title override replaces "<Manufacturer> <model>" everywhere', async () => {
    await setup(
      '/generatorlar/titled',
      async (s) => {
        const m = await s.save('manufacturers', baseMfr())
        await s.save('generators', baseGen({ slug: 'titled', manufacturerId: m.id, title: { az: 'Xüsusi Başlıq 80 kVA' } }))
      },
      { wipeDemo: true },
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'Xüsusi Başlıq 80 kVA' })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toContain('Xüsusi Başlıq 80 kVA'))
  })

  it('HTML in product text is rendered as text, never as markup', async () => {
    await setup(
      '/generatorlar/xss',
      async (s) => {
        const m = await s.save('manufacturers', baseMfr())
        await s.save('generators', baseGen({ slug: 'xss', manufacturerId: m.id, shortDescription: { az: '<img src=x onerror=alert(1)>Qısa' }, description: { az: '<script>window.__pwned=1</script>Uzun' } }))
      },
      { wipeDemo: true },
    )
    await screen.findByRole('heading', { level: 1, name: 'RealMfr R1' })
    expect(document.querySelector('main img[src="x"]')).toBeNull()
    expect(document.querySelector('main script')).toBeNull()
    expect(screen.getByText(/<img src=x onerror=alert\(1\)>Qısa/)).toBeInTheDocument()
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined()
  })
})

describe('languages switched off in settings', () => {
  it('a disabled language redirects to the default language instead of serving pages', async () => {
    sessionStorage.clear()
    store = new DemoStore({ persist: false })
    await store.auth.setup('admin@example.com', 'Correct-horse-9')
    await store.saveSettings({ ...defaultSettings(), languages: { default: 'az', enabled: ['az', 'en'] } })
    await store.auth.signOut()
    setStoreForTests(store)
    const { container } = render(
      <MemoryRouter initialEntries={['/ru/generatory/perkins-1104a-44tg2']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'Perkins 1104A-44TG2' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('az')
    expect(container.querySelector('a[hreflang="ru"]')).toBeNull() // switcher no longer offers it
  })

  it('featured generators are ordered by most recently updated, so a newly featured one is always shown', async () => {
    await setup('/', async (s) => {
      const m = await s.save('manufacturers', baseMfr())
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 4)) // distinct updatedAt timestamps
        await s.save('generators', baseGen({ slug: `f-${i}`, model: `F${i}`, manufacturerId: m.id, featured: true }))
      }
    }, { wipeDemo: true })
    await screen.findByRole('heading', { name: 'Seçilmiş generatorlar' })
    const titles = [...document.querySelectorAll('.home-popular .gen-card__title')].map((e) => e.textContent)
    expect(titles).toHaveLength(6)
    expect(titles).toContain('RealMfr F7') // the latest one is in, the oldest ones drop out
    expect(titles).not.toContain('RealMfr F0')
  })
})

describe('hero facts strip (admin-managed)', () => {
  const facts = () => [...document.querySelectorAll('.hero__facts > div')].map((d) => d.textContent)

  it('shows the defaults on a fresh install, in the active language', async () => {
    await setup('/ru')
    await screen.findByRole('heading', { level: 1 })
    expect(facts()).toEqual(['диапазон кВА20–16000', 'Техподдержка24/7', 'Официальная гарантия5 лет'])
  })

  it('renders what the admin saved, hides empty items and the whole strip when nothing is left', async () => {
    await setup('/', async (s) => {
      const c = await s.getContent()
      await s.saveContent({
        ...c,
        hero: { ...c.hero, facts: [{ id: '1', label: { az: 'Yeni etiket' }, value: { az: '99' } }, { id: '2', label: { az: 'Gizli' }, value: {} }, { id: '3', label: {}, value: { az: 'Yalnız dəyər' } }] },
      })
    })
    await screen.findByRole('heading', { level: 1 })
    expect(facts()).toEqual(['Yeni etiket99', 'Yalnız dəyər'])
    expect((document.querySelector('.hero__facts') as HTMLElement).style.getPropertyValue('--facts')).toBe('2')
  })

  it('no strip at all when the list is empty', async () => {
    await setup('/', async (s) => {
      const c = await s.getContent()
      await s.saveContent({ ...c, hero: { ...c.hero, facts: [] } })
    })
    await screen.findByRole('heading', { level: 1 })
    expect(document.querySelector('.hero__facts')).toBeNull()
  })
})
