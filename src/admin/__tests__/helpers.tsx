import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, Route, Routes, createMemoryRouter, useLocation } from 'react-router'
import AdminApp from '../AdminApp.tsx'
import { setStoreForTests } from '../../data/index.ts'
import { DemoStore } from '../../data/demoStore.ts'

let n = 0
export const TEST_EMAIL = 'admin@example.test'
export const TEST_PASSWORD = 'Passw0rd-test1'

function Where() {
  const l = useLocation()
  return <output data-testid="where">{l.pathname}</output>
}

export async function mountAdmin(
  path = '/admin',
  opts: { signedIn?: boolean; autoSeed?: boolean; setup?: boolean; prepare?: (store: DemoStore) => Promise<void> } = {},
) {
  const { signedIn = true, autoSeed = true, setup = true } = opts
  sessionStorage.clear()
  const store = new DemoStore({ dbName: `admin-test-${++n}-${Date.now()}`, autoSeed })
  setStoreForTests(store)
  if (setup) await store.auth.setup(TEST_EMAIL, TEST_PASSWORD)
  if (opts.prepare) await opts.prepare(store)
  if (!signedIn) await store.auth.signOut()
  const user = userEvent.setup()
  // a DATA router, like production (main.tsx): the unsaved-changes blocker needs one
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <>
            <Where />
            <Routes>
              <Route path="/admin/*" element={<AdminApp />} />
              <Route path="*" element={<p>outside admin</p>} />
            </Routes>
          </>
        ),
      },
    ],
    { initialEntries: [path] },
  )
  const utils = render(<RouterProvider router={router} />)
  return { store, user, router, ...utils }
}

export const pngLike = (name = 'photo.png') => new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/png' })
