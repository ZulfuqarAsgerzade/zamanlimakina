/**
 * Fails the build if the PUBLIC Supabase variable holds a privileged key. Anything named VITE_* is inlined into the browser bundle,
 * and the Supabase dashboard shows several keys side by side — pasting the wrong one would publish full database access.
 */
export function assertPublicKeyOnly(env: Record<string, string | undefined>): void {
  const key = (env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  if (!key) return
  let role = ''
  try {
    role = String(JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString()).role ?? '')
  } catch {
    /* not a JWT (new-style publishable key): checked by prefix below */
  }
  if (role === 'service_role' || key.startsWith('sb_secret_'))
    throw new Error(
      'VITE_SUPABASE_ANON_KEY contains a SERVICE-ROLE / secret key. It would be shipped to every visitor. Use the public "anon" / "publishable" key and keep the secret key out of VITE_* variables.',
    )
}

/**
 * `VITE_ALLOW_DEMO_TOOLS=true` re-enables "install demo data" in the admin panel of a Supabase-connected build. That is for a
 * disposable staging project only, so a production-context build (Netlify `CONTEXT=production`) refuses it outright.
 */
export function assertDemoToolsNotInProduction(env: Record<string, string | undefined>, context: string | undefined): void {
  if (context === 'production' && (env.VITE_ALLOW_DEMO_TOOLS ?? '').trim().toLowerCase() === 'true')
    throw new Error(
      'VITE_ALLOW_DEMO_TOOLS=true is not allowed in a production build: it would let the admin panel write demo records into the live database. Remove the variable from the production environment.',
    )
}
