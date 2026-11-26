import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mountAdmin } from './helpers.tsx'

describe('spare parts module', () => {
  it('creates a part, assigns it to several generators, and stores the relationships', async () => {
    const { user, store } = await mountAdmin('/admin/parts/new')
    const nameBox = (await screen.findAllByRole('textbox', { name: /^Ad/ })).find((e) => e.tagName === 'INPUT' && e.id)!
    await user.type(nameBox, 'Test filtri')
    await user.type(screen.getByRole('textbox', { name: /^OEM/ }), 'TST-001')
    await user.selectOptions(screen.getByRole('combobox', { name: 'İstehsalçı' }), 'Perkins')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Kateqoriya' }), 'Yağ filtrləri')

    await user.click(screen.getByRole('tab', { name: 'Uyğun generatorlar' }))
    await user.click(screen.getByRole('checkbox', { name: /Perkins 1103A-33G/ }))
    await user.click(screen.getByRole('checkbox', { name: /Perkins 1104A-44TG2/ }))
    await user.click(screen.getByRole('button', { name: 'Saxla' }))

    await waitFor(async () => {
      const part = (await store.list('parts')).find((p) => p.oemCode === 'TST-001')
      expect(part).toBeTruthy()
      const gens = (await store.list('generators')).filter((g) => ['1103A-33G', '1104A-44TG2'].includes(g.model)).map((g) => g.id)
      const linked = (await store.getCompat()).filter((c) => c.partId === part!.id).map((c) => c.generatorId)
      expect(linked.sort()).toEqual(gens.sort())
    })
  })

  it('requires an OEM code (inline validation)', async () => {
    const { user } = await mountAdmin('/admin/parts/new')
    const nameBox = (await screen.findAllByRole('textbox', { name: /^Ad/ })).find((e) => e.tagName === 'INPUT' && e.id)!
    await user.type(nameBox, 'Kodsuz')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    expect((await screen.findAllByText('OEM / istinad kodu tələb olunur')).length).toBeGreaterThan(0)
  })
})

describe('categories module', () => {
  it('reorders generator categories and persists the order', async () => {
    const { user, store } = await mountAdmin('/admin/categories')
    const order = async () =>
      (await store.list('categories')).filter((c) => c.kind === 'generator').sort((a, b) => a.sortOrder - b.sortOrder).map((c) => c.name.az!)
    const before = await order()
    await user.click(await screen.findByRole('button', { name: `Aşağı daşı: ${before[0]}` }))
    await waitFor(async () => {
      const after = await order()
      expect(after[0]).toBe(before[1])
      expect(after[1]).toBe(before[0])
    })
  })

  it('bulk-assigns products to a category from the category page', async () => {
    const { user, store } = await mountAdmin('/admin/categories')
    const cats = await store.list('categories')
    const target = cats.find((c) => c.slug === 'industrial')!
    await user.click(await screen.findByRole('link', { name: `Redaktə et: ${target.name.az}` }))
    const box = await screen.findByRole('checkbox', { name: /Perkins 1103A-33G/ })
    await user.click(box)
    await user.click(screen.getByRole('button', { name: 'Təyinatı saxla' }))
    await waitFor(async () => {
      const g = (await store.list('generators')).find((x) => x.model === '1103A-33G')!
      expect(g.categoryId).toBe(target.id)
    })
  })

  it('refuses to delete a category that still has products', async () => {
    const { user, store } = await mountAdmin('/admin/categories')
    const small = (await store.list('categories')).find((c) => c.slug === 'small')!
    await user.click(await screen.findByRole('button', { name: `Sil: ${small.name.az}` }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sil' }))
    expect(await screen.findByText(/Silmək olmur/)).toBeInTheDocument()
    expect((await store.list('categories')).some((c) => c.id === small.id)).toBe(true)
  })
})
