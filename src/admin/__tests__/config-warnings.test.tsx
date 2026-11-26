import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defaultSettings } from '../../data/defaults.ts'
import { mountAdmin } from './helpers.tsx'

describe('admin configuration warnings', () => {
  it('warns on every admin screen while the WhatsApp number is missing, and the warning disappears once it is set', async () => {
    const { user, store } = await mountAdmin('/admin')
    const warning = await screen.findByText('WhatsApp təyin edilməyib')
    expect(warning.closest('[role="alert"]')).toHaveTextContent('izahat pəncərəsi')
    await user.click(screen.getByRole('link', { name: /Tənzimləmələrdə nömrəni daxil edin/ }))
    await screen.findByRole('textbox', { name: 'WhatsApp nömrəsi' })
    expect(screen.getByText('WhatsApp təyin edilməyib')).toBeInTheDocument()
    await store.saveSettings({ ...defaultSettings(), whatsapp: '994501234567' })
    await user.click(screen.getAllByRole('link', { name: 'İdarə paneli' })[0])
    await waitFor(() => expect(screen.queryByText('WhatsApp təyin edilməyib')).not.toBeInTheDocument())
  })
})

describe('admin: hero facts editor', () => {
  it('starts from the defaults, saves edits in several languages, and persists them for the public site', async () => {
    const { user, store } = await mountAdmin('/admin/content')
    const value = await screen.findByRole('textbox', { name: /Göstərici #3 — dəyər/ })
    expect(value).toHaveValue('5 il')
    await user.clear(value)
    await user.type(value, '7 il')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    await waitFor(async () => expect((await store.getContent()).hero.facts?.[2].value.az).toBe('7 il'))
    expect((await store.getContent()).hero.facts?.[2].value.ru).toBe('5 лет') // other languages untouched
  })

  it('can remove every fact (strip hidden) and caps the list at four', async () => {
    const { user, store } = await mountAdmin('/admin/content')
    const add = await screen.findByRole('button', { name: '+ Göstərici əlavə et' })
    await user.click(add)
    expect(add).toBeDisabled() // 3 defaults + 1 = 4
    for (let i = 0; i < 4; i++) {
      const del = screen.getAllByRole('button', { name: 'Sil' })
      const target = del.find((b) => b.closest('.list-editor__row')?.textContent?.includes('Göstərici #')) as HTMLElement
      await user.click(target)
    }
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    await waitFor(async () => expect((await store.getContent()).hero.facts).toEqual([]))
  })
})
