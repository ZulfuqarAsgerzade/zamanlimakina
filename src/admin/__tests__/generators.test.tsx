import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mountAdmin } from './helpers.tsx'

const PART_NAME = 'Yağ filtri — Perkins 1100 seriyası'

describe('generators module', () => {
  it('creates a generator with dynamic specs and compatible parts, persisted in the store', async () => {
    const { user, store } = await mountAdmin('/admin/generators/new')

    await user.selectOptions(await screen.findByRole('combobox', { name: 'İstehsalçı' }), 'Perkins')
    await user.type(screen.getByRole('textbox', { name: /^Model/ }), 'ZZ-100')
    expect(screen.getByRole('textbox', { name: /^Slug/ })).toHaveValue('perkins-zz-100')
    await user.type(screen.getByRole('textbox', { name: /^Əsas güc/ }), '123.5')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'published')

    // dynamic specification editor
    await user.click(screen.getByRole('tab', { name: 'Texniki göstəricilər' }))
    await user.selectOptions(screen.getByLabelText('Hazır sahə əlavə et'), 'primePower')
    await user.click(screen.getByRole('button', { name: '+ Sahə əlavə et' }))
    await user.selectOptions(screen.getByLabelText('Hazır sahə əlavə et'), 'weight')
    await user.click(screen.getByRole('button', { name: '+ Sahə əlavə et' }))
    const values = screen.getAllByRole('textbox', { name: 'Dəyər' })
    expect(values).toHaveLength(2)
    await user.type(values[0], '123.5')
    // second value stays empty on purpose: it must be stored but hidden publicly

    // compatibility
    await user.click(screen.getByRole('tab', { name: 'Uyğun hissələr' }))
    await user.click(screen.getByRole('checkbox', { name: new RegExp(PART_NAME) }))
    expect(screen.getByText('Seçilib: 1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    await waitFor(async () => {
      const g = (await store.list('generators')).find((x) => x.slug === 'perkins-zz-100')
      expect(g).toBeTruthy()
      expect(g!.kvaPrime).toBe(123.5)
      expect(g!.status).toBe('published')
      expect(g!.specGroups.flatMap((s) => s.items).map((i) => i.label.az)).toEqual(['Əsas güc (prime)', 'Çəki'])
      const compat = await store.getCompat()
      const part = (await store.list('parts')).find((p) => p.name.az === PART_NAME)!
      expect(compat.some((c) => c.generatorId === g!.id && c.partId === part.id)).toBe(true)
    })
  })

  it('shows validation errors when publishing without manufacturer and power; error badge on the tab', async () => {
    const { user, store } = await mountAdmin('/admin/generators/new')
    await user.type(await screen.findByRole('textbox', { name: /^Model/ }), 'NOPE-1')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'published')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    expect((await screen.findAllByText('Dərc etmək üçün istehsalçı və güc (kVA) tələb olunur')).length).toBeGreaterThan(0)
    expect((await store.list('generators')).some((g) => g.model === 'NOPE-1')).toBe(false)
  })

  it('fixed price requires an amount (inline error)', async () => {
    const { user } = await mountAdmin('/admin/generators/new')
    await user.type(await screen.findByRole('textbox', { name: /^Model/ }), 'PRICE-1')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Qiymət növü' }), 'fixed')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    expect((await screen.findAllByText('Sabit qiymət üçün məbləğ və valyuta tələb olunur')).length).toBeGreaterThan(0)
  })

  it('filters the list and deletes a generator (confirm), removing its compatibility links', async () => {
    const { user, store } = await mountAdmin('/admin/generators')
    await user.type(await screen.findByRole('textbox', { name: 'Generator axtar' }), 'TAD734')
    expect(await screen.findByRole('button', { name: 'Sil: Volvo Penta TAD734GE' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sil: Perkins 1103A-33G' })).not.toBeInTheDocument()
    const g = (await store.list('generators')).find((x) => x.model === 'TAD734GE')!
    expect((await store.getCompat()).some((c) => c.generatorId === g.id)).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Sil: Volvo Penta TAD734GE' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sil' }))
    await waitFor(async () => {
      expect((await store.list('generators')).some((x) => x.id === g.id)).toBe(false)
      expect((await store.getCompat()).some((c) => c.generatorId === g.id)).toBe(false)
    })
  })

  it('edits an existing generator: removing a spec field persists', async () => {
    const { user, store } = await mountAdmin('/admin/generators')
    const g = (await store.list('generators')).find((x) => x.model === '1103A-33G')!
    await user.click(await screen.findByRole('link', { name: 'Redaktə et: Perkins 1103A-33G' }))
    await user.click(await screen.findByRole('tab', { name: 'Texniki göstəricilər' }))
    const first = g.specGroups[0].items
    await user.click(screen.getByRole('button', { name: `Sahəni sil: ${first[0].label.az}` }))
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    await waitFor(async () => {
      const saved = (await store.list('generators')).find((x) => x.id === g.id)!
      expect(saved.specGroups[0].items.length).toBe(first.length - 1)
    })
  })
})
