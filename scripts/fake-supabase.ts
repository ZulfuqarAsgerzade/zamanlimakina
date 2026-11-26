/** Local stand-in for Supabase's public REST API (see scripts/lib/fakeSupabase.ts). Usage: npm run fake:supabase [port] */
import { startFakeSupabase } from './lib/fakeSupabase.ts'

const port = Number(process.argv[2] ?? 54321)
await startFakeSupabase(port)
console.log(`fake Supabase REST on http://127.0.0.1:${port}  (build with VITE_SUPABASE_URL=http://127.0.0.1:${port} VITE_SUPABASE_ANON_KEY=fake)`)
