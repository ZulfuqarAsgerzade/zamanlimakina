import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mountAdmin } from './helpers.tsx'

describe('manufacturers module', () => {
  it('creates a manufacturer with an auto slug, persists it, and lists it', async () => {
    const { user, store } = await mountAdmin('/admin/manufacturers/new')
    await user.type(await screen.findByRole('textbox', { name: 'Ad' }), 'Doosan Özel')
    expect(screen.getByRole('textbox', { name: /^Slug/ })).toHaveValue('doosan-ozel')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    await waitFor(async () => {
      const list = await store.list('manufacturers')
      expect(list.find((m) => m.slug === 'doosan-ozel')).toBeTruthy()
    })
    // after creating we land on the edit page of the stored record
    await waitFor(() => expect(screen.getByTestId('where').textContent).toMatch(/^\/admin\/manufacturers\/[^/]+$/))
  })

  it('shows inline validation errors from the store (empty name, bad slug)', async () => {
    const { user } = await mountAdmin('/admin/manufacturers/new')
    await user.click(await screen.findByRole('button', { name: 'Saxla' }))
    expect((await screen.findAllByText('Ad tələb olunur')).length).toBeGreaterThan(0)
    await user.type(screen.getByRole('textbox', { name: 'Ad' }), 'X')
    await user.clear(screen.getByRole('textbox', { name: /^Slug/ }))
    await user.type(screen.getByRole('textbox', { name: /^Slug/ }), 'Bad Slug!')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    expect((await screen.findAllByText(/Slug yalnız kiçik latın hərfləri/)).length).toBeGreaterThan(0)
  })

  it('edits an existing manufacturer and toggles it to draft from the list', async () => {
    const { user, store } = await mountAdmin('/admin/manufacturers')
    await user.click(await screen.findByRole('button', { name: 'Qaralamaya keçir: Perkins' }))
    await waitFor(async () => {
      const m = (await store.list('manufacturers')).find((x) => x.slug === 'perkins')!
      expect(m.status).toBe('draft')
    })
  })

  it('refuses to delete a manufacturer that still has generators (InUse error shown)', async () => {
    const { user, store } = await mountAdmin('/admin/manufacturers')
    await user.click(await screen.findByRole('button', { name: 'Sil: Perkins' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Sil' }))
    expect(await screen.findByText(/Silmək olmur: \d+ generator/)).toBeInTheDocument()
    expect((await store.list('manufacturers')).some((m) => m.slug === 'perkins')).toBe(true)
  })

  it('deletes an unused manufacturer after confirmation (Escape cancels first)', async () => {
    const { user, store } = await mountAdmin('/admin/manufacturers', {
      prepare: async (st) => {
        const base = (await st.list('manufacturers'))[0]
        await st.save('manufacturers', { ...base, id: 'real-1', slug: 'unused-brand', name: 'Unused Brand', isDemo: false, sortOrder: 99 })
      },
    })
    const btn = await screen.findByRole('button', { name: 'Sil: Unused Brand' })
    await user.click(btn)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(btn)
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Sil' }))
    await waitFor(async () => expect((await store.list('manufacturers')).some((m) => m.id === 'real-1')).toBe(false))
  })

  it('reorders manufacturers with the keyboard-accessible buttons and persists the order', async () => {
    const { user, store } = await mountAdmin('/admin/manufacturers')
    const before = (await store.list('manufacturers')).sort((a, b) => a.sortOrder - b.sortOrder).map((m) => m.name)
    await user.click(await screen.findByRole('button', { name: `Yuxarı daşı: ${before[1]}` }))
    await waitFor(async () => {
      const after = (await store.list('manufacturers')).sort((a, b) => a.sortOrder - b.sortOrder).map((m) => m.name)
      expect(after.slice(0, 2)).toEqual([before[1], before[0]])
    })
  })
})
