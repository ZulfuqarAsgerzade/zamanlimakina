import { Suspense, lazy } from 'react'
import { Outlet, Route, Routes } from 'react-router'
import { DataProvider } from './data/DataContext.tsx'
import { LOCALES } from './data/types.ts'
import { SiteLayout } from './components/layout/SiteLayout.tsx'
import { ROUTE_PATHS } from './lib/routes.ts'
import type { RouteKey } from './lib/routes.ts'
import type { ComponentType } from 'react'
import type { Snapshot } from './data/types.ts'

// Public pages are code-split per route; the admin is a separate lazy chunk.
const Home = lazy(() => import('./pages/Home.tsx'))
const Generators = lazy(() => import('./pages/Generators.tsx'))
const GeneratorCategory = lazy(() => import('./pages/Generators.tsx').then((m) => ({ default: m.GeneratorCategoryPage })))
const Brands = lazy(() => import('./pages/Brands.tsx'))
const Brand = lazy(() => import('./pages/Brands.tsx').then((m) => ({ default: m.BrandPage })))
const GeneratorDetail = lazy(() => import('./pages/GeneratorDetail.tsx'))
const Parts = lazy(() => import('./pages/Parts.tsx'))
const PartDetail = lazy(() => import('./pages/Parts.tsx').then((m) => ({ default: m.PartDetailPage })))
const Services = lazy(() => import('./pages/Company.tsx').then((m) => ({ default: m.ServicesPage })))
const About = lazy(() => import('./pages/Company.tsx').then((m) => ({ default: m.AboutPage })))
const Contact = lazy(() => import('./pages/Company.tsx').then((m) => ({ default: m.ContactPage })))
const Faq = lazy(() => import('./pages/Company.tsx').then((m) => ({ default: m.FaqPage })))
const Search = lazy(() => import('./pages/Search.tsx'))
const NotFound = lazy(() => import('./pages/NotFound.tsx'))
const AdminApp = lazy(() => import('./admin/AdminApp.tsx'))

const PAGES: Record<RouteKey, ComponentType> = {
  home: Home,
  generators: Generators,
  generator: GeneratorDetail,
  generatorCategory: GeneratorCategory,
  brands: Brands,
  brand: Brand,
  parts: Parts,
  part: PartDetail,
  services: Services,
  about: About,
  contact: Contact,
  faq: Faq,
  search: Search,
}

const ROUTE_ORDER = Object.keys(ROUTE_PATHS) as RouteKey[]

function PublicData({ initial }: { initial?: Snapshot }) {
  return (
    <DataProvider initial={initial}>
      <Outlet />
    </DataProvider>
  )
}

export default function App({ initial }: { initial?: Snapshot }) {
  return (
    <Suspense fallback={<div className="route-loading" aria-hidden="true" />}>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route element={<PublicData initial={initial} />}>
          {LOCALES.map((locale) => (
            <Route key={locale} path={locale === 'az' ? undefined : `/${locale}`} element={<SiteLayout locale={locale} />}>
              {ROUTE_ORDER.map((key) => {
                const Page = PAGES[key]
                const seg = ROUTE_PATHS[key][locale]
                return seg === '' ? <Route key={key} index element={<Page />} /> : <Route key={key} path={seg} element={<Page />} />
              })}
              <Route path="*" element={<NotFound />} />
            </Route>
          ))}
        </Route>
      </Routes>
    </Suspense>
  )
}
