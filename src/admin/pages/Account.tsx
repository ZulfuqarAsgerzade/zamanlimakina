import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth, useStore } from '../ctx.tsx'
import { Card, PageHeader, TextField, useConfirmLeave, useGuardedNavigate, useToast } from '../ui.tsx'
import { checkPassword, errMsg } from '../util.ts'

export function Account() {
  const store = useStore()
  const { user } = useAuth()
  const toast = useToast()
  const go = useGuardedNavigate()
  const confirmLeave = useConfirmLeave()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const demo = store.mode === 'demo'

  async function change(e: FormEvent) {
    e.preventDefault()
    setError('')
    const pw = checkPassword(next)
    if (pw) return setError(pw)
    if (next !== confirm) return setError('Yeni parollar uyğun gəlmir.')
    if (demo && !current) return setError('Cari parolu daxil edin.')
    setBusy(true)
    try {
      await store.auth.changePassword(next, current || undefined)
      setCurrent('')
      setNext('')
      setConfirm('')
      toast.success('Parol dəyişdirildi.')
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Hesab" sub="Giriş məlumatları və sessiyalar." />
      <div className="grid grid--2">
        <Card title="Sessiya">
          <dl className="dl">
            <dt>İstifadəçi</dt>
            <dd>{user?.email}</dd>
            <dt>Rejim</dt>
            <dd>{demo ? 'Yerli demo (brauzer)' : 'Supabase (istehsal)'}</dd>
          </dl>
          {demo && <p className="hint">Demo rejimində yalnız bir yerli sessiya mövcuddur; digər sessiyalar yoxdur. Sessiya brauzer tabı bağlananda bitir.</p>}
          <div className="row-actions">
            <button
              type="button"
              className="btn"
              onClick={async () => {
                try {
                  await store.auth.signOutOthers()
                  toast.success(demo ? 'Demo rejimində başqa sessiya yoxdur.' : 'Digər bütün sessiyalar bağlandı.')
                } catch (e) {
                  toast.error(errMsg(e))
                }
              }}
            >
              Digər sessiyalardan çıx
            </button>
            <button
              type="button"
              className="btn btn--danger-ghost"
              onClick={async () => {
                if (!(await confirmLeave())) return
                await store.auth.signOut()
                void go('/admin/login')
              }}
            >
              Çıxış
            </button>
          </div>
        </Card>
        <Card title="Parolu dəyiş">
          <form onSubmit={change} noValidate>
            <TextField label="Cari parol" type="password" value={current} onChange={setCurrent} autoComplete="current-password" required={demo} />
            <TextField label="Yeni parol" type="password" value={next} onChange={setNext} autoComplete="new-password" required hint="Ən azı 10 simvol, hərf və rəqəm." />
            <TextField label="Yeni parolu təsdiqləyin" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" required />
            {error && (
              <p className="err" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'Gözləyin…' : 'Parolu dəyiş'}
            </button>
          </form>
        </Card>
      </div>
    </>
  )
}
