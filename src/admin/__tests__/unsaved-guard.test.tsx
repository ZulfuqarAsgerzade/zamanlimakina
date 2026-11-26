import { act, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mountAdmin } from './helpers.tsx'

// `/admin/manufacturers/<id>` but NOT `/admin/manufacturers/new` (the create form's own URL)
const SAVED_RECORD = /^\/admin\/manufacturers\/(?!new$)[^/]+$/
const where = () => screen.getByTestId('where').textContent
const beforeUnloadPrevented = () => {
  const e = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(e)
  return e.defaultPrevented
}
const dialog = () => screen.findByRole('dialog', { name: 'Saxlanmamış dəyişikliklər' })

/** Opens the manufacturer edit form with the router history list → form, so Back has somewhere to go. */
async function openEditForm() {
  const ctx = await mountAdmin('/admin/manufacturers')
  await ctx.user.click(await screen.findByRole('link', { name: 'Redaktə et: Perkins' }))
  const name = await screen.findByRole('textbox', { name: 'Ad' })
  return { ...ctx, name }
}

describe('unsaved-changes protection (data router + useBlocker)', () => {
  it('does not warn when nothing was changed (link, Back button, Cancel, tab close)', async () => {
    const { user, router } = await openEditForm()
    expect(beforeUnloadPrevented()).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Geri' }))
    await waitFor(() => expect(where()).toBe('/admin/manufacturers'))
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(await screen.findByRole('link', { name: 'Redaktə et: Perkins' }))
    await screen.findByRole('textbox', { name: 'Ad' })
    await act(() => router.navigate(-1))
    await waitFor(() => expect(where()).toBe('/admin/manufacturers'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('blocks an internal link while dirty: "Qal" keeps the page and the typed text, "Çıx" leaves', async () => {
    const { user, name } = await openEditForm()
    await user.type(name, ' EDITED')
    const here = where()
    await user.click(screen.getAllByRole('link', { name: 'Generatorlar' })[0])
    let d = await dialog()
    await user.click(within(d).getByRole('button', { name: 'Qal' }))
    expect(where()).toBe(here)
    expect(screen.getByRole('textbox', { name: 'Ad' })).toHaveValue('Perkins EDITED')
    await user.click(screen.getAllByRole('link', { name: 'Generatorlar' })[0])
    d = await dialog()
    await user.click(within(d).getByRole('button', { name: 'Çıx' }))
    await waitFor(() => expect(where()).toBe('/admin/generators'))
  })

  it('blocks the browser Back button while dirty and restores the page if the user stays', async () => {
    const { user, name, router } = await openEditForm()
    await user.type(name, ' EDITED')
    const here = where()
    await act(() => router.navigate(-1)) // what the Back button does (a POP navigation)
    const d = await dialog()
    await user.click(within(d).getByRole('button', { name: 'Qal' }))
    expect(where()).toBe(here)
    expect(screen.getByRole('textbox', { name: 'Ad' })).toHaveValue('Perkins EDITED')
    // pressing Back again and confirming leaves
    await act(() => router.navigate(-1))
    await user.click(within(await dialog()).getByRole('button', { name: 'Çıx' }))
    await waitFor(() => expect(where()).toBe('/admin/manufacturers'))
  })

  it('also guards Forward navigation', async () => {
    const { user, router } = await openEditForm()
    await act(() => router.navigate(-1)) // clean → list
    await waitFor(() => expect(where()).toBe('/admin/manufacturers'))
    await act(() => router.navigate(1)) // clean forward → form
    const name = await screen.findByRole('textbox', { name: 'Ad' })
    await user.type(name, 'x')
    await act(() => router.navigate(-1))
    await user.click(within(await dialog()).getByRole('button', { name: 'Çıx' }))
    await waitFor(() => expect(where()).toBe('/admin/manufacturers'))
    await act(() => router.navigate(1)) // forward onto a fresh, clean form: no prompt
    await screen.findByRole('textbox', { name: 'Ad' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('warns on tab close / refresh only while dirty', async () => {
    const { user, name } = await openEditForm()
    expect(beforeUnloadPrevented()).toBe(false)
    await user.type(name, 'x')
    await waitFor(() => expect(beforeUnloadPrevented()).toBe(true))
    await user.clear(name)
    await user.type(name, 'Perkins') // back to the original value → no longer dirty
    await waitFor(() => expect(beforeUnloadPrevented()).toBe(false))
  })

  it('Cancel ("Geri") asks while dirty', async () => {
    const { user, name } = await openEditForm()
    await user.type(name, 'x')
    await user.click(screen.getByRole('button', { name: 'Geri' }))
    await user.click(within(await dialog()).getByRole('button', { name: 'Qal' }))
    expect(where()).toMatch(/^\/admin\/manufacturers\/.+/)
  })

  it('saving resets the dirty state: no prompt afterwards, and no tab-close warning', async () => {
    const { user, name, store } = await openEditForm()
    await user.type(name, ' Saved')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    await waitFor(async () => expect((await store.list('manufacturers')).some((m) => m.name === 'Perkins Saved')).toBe(true))
    await waitFor(() => expect(beforeUnloadPrevented()).toBe(false))
    await user.click(screen.getAllByRole('link', { name: 'Generatorlar' })[0])
    await waitFor(() => expect(where()).toBe('/admin/generators'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('creating a record: the redirect after the first save is not blocked, and a dirty "new" form is guarded', async () => {
    const { user, router } = await mountAdmin('/admin/manufacturers/new')
    await user.type(await screen.findByRole('textbox', { name: 'Ad' }), 'Brand New')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    await waitFor(() => expect(where()).toMatch(SAVED_RECORD))
    expect(screen.queryByRole('dialog')).toBeNull()
    // a brand-new, partially filled form is protected too
    await act(() => router.navigate('/admin/manufacturers/new'))
    await waitFor(() => expect(where()).toBe('/admin/manufacturers/new'))
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Yeni istehsalçı' })).toBeInTheDocument()) // the new form has really replaced the old one
    await user.type(screen.getByRole('textbox', { name: 'Ad' }), 'Draft')
    await user.click(screen.getAllByRole('link', { name: 'Generatorlar' })[0])
    await user.click(within(await dialog()).getByRole('button', { name: 'Qal' }))
    expect(where()).toBe('/admin/manufacturers/new')
  })

  it('deleting a record does not trigger the prompt', async () => {
    const { user, router } = await mountAdmin('/admin/manufacturers/new')
    await user.type(await screen.findByRole('textbox', { name: 'Ad' }), 'Temp Brand')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    await waitFor(() => expect(where()).toMatch(SAVED_RECORD))
    await user.click(await screen.findByRole('button', { name: 'Sil' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sil' }))
    await waitFor(() => expect(where()).toBe('/admin/manufacturers'))
    expect(screen.queryByRole('dialog')).toBeNull()
    void router
  })

  it('document forms (Settings) are guarded too, and saving clears the flag', async () => {
    const { user, router } = await mountAdmin('/admin/settings')
    const company = await screen.findByRole('textbox', { name: 'Şirkət adı' })
    await user.type(company, ' X')
    await act(() => router.navigate('/admin/generators'))
    await user.click(within(await dialog()).getByRole('button', { name: 'Qal' }))
    expect(where()).toBe('/admin/settings')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    await waitFor(() => expect(beforeUnloadPrevented()).toBe(false))
    await act(() => router.navigate('/admin/generators'))
    await waitFor(() => expect(where()).toBe('/admin/generators'))
  })

  it('logging out with unsaved changes asks first (the form unmounting must not hide the loss)', async () => {
    const { user, name, store } = await openEditForm()
    await user.type(name, ' pending')
    await user.click(screen.getByRole('button', { name: /Çıxış/ }))
    await user.click(within(await dialog()).getByRole('button', { name: 'Qal' }))
    expect((await store.auth.getSession())?.email).toBeTruthy() // still signed in
    expect(screen.getByRole('textbox', { name: 'Ad' })).toHaveValue('Perkins pending')
    await user.click(screen.getByRole('button', { name: /Çıxış/ }))
    await user.click(within(await dialog()).getByRole('button', { name: 'Çıx' }))
    await waitFor(() => expect(where()).toBe('/admin/login'))
    expect(await store.auth.getSession()).toBeNull()
  })

  it('logging out a clean form does not ask', async () => {
    const { user } = await openEditForm()
    await user.click(screen.getByRole('button', { name: /Çıxış/ }))
    await waitFor(() => expect(where()).toBe('/admin/login'))
  })

  it('saving on top of a copy another tab already changed is refused with a clear message, nothing is overwritten', async () => {
    const { user, name, store } = await openEditForm()
    const other = (await store.list('manufacturers')).find((m) => m.slug === 'perkins')!
    await new Promise((r) => setTimeout(r, 4))
    await store.save('manufacturers', { ...other, name: 'Changed in another tab' })
    await user.type(name, ' mine')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    expect(await screen.findByText(/başqa yerdə dəyişdirilib/)).toBeInTheDocument()
    expect((await store.list('manufacturers')).find((m) => m.slug === 'perkins')!.name).toBe('Changed in another tab')
  })
})
