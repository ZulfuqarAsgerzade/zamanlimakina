import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'

import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-ext-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/barlow-condensed/latin-ext-700.css'
import '@fontsource/barlow-condensed/latin-800.css'
import '@fontsource/barlow-condensed/latin-ext-800.css'
import '@fontsource-variable/manrope/wght.css'

import './styles/global.css'
import App from './App'

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

// İstehsalda HTML əvvəlcədən yaradılır (scripts/prerender.mjs) — varsa hydrate, yoxsa (dev) sıfırdan render
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
