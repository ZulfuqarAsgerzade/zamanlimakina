import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { mountAdmin, pngLike } from './helpers.tsx'

vi.mock('../../lib/image.ts', async (orig) => {
  const real = await orig<typeof import('../../lib/image.ts')>()
  return {
    ...real,
    processImage: vi.fn(async () => ({
      full: new Blob(['full-bytes'], { type: 'image/webp' }),
      thumb: new Blob(['thumb-bytes'], { type: 'image/webp' }),
      width: 640,
      height: 480,
    })),
  }
})

describe('settings', () => {
  it('validates the WhatsApp number format and persists a valid one', async () => {
    const { user, store } = await mountAdmin('/admin/settings')
    const wa = await screen.findByRole('textbox', { name: 'WhatsApp nömrəsi' })
    await user.type(wa, '12345')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    expect((await screen.findAllByText(/WhatsApp nömrəsi yalnız rəqəmlərdən/)).length).toBeGreaterThan(0)
    expect((await store.getSettings()).whatsapp).toBe('')

    await user.clear(wa)
    await user.type(wa, '+994 50 123 45 67')
    expect(wa).toHaveValue('994501234567')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    await waitFor(async () => expect((await store.getSettings()).whatsapp).toBe('994501234567'))
  })

  it('does not allow a default language that is not enabled', async () => {
    const { user } = await mountAdmin('/admin/settings')
    await user.click(await screen.findByRole('checkbox', { name: /AZ — Azərbaycan dili/ }))
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    expect((await screen.findAllByText('Defolt dil aktiv dillər siyahısında olmalıdır.')).length).toBeGreaterThan(0)
  })
})

describe('website content', () => {
  it('adds a FAQ entry and saves it', async () => {
    const { user, store } = await mountAdmin('/admin/content')
    await user.click(await screen.findByRole('button', { name: '+ Sual əlavə et' }))
    const before = (await store.getContent()).faq.length
    const q = screen.getByRole('textbox', { name: `Sual #${before + 1}` })
    await user.type(q, 'Yeni sual?')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    await waitFor(async () => {
      const faq = (await store.getContent()).faq
      expect(faq).toHaveLength(before + 1)
      expect(faq.at(-1)!.question.az).toBe('Yeni sual?')
    })
  })
})

describe('media library', () => {
  it('uploads an image through the store and reports where images are used', async () => {
    const { user, store } = await mountAdmin('/admin/media')
    const before = (await store.list('media')).length
    const input = await screen.findByLabelText('Şəkil faylları seç')
    await user.upload(input, pngLike('qa-upload.png'))
    expect(await screen.findByText('qa-upload.png')).toBeInTheDocument()
    const after = await store.list('media')
    expect(after).toHaveLength(before + 1)
    const item = after.find((m) => m.name === 'qa-upload.png')!
    expect(item.url.startsWith('data:image/webp')).toBe(true)
    expect(item.width).toBe(640)
    // demo artwork is used by products; the fresh upload is not
    expect(screen.getAllByText('İstifadə olunmur').length).toBeGreaterThan(0)
  })

  it('deletes only unused images through "delete unused"', async () => {
    const { user, store } = await mountAdmin('/admin/media', {
      prepare: async (st) => {
        await st.uploadImage(pngLike('orphan.png'))
      },
    })
    const used = (await store.list('media')).filter((m) => m.name !== 'orphan.png').length
    await user.click(await screen.findByRole('button', { name: 'İstifadə olunmayanları sil' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sil' }))
    await waitFor(async () => {
      const list = await store.list('media')
      expect(list.some((m) => m.name === 'orphan.png')).toBe(false)
      expect(list).toHaveLength(used)
    })
  })
})

describe('demo data tools', () => {
  it('removing demo data keeps genuine records and detaches their demo links', async () => {
    const { user, store } = await mountAdmin('/admin', {
      prepare: async (st) => {
        const mfr = (await st.list('manufacturers'))[0]
        const real = await st.save('manufacturers', { ...mfr, id: 'real-mfr', slug: 'real-brand', name: 'Real Brand', isDemo: false, sortOrder: 50 })
        const demoGen = (await st.list('generators'))[0]
        const gen = await st.save('generators', { ...demoGen, id: 'real-gen', slug: 'real-gen-1', model: 'REAL-1', isDemo: false, manufacturerId: real.id, categoryId: demoGen.categoryId })
        const part = (await st.list('parts'))[0]
        const realPart = await st.save('parts', { ...part, id: 'real-part', slug: 'real-part-1', oemCode: 'REAL-OEM', isDemo: false })
        await st.setPartGenerators(realPart.id, [demoGen.id, gen.id])
      },
    })
    await user.click(await screen.findByRole('button', { name: 'Demo məlumatı sil' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Real şirkət qeydləri silinmir/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Demo məlumatı sil' }))
    expect(await screen.findByText(/Silmə tamamlandı/)).toBeInTheDocument()

    expect((await store.list('manufacturers')).map((m) => m.id)).toEqual(['real-mfr'])
    const gens = await store.list('generators')
    expect(gens.map((g) => g.id)).toEqual(['real-gen'])
    expect(gens[0].categoryId).toBeNull() // demo category detached, record kept
    expect((await store.list('parts')).map((p) => p.id)).toEqual(['real-part'])
    expect(await store.getCompat()).toEqual([{ partId: 'real-part', generatorId: 'real-gen' }])
  })

  it('install restores the demo catalogue idempotently', async () => {
    const { user, store } = await mountAdmin('/admin', { autoSeed: false })
    expect(await store.list('generators')).toHaveLength(0)
    await user.click(await screen.findByRole('button', { name: 'Demo məlumatı yüklə' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Yüklə' }))
    await screen.findByText(/Yükləmə tamamlandı/)
    const n = (await store.list('generators')).length
    expect(n).toBeGreaterThanOrEqual(15)
    await user.click(screen.getByRole('button', { name: 'Demo məlumatı yüklə' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Yüklə' }))
    await waitFor(() => expect(screen.getAllByText(/Yükləmə tamamlandı/).length).toBeGreaterThan(0))
    expect(await store.list('generators')).toHaveLength(n)
  })
})
