import { act, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Store } from '../../data/store.ts'
import { mountAdmin } from './helpers.tsx'

/** Alt-text edits in the media dialog are protected like any other form: Save, Cancel (Bağla / ✕ / Esc / backdrop), Back. */

const beforeUnloadPrevented = () => {
  const e = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(e)
  return e.defaultPrevented
}

async function openFirst(path = '/admin/media') {
  const ctx = await mountAdmin(path)
  const tiles = await screen.findAllByRole('button', { name: /^Aç: / })
  await ctx.user.click(tiles[0])
  const dialog = await screen.findByRole('dialog')
  const field = within(dialog).getByRole('textbox', { name: /Alt mətn/ })
  return { ...ctx, dialog, field, name: tiles[0].getAttribute('aria-label')!.replace('Aç: ', '') }
}

// the dialog has two "Bağla" buttons: the ✕ in the header (first) and the footer button (last)
const xClose = (d: HTMLElement) => within(d).getAllByRole('button', { name: 'Bağla' })[0]
const footClose = (d: HTMLElement) => within(d).getAllByRole('button', { name: 'Bağla' }).at(-1)!

const gate = () => {
  let release!: () => void
  const promise = new Promise<void>((r) => (release = r))
  return { promise, release }
}

describe('media alt text: unsaved-changes protection', () => {
  it('closes without any warning when nothing changed', async () => {
    const { user, dialog } = await openFirst()
    expect(beforeUnloadPrevented()).toBe(false)
    await user.click(footClose(dialog))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('asks before "Bağla" when edited; "Qal" keeps the dialog and the text, confirming closes it', async () => {
    const { user, dialog, field } = await openFirst()
    await user.type(field, ' XYZ')
    expect(beforeUnloadPrevented()).toBe(true)
    await user.click(footClose(dialog))
    expect(await screen.findByText('Saxlanmamış dəyişikliklər')).toBeInTheDocument()
    const dialogs = screen.getAllByRole('dialog')
    await user.click(within(dialogs[dialogs.length - 1]).getByRole('button', { name: 'Qal' }))
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1))
    expect((field as HTMLInputElement).value).toMatch(/XYZ$/)

    await user.click(footClose(screen.getByRole('dialog')))
    const again = screen.getAllByRole('dialog')
    await user.click(within(again[again.length - 1]).getByRole('button', { name: /Bağla, itir/ }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(beforeUnloadPrevented()).toBe(false)
  })

  it('protects Esc and the ✕ button too, and does not store anything when discarded', async () => {
    const { user, store, dialog, field, name } = await openFirst()
    const before = (await store.list('media')).find((m) => m.name === name)!.alt
    await user.type(field, ' ESC')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBe(2))
    await user.click(within(screen.getAllByRole('dialog')[1]).getByRole('button', { name: 'Qal' }))
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBe(1))
    await user.click(xClose(dialog)) // the ✕ button is guarded as well
    expect(await screen.findByText('Saxlanmamış dəyişikliklər')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /Bağla, itir/ }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect((await store.list('media')).find((m) => m.name === name)!.alt).toEqual(before)
  })

  it('blocks browser Back while dirty and lets it through after confirming', async () => {
    const { user, router, field } = await openFirst()
    await act(async () => {
      await router.navigate('/admin/media?x=1') // a history entry to go back from
    })
    await user.type(field, ' BACK')
    await act(async () => {
      void router.navigate('/admin/settings')
    })
    expect(router.state.location.pathname).toBe('/admin/media')
    const dialogs = await screen.findAllByRole('dialog')
    await user.click(within(dialogs[dialogs.length - 1]).getByRole('button', { name: 'Qal' }))
    expect(router.state.location.pathname).toBe('/admin/media')
  })

  it('Save stores the text, clears the dirty state, and then closes silently', async () => {
    const { user, store, dialog, field, name } = await openFirst()
    await user.type(field, ' SAVED')
    await user.click(within(dialog).getByRole('button', { name: 'Alt mətni saxla' }))
    await waitFor(async () => expect((await store.list('media')).find((m) => m.name === name)!.alt.az).toMatch(/SAVED$/))
    await waitFor(() => expect(beforeUnloadPrevented()).toBe(false))
    await user.click(footClose(screen.getByRole('dialog')))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('keeps text typed during an in-flight save as unsaved, and only submits once', async () => {
    const { user, store, dialog, field, name } = await openFirst()
    const g = gate()
    const real = store.save.bind(store) as Store['save']
    const spy = vi.spyOn(store, 'save').mockImplementation((async (entity: never, rec: never) => {
      await g.promise
      return real(entity, rec)
    }) as never)
    await user.type(field, ' A')
    const saveBtn = within(dialog).getByRole('button', { name: 'Alt mətni saxla' })
    await user.click(saveBtn)
    await user.click(saveBtn) // duplicate click while in flight
    await user.type(field, 'B')
    expect(spy).toHaveBeenCalledTimes(1)
    await act(async () => {
      g.release()
    })
    await waitFor(async () => expect((await store.list('media')).find((m) => m.name === name)!.alt.az).toMatch(/ A$/))
    expect((field as HTMLInputElement).value).toMatch(/ AB$/)
    expect(beforeUnloadPrevented()).toBe(true) // 'B' is still unsaved
    spy.mockRestore()
    await user.click(within(dialog).getByRole('button', { name: 'Alt mətni saxla' }))
    await waitFor(async () => expect((await store.list('media')).find((m) => m.name === name)!.alt.az).toMatch(/ AB$/))
    await waitFor(() => expect(beforeUnloadPrevented()).toBe(false))
  })

  it('a failed save keeps the text and the dirty state', async () => {
    const { user, store, dialog, field } = await openFirst()
    vi.spyOn(store, 'save').mockRejectedValueOnce(new Error('Şəbəkə xətası'))
    await user.type(field, ' FAIL')
    await user.click(within(dialog).getByRole('button', { name: 'Alt mətni saxla' }))
    expect((await screen.findAllByText(/Şəbəkə xətası/)).length).toBeGreaterThan(0)
    expect((field as HTMLInputElement).value).toMatch(/FAIL$/)
    expect(beforeUnloadPrevented()).toBe(true)
    expect(within(dialog).getByRole('button', { name: 'Alt mətni saxla' })).toBeEnabled()
  })
})
