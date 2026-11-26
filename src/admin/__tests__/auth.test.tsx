import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TEST_EMAIL, TEST_PASSWORD, mountAdmin } from './helpers.tsx'

describe('admin auth gate', () => {
  it('redirects signed-out visitors from any admin route to the login page', async () => {
    await mountAdmin('/admin/generators', { signedIn: false })
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/admin/login'))
    expect(await screen.findByRole('button', { name: /Yarat və daxil ol|Daxil ol/ })).toBeInTheDocument()
    expect(screen.queryByText('Generatorlar')).not.toBeInTheDocument()
  })

  it('shows the honest demo-mode banner on the login screen', async () => {
    await mountAdmin('/admin/login', { signedIn: false })
    expect(await screen.findByText(/Yerli demo rejimi: dəyişikliklər yalnız bu brauzerdə saxlanılır/)).toBeInTheDocument()
    expect(screen.getByText(/təhlükəsizlik sərhədi deyil/)).toBeInTheDocument()
  })

  it('first run: asks to create the demo administrator (no default credentials) and signs in', async () => {
    const { user } = await mountAdmin('/admin', { signedIn: false, setup: false })
    expect(await screen.findByRole('heading', { name: 'Demo administrator yarat' })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/^E-poçt/), 'owner@example.test')
    await user.type(screen.getByLabelText(/^Parol \*?$/), 'weak')
    await user.type(screen.getByLabelText(/^Parolu təsdiqləyin/), 'weak')
    await user.click(screen.getByRole('button', { name: 'Yarat və daxil ol' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('ən azı 10 simvol')

    await user.clear(screen.getByLabelText(/^Parol \*?$/))
    await user.clear(screen.getByLabelText(/^Parolu təsdiqləyin/))
    await user.type(screen.getByLabelText(/^Parol \*?$/), 'LongPass1234')
    await user.type(screen.getByLabelText(/^Parolu təsdiqləyin/), 'LongPass1234')
    await user.click(screen.getByRole('button', { name: 'Yarat və daxil ol' }))
    expect(await screen.findByRole('heading', { name: 'İdarə paneli' })).toBeInTheDocument()
  })

  it('rejects a wrong password and accepts the right one; logout returns to login', async () => {
    const { user } = await mountAdmin('/admin/login', { signedIn: false })
    await user.type(await screen.findByLabelText(/^E-poçt/), TEST_EMAIL)
    await user.type(screen.getByLabelText(/^Parol/), 'Wrong-password1')
    await user.click(screen.getByRole('button', { name: 'Daxil ol' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('yanlışdır')

    await user.clear(screen.getByLabelText(/^Parol/))
    await user.type(screen.getByLabelText(/^Parol/), TEST_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Daxil ol' }))
    expect(await screen.findByRole('heading', { name: 'İdarə paneli' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Çıxış/ }))
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/admin/login'))
  })

  it('changes the password from the Account page', async () => {
    const { user, store } = await mountAdmin('/admin/account')
    await user.type(await screen.findByLabelText(/^Cari parol/), TEST_PASSWORD)
    await user.type(screen.getByLabelText(/^Yeni parol \*?$/), 'Another-pass-22')
    await user.type(screen.getByLabelText(/^Yeni parolu təsdiqləyin/), 'Another-pass-22')
    await user.click(screen.getByRole('button', { name: 'Parolu dəyiş' }))
    expect(await screen.findByText('Parol dəyişdirildi.')).toBeInTheDocument()
    await store.auth.signOut()
    await expect(store.auth.signIn(TEST_EMAIL, 'Another-pass-22')).resolves.toBeTruthy()
  })
})
