import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth, useStore } from '../ctx.tsx'
import { Spinner, TextField } from '../ui.tsx'
import { checkPassword, errMsg } from '../util.ts'
import { ModeBanner } from '../banner.tsx'

export function LoginPage() {
  const store = useStore()
  const { user, ready } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from || '/admin'

  const [setup, setSetup] = useState<boolean | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    store.auth.needsSetup().then(
      (v) => live && setSetup(v),
      () => live && setSetup(false),
    )
    return () => {
      live = false
    }
  }, [store])

  if (!ready || setup === null) return <Spinner />
  if (user) return <Navigate to={from} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (setup) {
      const pwErr = checkPassword(password)
      if (pwErr) return setError(pwErr)
      if (password !== confirm) return setError('Parollar uyğun gəlmir.')
    }
    setBusy(true)
    try {
      if (setup) await store.auth.setup(email, password)
      else await store.auth.signIn(email, password)
      nav(from, { replace: true })
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <ModeBanner />
      <form className="login__card" onSubmit={submit} noValidate>
        <div className="login__brand">
          <span className="sidebar__logo" aria-hidden="true">ZM</span>
          <div>
            <h1>{setup ? 'Demo administrator yarat' : 'Admin girişi'}</h1>
            <p className="sub">Zamanlı Makina idarəetmə paneli</p>
          </div>
        </div>
        {setup && (
          <p className="notice">
            Bu yerli demo rejimidir və standart parol yoxdur. İlk giriş üçün özünüz e-poçt və parol təyin edin. Demo autentifikasiyası təhlükəsizlik sərhədi deyil —
            məlumatlar yalnız bu brauzerdə saxlanılır. İstehsalda Supabase Auth istifadə olunur.
          </p>
        )}
        {!setup && store.mode === 'demo' && (
          <p className="notice">Demo autentifikasiyası təhlükəsizlik sərhədi deyil; real istehsalda Supabase Auth istifadə olunur.</p>
        )}
        <TextField label="E-poçt" type="email" value={email} onChange={setEmail} autoComplete="username" required />
        <TextField label="Parol" type="password" value={password} onChange={setPassword} autoComplete={setup ? 'new-password' : 'current-password'} required hint={setup ? 'Ən azı 10 simvol, hərf və rəqəm.' : undefined} />
        {setup && <TextField label="Parolu təsdiqləyin" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" required />}
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
          {busy ? 'Gözləyin…' : setup ? 'Yarat və daxil ol' : 'Daxil ol'}
        </button>
      </form>
    </div>
  )
}
