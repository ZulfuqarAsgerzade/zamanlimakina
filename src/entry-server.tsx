import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'

/** Build zamanı çağırılır (scripts/prerender.mjs) — axtarış robotları üçün hazır HTML. */
export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
