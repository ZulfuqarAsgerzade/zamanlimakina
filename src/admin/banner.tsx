import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useStore } from './ctx.tsx'

export const DEMO_BANNER = 'Yerli demo rejimi: dəyişikliklər yalnız bu brauzerdə saxlanılır və real verilənlər bazası deyil.'

export function ModeBanner() {
  const store = useStore()
  if (store.mode !== 'demo') return null
  return (
    <>
      <div className="mode-banner" role="note">
        <strong>Demo</strong> {DEMO_BANNER}
      </div>
      {store.persistence === 'memory' && (
        <div className="mode-banner mode-banner--warn" role="alert">
          <strong>Diqqət</strong> Brauzer yaddaşı (IndexedDB) bloklanıb və ya gizli pəncərədəsiniz — dəyişikliklər səhifəni yenilədikdə itəcək.
        </div>
      )}
    </>
  )
}

/** Site-configuration warnings the owner must act on (shown on every admin screen until fixed). */
export function ConfigWarnings() {
  const store = useStore()
  const { pathname } = useLocation()
  const [whatsapp, setWhatsapp] = useState<boolean | null>(null)
  useEffect(() => {
    let alive = true
    void store.getSettings().then((s) => alive && setWhatsapp(s.whatsapp.replace(/\D/g, '').length >= 9)).catch(() => undefined)
    return () => {
      alive = false
    }
  }, [store, pathname])
  if (whatsapp !== false) return null
  return (
    <div className="mode-banner mode-banner--warn" role="alert">
      <strong>WhatsApp təyin edilməyib</strong> Saytdakı “WhatsApp ilə sorğu” düymələri müştəriyə yalnız izahat pəncərəsi göstərir.{' '}
      <Link to="/admin/settings">Tənzimləmələrdə nömrəni daxil edin →</Link>
    </div>
  )
}
