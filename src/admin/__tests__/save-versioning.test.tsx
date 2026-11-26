import { act, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Store } from '../../data/store.ts'
import { mountAdmin } from './helpers.tsx'

/**
 * Edits made while a save request is in flight must survive: only the SUBMITTED version becomes "saved", newer typing stays in
 * the form (and the form stays dirty), and the next save succeeds without a false conflict.
 */
const gate = () => {
  let release!: () => void
  const promise = new Promise<void>((r) => (release = r))
  return { promise, release }
}

const beforeUnloadPrevented = () => {
  const e = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(e)
  return e.defaultPrevented
}

interface Case {
  name: string
  path: string
  field: string | RegExp
  /** value stored in the database for the record under test */
  stored: (s: Store) => Promise<string>
  find?: (s: Store) => Promise<string> // id → deep link; omitted for documents
  /** label of the Save button */
}

const cases: Case[] = [
  {
    name: 'manufacturer',
    path: '/admin/manufacturers',
    field: 'Ad',
    find: async (s) => (await s.list('manufacturers')).find((m) => m.slug === 'perkins')!.id,
    stored: async (s) => (await s.list('manufacturers')).find((m) => m.slug === 'perkins')!.name,
  },
  {
    name: 'generator',
    path: '/admin/generators',
    field: 'Model',
    find: async (s) => (await s.list('generators')).find((g) => g.slug === 'perkins-1104a-44tg2')!.id,
    stored: async (s) => (await s.list('generators')).find((g) => g.slug === 'perkins-1104a-44tg2')!.model,
  },
  {
    name: 'spare part',
    path: '/admin/parts',
    field: 'OEM / istinad kodu',
    find: async (s) => (await s.list('parts')).find((p) => p.slug === 'cm-oil')!.id,
    stored: async (s) => (await s.list('parts')).find((p) => p.slug === 'cm-oil')!.oemCode,
  },
  {
    name: 'category',
    path: '/admin/categories',
    field: 'Ad',
    find: async (s) => (await s.list('categories')).find((c) => c.slug === 'medium' && c.kind === 'generator')!.id,
    stored: async (s) => (await s.list('categories')).find((c) => c.slug === 'medium' && c.kind === 'generator')!.name.az ?? '',
  },
  {
    name: 'settings document',
    path: '/admin/settings',
    field: 'Şirkət adı',
    stored: async (s) => (await s.getSettings()).companyName,
  },
  {
    name: 'site content document',
    path: '/admin/content',
    field: 'Üst yazı (eyebrow)',
    stored: async (s) => (await s.getContent()).hero.eyebrow.az ?? '',
  },
]

describe.each(cases)('version-aware save: $name', (c) => {
  async function open() {
    const ctx = await mountAdmin('/admin')
    if (c.find) {
      const id = await c.find(ctx.store)
      const dir = c.path.replace('/admin/', '')
      await act(() => ctx.router.navigate(`/admin/${dir}/${id}`))
    } else await act(() => ctx.router.navigate(c.path))
    const box = (await screen.findAllByRole('textbox', { name: c.field }))[0]
    return { ...ctx, box: box as HTMLInputElement | HTMLTextAreaElement }
  }

  it('keeps edits typed during the save, marks only the submitted version saved, stays dirty, and the next save works', async () => {
    const { user, store, box } = await open()
    const original = await c.stored(store)
    const g = gate()
    const real = store.save.bind(store)
    const spy = vi.spyOn(store, 'save').mockImplementation(async (e, r) => {
      await g.promise
      return real(e, r)
    })
    const realDoc = store.saveSettings.bind(store)
    const realContent = store.saveContent.bind(store)
    vi.spyOn(store, 'saveSettings').mockImplementation(async (v) => (await g.promise, realDoc(v)))
    vi.spyOn(store, 'saveContent').mockImplementation(async (v) => (await g.promise, realContent(v)))

    await user.type(box, 'A')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    // progress is visible and the button cannot be used twice
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saxlanılır…' })).toBeDisabled())
    expect(document.querySelector('.formbar__state')).toHaveTextContent('Saxlanılır…')

    await user.type(box, 'B') // edit while the request is in flight
    g.release()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saxla' })).toBeEnabled())

    // the newer keystroke is still in the form and the form is still dirty…
    expect((box as HTMLInputElement).value.endsWith('AB')).toBe(true)
    expect(document.querySelector('.formbar__state')).toHaveTextContent('Saxlanmamış dəyişikliklər var')
    expect(beforeUnloadPrevented()).toBe(true)
    // …while the database holds exactly the submitted version (…A), not the later one
    const storedNow = await c.stored(store)
    expect(storedNow).toBe(original + 'A')

    // next save goes through (no false conflict) and persists the newer text; the form becomes clean
    spy.mockRestore()
    vi.restoreAllMocks()
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    await waitFor(async () => expect(await c.stored(store)).toBe(original + 'AB'))
    await waitFor(() => expect(document.querySelector('.formbar__state')).toHaveTextContent('Bütün dəyişikliklər saxlanılıb'))
    expect(beforeUnloadPrevented()).toBe(false)
  })

  it('a double click while saving sends exactly one request', async () => {
    const { user, store, box } = await open()
    const g = gate()
    const real = store.save.bind(store)
    const save = vi.spyOn(store, 'save').mockImplementation(async (e, r) => (await g.promise, real(e, r)))
    const realDoc = store.saveSettings.bind(store)
    const realContent = store.saveContent.bind(store)
    const settings = vi.spyOn(store, 'saveSettings').mockImplementation(async (v) => (await g.promise, realDoc(v)))
    const content = vi.spyOn(store, 'saveContent').mockImplementation(async (v) => (await g.promise, realContent(v)))
    await user.type(box, 'X')
    const btn = screen.getByRole('button', { name: 'Saxla' })
    await user.dblClick(btn)
    g.release()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saxla' })).toBeEnabled())
    expect(save.mock.calls.length + settings.mock.calls.length + content.mock.calls.length).toBe(1)
    vi.restoreAllMocks()
  })

  it('an error during save shows a message, keeps every edit and leaves the form dirty', async () => {
    const { user, store, box } = await open()
    vi.spyOn(store, 'save').mockRejectedValue(new Error('Şəbəkə xətası (test)'))
    vi.spyOn(store, 'saveSettings').mockRejectedValue(new Error('Şəbəkə xətası (test)'))
    vi.spyOn(store, 'saveContent').mockRejectedValue(new Error('Şəbəkə xətası (test)'))
    await user.type(box, 'Z')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    expect(await screen.findByText(/Şəbəkə xətası \(test\)/)).toBeInTheDocument()
    expect((box as HTMLInputElement).value.endsWith('Z')).toBe(true)
    expect(document.querySelector('.formbar__state')).toHaveTextContent('Saxlanmamış dəyişikliklər var')
    expect(screen.getByRole('button', { name: 'Saxla' })).toBeEnabled()
    vi.restoreAllMocks()
  })
})
