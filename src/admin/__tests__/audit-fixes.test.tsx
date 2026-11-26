import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ICON_KEYS } from '../../components/ui/Icons.tsx'
import { isHttpUrl, searchMatch } from '../util.ts'
import { mountAdmin } from './helpers.tsx'

describe('admin search matcher', () => {
  it('keeps the query together but ignores case, diacritics and separators', () => {
    expect(searchMatch(['Perkins', '1104A-44TG2'], '1104a44tg2')).toBe(true)
    expect(searchMatch(['Yağ filtri'], 'YAG')).toBe(true)
    expect(searchMatch(['MEDIA-B.jpg'], 'media-a')).toBe(false) // not a loose token match
    expect(searchMatch(['x'], '   ')).toBe(true)
  })
  it('only accepts absolute http(s) URLs', () => {
    expect(isHttpUrl('https://instagram.com/x')).toBe(true)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpUrl('data:text/html,hi')).toBe(false)
    expect(isHttpUrl('/relative')).toBe(false)
  })
})

describe('settings: link validation', () => {
  it('rejects javascript: social links and Open Graph junk, accepts https', async () => {
    const { user, store } = await mountAdmin('/admin/settings')
    const ig = await screen.findByRole('textbox', { name: 'Instagram' })
    await user.type(ig, 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    expect((await screen.findAllByText(/Instagram: tam http\(s\) ünvanı/)).length).toBeGreaterThan(0)
    expect((await store.getSettings()).social.instagram).toBeUndefined()
    await user.clear(ig)
    await user.type(ig, 'https://instagram.com/zamanli')
    await user.click(screen.getByRole('button', { name: 'Saxla' }))
    await waitFor(async () => expect((await store.getSettings()).social.instagram).toBe('https://instagram.com/zamanli'))
  })
})

describe('entity form', () => {
  it('clears stale validation messages as soon as the field is fixed', async () => {
    const { user } = await mountAdmin('/admin/manufacturers/new')
    await user.click(await screen.findByRole('button', { name: 'Saxla' }))
    expect((await screen.findAllByText('Ad tələb olunur')).length).toBeGreaterThan(0)
    await user.type(screen.getByRole('textbox', { name: /^Ad/ }), 'Fixed Brand')
    await waitFor(() => expect(screen.queryAllByText('Ad tələb olunur')).toHaveLength(0))
  })
})

describe('content editor', () => {
  it('only suggests service icons the public site can render', () => {
    expect(ICON_KEYS).toEqual(expect.arrayContaining(['generator', 'clock', 'wrench', 'filter', 'shield', 'bolt']))
    expect(ICON_KEYS).not.toContain('phone')
    expect(ICON_KEYS).not.toContain('truck')
  })
})
