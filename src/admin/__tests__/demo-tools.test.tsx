import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { demoToolsPolicy } from '../../data/demoPolicy.ts'
import type { DemoStore } from '../../data/demoStore.ts'
import { mountAdmin } from './helpers.tsx'

/** Dashboard demo tools against a store that REPORTS itself as a real (Supabase-mode) backend. Local, mocked: no Supabase involved. */
const asSupabase = (policy = demoToolsPolicy('supabase', {})) => async (st: DemoStore) => {
  Object.defineProperty(st, 'mode', { value: 'supabase' })
  Object.defineProperty(st, 'demoTools', { value: policy })
}

describe('dashboard demo tools', () => {
  it('local demo mode: install and remove are available and removal needs only a normal confirmation', async () => {
    const { user, store } = await mountAdmin('/admin')
    expect(await screen.findByRole('button', { name: 'Demo məlumatı yüklə' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Demo məlumatı sil' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByRole('textbox')).toBeNull()
    await user.click(within(dialog).getByRole('button', { name: 'Demo məlumatı sil' }))
    await waitFor(async () => expect((await store.list('generators')).length).toBe(0))
  })

  it('real database: install is disabled with an explanation', async () => {
    const { user } = await mountAdmin('/admin', { prepare: asSupabase() })
    const install = await screen.findByRole('button', { name: 'Demo məlumatı yüklə' })
    expect(install).toBeDisabled()
    expect(screen.getByText(/real Supabase layihəsinə qoşulub/)).toBeInTheDocument()
    await user.click(install)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('real database: removal needs the typed word and does nothing until it is entered', async () => {
    const { user, store } = await mountAdmin('/admin', { prepare: asSupabase() })
    const before = (await store.list('generators')).length
    await user.click(await screen.findByRole('button', { name: 'Demo məlumatı sil' }))
    const dialog = await screen.findByRole('dialog')
    const confirmBtn = within(dialog).getByRole('button', { name: 'Demo məlumatı sil' })
    expect(confirmBtn).toBeDisabled()
    await user.click(confirmBtn)
    expect((await store.list('generators')).length).toBe(before)
    const box = within(dialog).getByRole('textbox')
    await user.type(box, 'demo')
    expect(confirmBtn).toBeDisabled()
    await user.clear(box)
    await user.type(box, 'DEMO SİL')
    expect(confirmBtn).toBeEnabled()
    await user.click(confirmBtn)
    await waitFor(async () => expect((await store.list('generators')).length).toBe(0))
  })

  it('cancelling the typed confirmation removes nothing', async () => {
    const { user, store } = await mountAdmin('/admin', { prepare: asSupabase() })
    const before = (await store.list('generators')).length
    await user.click(await screen.findByRole('button', { name: 'Demo məlumatı sil' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByRole('textbox'), 'DEMO SİL')
    await user.click(within(dialog).getByRole('button', { name: 'Ləğv et' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect((await store.list('generators')).length).toBe(before)
  })
})
