import { Component, Suspense, useEffect, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import './admin.css'
import { ConfigWarnings, ModeBanner } from './banner.tsx'
import { AdminDataProvider, AuthProvider, StoreProvider, useAdminData, useAuth, useStore } from './ctx.tsx'
import {
  IcCog,
  IcDashboard,
  IcDoc,
  IcFactory,
  IcGenerator,
  IcGear,
  IcImage,
  IcLogout,
  IcMail,
  IcMenu,
  IcTag,
  IcUser,
} from './icons.tsx'
import { Account } from './pages/Account.tsx'
import { CategoriesList, CategoryForm } from './pages/Categories.tsx'
import { ContentPage } from './pages/Content.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { GeneratorForm, GeneratorsList } from './pages/Generators.tsx'
import { InquiriesPage } from './pages/Inquiries.tsx'
import { LoginPage } from './pages/Login.tsx'
import { ManufacturerForm, ManufacturersList } from './pages/Manufacturers.tsx'
import { MediaPage } from './pages/Media.tsx'
import { PartForm, PartsList } from './pages/Parts.tsx'
import { SettingsPage } from './pages/Settings.tsx'
import { GuardedLink, Spinner, UiProviders, useConfirmLeave, useGuardedNavigate } from './ui.tsx'

const NAV = [
  { to: '/admin', label: 'İdarə paneli', icon: IcDashboard, end: true },
  { to: '/admin/manufacturers', label: 'İstehsalçılar', icon: IcFactory },
  { to: '/admin/generators', label: 'Generatorlar', icon: IcGenerator },
  { to: '/admin/parts', label: 'Ehtiyat hissələri', icon: IcGear },
  { to: '/admin/categories', label: 'Kateqoriyalar', icon: IcTag },
  { to: '/admin/media', label: 'Media kitabxanası', icon: IcImage },
  { to: '/admin/content', label: 'Sayt məzmunu', icon: IcDoc },
  { to: '/admin/settings', label: 'Tənzimləmələr', icon: IcCog },
  { to: '/admin/inquiries', label: 'Sorğular', icon: IcMail },
  { to: '/admin/account', label: 'Hesab', icon: IcUser },
] as const

function Shell() {
  const { user } = useAuth()
  const store = useStore()
  const { pathname } = useLocation()
  const { inquiries, loading, error, reload } = useAdminData()
  const go = useGuardedNavigate()
  const confirmLeave = useConfirmLeave()
  const [open, setOpen] = useState(false)
  const newCount = inquiries.filter((i) => i.status === 'new').length

  return (
    <div className="shell">
      <aside className={`sidebar${open ? ' is-open' : ''}`} aria-label="Admin naviqasiyası">
        <div className="sidebar__brand">
          <span className="sidebar__logo" aria-hidden="true">ZM</span>
          <span>
            Zamanlı Makina
            <small>Admin paneli</small>
          </span>
        </div>
        <nav>
          {NAV.map(({ to, label, icon: Icon, ...rest }) => {
            const active = 'end' in rest ? pathname === to || pathname === `${to}/` : pathname === to || pathname.startsWith(`${to}/`)
            return (
              <GuardedLink key={to} to={to} className={`nav-link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)}>
                <Icon />
                {label}
                {to === '/admin/inquiries' && newCount > 0 && <span className="nav-count">{newCount}</span>}
              </GuardedLink>
            )
          })}
        </nav>
        <div className="sidebar__foot">
          <a className="nav-link" href="/" target="_blank" rel="noreferrer">
            Saytı aç ↗
          </a>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn topbar__menu" aria-label="Menyunu aç" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <IcMenu />
          </button>
          <span className="topbar__spacer" />
          <span className="topbar__user" title={user?.email}>
            {user?.email}
          </span>
          <button
            type="button"
            className="btn btn--sm"
            onClick={async () => {
              if (!(await confirmLeave())) return
              await store.auth.signOut()
              void go('/admin/login')
            }}
          >
            <IcLogout /> Çıxış
          </button>
        </header>
        <ModeBanner />
        <ConfigWarnings />
        <main className="content" id="admin-main">
          {loading ? (
            <Spinner />
          ) : error ? (
            <div className="card">
              <p className="err">Məlumatları yükləmək alınmadı: {error}</p>
              <button type="button" className="btn" onClick={() => void reload()}>
                Yenidən cəhd et
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  )
}

/** Everything below requires a session; unauthenticated visitors are sent to the login page. */
function RequireAuth() {
  const { user, ready } = useAuth()
  const loc = useLocation()
  if (!ready) return <Spinner />
  if (!user) return <Navigate to="/admin/login" replace state={{ from: loc.pathname + loc.search }} />
  return (
    <AdminDataProvider>
      <Shell />
    </AdminDataProvider>
  )
}

/** Admin pages must never be indexed and get their own tab title. */
function useAdminHead() {
  useEffect(() => {
    const prevTitle = document.title
    document.title = 'Admin paneli — Zamanlı Makina'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,nofollow'
    meta.dataset.admin = '1'
    document.head.appendChild(meta)
    return () => {
      document.title = prevTitle
      meta.remove()
    }
  }, [])
}

/** A render crash must never leave the editor with a blank white page (unsaved work is already lost, say so plainly). */
class AdminErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[admin] render error', error, info.componentStack)
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="card" role="alert" style={{ margin: 24 }}>
        <h1 style={{ marginTop: 0 }}>Gözlənilməz xəta</h1>
        <p>İdarə paneli bu səhifəni göstərə bilmədi. Səhifəni yeniləyin; problem davam edərsə bunu inkişaf komandasına bildirin.</p>
        <p className="muted" style={{ fontSize: 13 }}>{this.state.error.message}</p>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          Səhifəni yenilə
        </button>
      </div>
    )
  }
}

export default function AdminApp() {
  useAdminHead()
  return (
    <div className="adm">
      <AdminErrorBoundary>
      <Suspense fallback={<Spinner />}>
        <StoreProvider>
          <UiProviders>
            <AuthProvider>
              <Routes>
                <Route path="login" element={<LoginPage />} />
                <Route element={<RequireAuth />}>
                  <Route index element={<Dashboard />} />
                  <Route path="manufacturers" element={<ManufacturersList />} />
                  <Route path="manufacturers/new" element={<ManufacturerForm />} />
                  <Route path="manufacturers/:id" element={<ManufacturerForm />} />
                  <Route path="generators" element={<GeneratorsList />} />
                  <Route path="generators/new" element={<GeneratorForm />} />
                  <Route path="generators/:id" element={<GeneratorForm />} />
                  <Route path="parts" element={<PartsList />} />
                  <Route path="parts/new" element={<PartForm />} />
                  <Route path="parts/:id" element={<PartForm />} />
                  <Route path="categories" element={<CategoriesList />} />
                  <Route path="categories/new" element={<CategoryForm />} />
                  <Route path="categories/:id" element={<CategoryForm />} />
                  <Route path="media" element={<MediaPage />} />
                  <Route path="content" element={<ContentPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="inquiries" element={<InquiriesPage />} />
                  <Route path="account" element={<Account />} />
                </Route>
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </AuthProvider>
          </UiProviders>
        </StoreProvider>
      </Suspense>
      </AdminErrorBoundary>
    </div>
  )
}
