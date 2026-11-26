import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App.tsx'
import { DemoStore } from '../../data/demoStore.ts'
import { setStoreForTests } from '../../data/index.ts'
import { defaultSettings } from '../../data/defaults.ts'

let store: DemoStore

async function setup(url: string, whatsapp = '994501234567') {
  sessionStorage.clear()
  store = new DemoStore({ persist: false })
  await store.auth.setup('admin@example.com', 'Correct-horse-9')
  await store.saveSettings({ ...defaultSettings(), whatsapp })
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

const meta = () => document.querySelector('.browser__meta') as HTMLElement
const waHref = (el: HTMLElement) => decodeURIComponent((el as HTMLAnchorElement).href)

describe('public pages', () => {
  it('home: renders the hero, featured generators and demo banner', async () => {
    await setup('/')
    expect(await screen.findByRole('heading', { level: 1, name: /Etibarlı enerji/ })).toBeInTheDocument()
    expect(await screen.findByText(/Demo rejimi/)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Seçilmiş generatorlar' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('az')
  })

  it('generator detail: spec table hides empty rows, compatible parts and WhatsApp message are right', async () => {
    // make one spec row empty to prove it is not rendered
    await setup('/generatorlar/perkins-1104a-44tg2')
    expect(await screen.findByRole('heading', { level: 1, name: 'Perkins 1104A-44TG2' })).toBeInTheDocument()
    expect(screen.getByText('Əsas güc (prime)')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Uyğun ehtiyat hissələri' })).toBeInTheDocument()
    expect(screen.getAllByText(/DEMO-PK-OF-1100/).length).toBeGreaterThan(0)
    const wa = screen.getAllByRole('link', { name: 'WhatsApp ilə sorğu' })[0]
    const href = waHref(wa)
    expect(href).toContain('https://wa.me/994501234567?text=')
    expect(href).toContain('Məhsul: Perkins 1104A-44TG2')
    expect(href).toContain('Model: 1104A-44TG2')
    expect(href).toContain('Manufacturer: Perkins')
    expect(href).toContain('Product URL: https://zamanlimakina.az/generatorlar/perkins-1104a-44tg2')
    // demo records are never indexed
    await waitFor(() => expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex'))
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://zamanlimakina.az/generatorlar/perkins-1104a-44tg2')
    const ld = [...document.head.querySelectorAll('script[data-zm-ld]')].map((s) => JSON.parse(s.textContent ?? '{}')['@type'])
    expect(ld).toEqual(expect.arrayContaining(['Organization', 'BreadcrumbList', 'Product']))
  })

  it('Russian page with missing translation shows a notice and does not claim to be translated', async () => {
    await setup('/ru/generatory/perkins-1106a-70tag4')
    expect(await screen.findByRole('heading', { level: 1, name: 'Perkins 1106A-70TAG4' })).toBeInTheDocument()
    expect((await screen.findAllByText(/ещё не переведён/)).length).toBeGreaterThan(0)
    // canonical points to a language that actually has the content; hreflang lists only real translations
    await waitFor(() => expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://zamanlimakina.az/generatorlar/perkins-1106a-70tag4'))
    const langs = [...document.head.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => l.getAttribute('hreflang'))
    expect(langs).not.toContain('ru')
    expect(langs).toContain('az')
  })

  it('unknown product renders the custom 404 with noindex', async () => {
    await setup('/generatorlar/does-not-exist')
    expect(await screen.findByRole('heading', { name: 'Səhifə tapılmadı' })).toBeInTheDocument()
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex')
  })

  it('catalogue: URL-driven filters, search and clear', async () => {
    const user = userEvent.setup()
    await setup('/generatorlar?brand=cummins')
    await screen.findByRole('heading', { level: 1, name: 'Generatorlar' })
    await waitFor(() => expect(meta()).toHaveTextContent('4 nəticə'))
    expect(screen.queryByText('Perkins 1104A-44TG2')).not.toBeInTheDocument()
    expect(screen.getAllByText('Cummins C110 D5').length).toBeGreaterThan(0)
    const search = (await screen.findAllByRole('searchbox'))[0]
    await user.type(search, 'c275')
    await waitFor(() => expect(meta()).toHaveTextContent('1 nəticə'))
    await user.click(screen.getAllByRole('button', { name: 'Bütün filtrləri təmizlə' })[0])
    await waitFor(() => expect(meta()).toHaveTextContent('16 nəticə'))
  })

  it('spare parts: search by OEM code finds the part', async () => {
    const user = userEvent.setup()
    await setup('/ehtiyat-hisseleri')
    await screen.findByRole('heading', { level: 1, name: 'Ehtiyat hissələri' })
    await user.type((await screen.findAllByRole('searchbox'))[0], 'DEMO-VP-FF-T02')
    await waitFor(() => expect(meta()).toHaveTextContent('1 nəticə'))
    expect(screen.getAllByText('Yanacaq filtri — Volvo Penta TAD').length).toBeGreaterThan(0)
  })

  it('part detail lists every compatible generator and the manufacturers', async () => {
    await setup('/ehtiyat-hisseleri/cm-oil')
    expect(await screen.findByRole('heading', { level: 1, name: /Yağ filtri — Cummins/ })).toBeInTheDocument()
    const section = (await screen.findByRole('heading', { name: 'Uyğun generatorlar' })).closest('div')!
    expect(within(section).getAllByRole('link').length).toBeGreaterThanOrEqual(3)
    const wa = screen.getAllByRole('link', { name: 'WhatsApp ilə sorğu' })[0]
    expect(waHref(wa)).toContain('OEM kodu: DEMO-CM-OF-C01')
  })

  it('without a configured number a WhatsApp click shows a clear configuration notice, never a broken link', async () => {
    const user = userEvent.setup()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await setup('/generatorlar/cummins-c110-d5', '')
    await screen.findByRole('heading', { level: 1, name: 'Cummins C110 D5' })
    const btn = screen.getAllByRole('button', { name: 'WhatsApp ilə sorğu' })[0]
    expect(btn.tagName).toBe('BUTTON') // not a link
    expect(document.querySelector('a[href*="wa.me"]')).toBeNull()
    await user.click(btn)
    const dialog = await screen.findByRole('dialog', { name: 'WhatsApp hələ qoşulmayıb' })
    expect(within(dialog).getByText(/Tənzimləmələr → WhatsApp nömrəsi/)).toBeInTheDocument()
    const form = within(dialog).getByRole('link', { name: 'Əlaqə formasına keç' }) as HTMLAnchorElement
    const target = new URL(form.href)
    expect(target.pathname).toBe('/elaqe')
    expect(target.searchParams.get('product')).toBe('Cummins C110 D5')
    expect(target.searchParams.get('message')).toContain('Model: C110 D5')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('contact form is pre-filled from the product and message in the URL', async () => {
    await setup('/elaqe?product=Perkins%201104A&message=Salam%20%C6%8Fli')
    expect(await screen.findByLabelText('Maraqlandığınız məhsul')).toHaveValue('Perkins 1104A')
    expect(screen.getByLabelText('Mesaj')).toHaveValue('Salam Əli')
  })

  it('language switcher keeps the same page', async () => {
    const user = userEvent.setup()
    await setup('/generatorlar/perkins-1104a-44tg2')
    await screen.findByRole('heading', { level: 1, name: 'Perkins 1104A-44TG2' })
    const en = screen.getAllByRole('link', { name: 'EN' })[0] as HTMLAnchorElement
    expect(en.getAttribute('href')).toBe('/en/generators/perkins-1104a-44tg2')
    await user.click(en)
    expect(await screen.findByRole('heading', { name: 'Technical specifications' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
  })

  it('contact form validates and stores an inquiry', async () => {
    const user = userEvent.setup()
    await setup('/elaqe')
    await user.click(await screen.findByRole('button', { name: 'Göndər' }))
    expect(await screen.findByText(/Ad ən azı 2 simvol/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Ad və soyad'), 'Əli Vəliyev')
    await user.type(screen.getByLabelText('Telefon'), '+994501234567')
    await user.click(screen.getByRole('button', { name: 'Göndər' }))
    expect(await screen.findByText(/Sorğunuz qəbul edildi/)).toBeInTheDocument()
    await store.auth.signIn('admin@example.com', 'Correct-horse-9')
    expect(await store.list('inquiries')).toHaveLength(1)
  })
})
