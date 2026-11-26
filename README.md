# Zamanlı Makina — generator catalogue & spare-parts platform

Vite + React 19 + TypeScript. Public catalogue site (AZ / RU / EN), WhatsApp inquiry flow, and a full admin panel.
Deploys to Netlify. Backend: **Supabase** (PostgreSQL + Auth + Storage) in production, and a **local demo mode**
that needs no backend at all.

> This repository replaces the former "coming soon" page. The old sources remain in git history on `main`.

- [Quick start (demo mode)](#quick-start-demo-mode)
- [How the data layer works](#how-the-data-layer-works)
- [Production setup (Supabase + Netlify)](#production-setup-supabase--netlify)
- [Environment variables](#environment-variables)
- [Demo data](#demo-data)
- [Admin panel](#admin-panel)
- [Languages & URLs](#languages--urls)
- [WhatsApp inquiries & analytics](#whatsapp-inquiries--analytics)
- [SEO](#seo)
- [Design system & brand book](#design-system--brand-book)
- [Project structure](#project-structure)
- [Scripts, tests & QA](#scripts-tests--qa)
- [Assumptions, limits & things to verify](#assumptions-limits--things-to-verify)

---

## Quick start (demo mode)

```bash
npm install            # Node ^20.19 or >=22.12
npm run dev            # http://localhost:5173
```

1. Open the site — the demo catalogue (5 manufacturers, 17 generators, 27 parts, compatibility links) is there immediately.
2. Open **`/admin`**. The first visit asks you to *create a demo administrator* (e-mail + a password of your choice).
   **There are no default credentials** anywhere in this project.
3. Everything in the admin works: CRUD, specs editor, compatibility, media library, content, settings, demo tools.

> **Demo mode is browser-local.** Data lives in this browser's IndexedDB. It is not shared with other visitors or
> devices, it is not a production database, and the demo "authentication" only gates the UI — it is **not** a security
> boundary. The site shows a banner saying so. Production uses Supabase (below).

npm note: if `npm install` fails with `EACCES … ~/.npm/_cacache` (root-owned cache), use
`npm install --cache ./.npm-cache` (`.npm-cache` is git-ignored) — or fix the cache ownership.

## How the data layer works

```
 React UI ──► Store interface (src/data/store.ts) ──┬─► DemoStore      (IndexedDB, no backend)      ← no env vars
                                                    └─► SupabaseStore  (Postgres + Auth + Storage)  ← VITE_SUPABASE_*
```

`src/data/index.ts` picks the backend at build time: if `VITE_SUPABASE_URL` **and** `VITE_SUPABASE_ANON_KEY` are set →
Supabase; otherwise demo mode (`VITE_DATA_MODE=demo` forces demo even when they are set).

Both stores run the **same validation** (`src/data/schema.ts`, zod). In Supabase mode the SQL migrations repeat the
critical rules as `CHECK` constraints, foreign keys and row-level-security policies, so a hand-crafted API call cannot
bypass them. The browser only ever holds the public **anon** key.

Catalogue model: `Manufacturer → Generator (→ dynamic spec groups) ⇄ compatible Parts`, plus categories (generator /
part kinds), media library, inquiries, and two JSON documents (`settings`, `content`). A spare part can fit many
generators (`part_compatibility` join table), managed from either the generator or the part form.

## Demo-mode persistence — what survives and what does not

| Situation | Demo data & admin changes |
| --- | --- |
| Page refresh, back/forward, in-app navigation | ✅ kept (IndexedDB) |
| Closing and re-opening the browser | ✅ kept — unless the browser clears site data on exit, private/incognito mode, or storage is evicted under disk pressure (the app asks the browser for persistent storage) |
| Another tab of the same browser | ✅ shared; writes are atomic (read-modify-write in one IndexedDB transaction), stale saves are refused (`ConflictError`), and public + admin tabs refresh automatically |
| Admin login | ⚠️ per tab (`sessionStorage`): a new tab/browser restart asks you to sign in again |
| Another browser, device, profile, visitor, or incognito window | ❌ separate, empty database (seeds the demo set on first load) |
| Production site / other people | ❌ never — nothing is sent anywhere |
| Quota exceeded / storage blocked | the save is rejected with a clear error (nothing half-saved); if IndexedDB is unavailable the app keeps working in memory and the admin says changes are lost on reload |

Large uploads are stored as data URLs inside IndexedDB (browser quota applies). **Demo mode cannot touch production data:**
the backend is chosen at build time — `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` present ⇒ the Supabase store is used and the
demo store is never instantiated; absent ⇒ the demo store, which performs no network requests (both facts are unit-tested).

## Production setup (Supabase + Netlify)

No production credentials were available while building this, so **the Supabase path has not been run against a live
project** — see [Assumptions & limits](#assumptions-limits--things-to-verify) for exactly what was and was not verified.

1. **Create a Supabase project** (supabase.com). Note *Project URL* and *anon public key* (Settings → API).
2. **Apply the schema.** Either `supabase link` + `supabase db push`, or paste the two files in `supabase/migrations/`
   into the SQL editor, in order:
   `20260101000000_schema.sql` (tables, constraints) → `20260101000100_rls_and_storage.sql` (RLS + `media` storage bucket).
3. **Create the first admin.** Authentication → Users → *Add user* (e-mail + a strong password you choose, disable
   public sign-ups under Authentication → Providers → Email → "Allow new users to sign up" if you want an invite-only
   project). Then run `supabase/first-admin.sql` in the SQL editor (edit the e-mail first). Only users listed in
   `public.admin_users` can write anything.
4. **Netlify**: connect the GitHub repo (`ZulfuqarAsgerzade/zamanlimakina`). `netlify.toml` already sets the build
   command (`npm run build`), publish dir (`dist`), SPA fallback, caching, security headers and the CSP.
   Add the environment variables below (Site settings → Environment variables).
5. Deploy, open `/admin/login`, sign in, and:
   - **Settings → WhatsApp number** (digits, international format, e.g. `994XXXXXXXXX`), phone, e-mail, address, hours, social links.
   - Replace the generated artwork with real photography in the **Media library** and on each product.
   - Add real manufacturers / generators / parts. When ready, **remove demo data** (dashboard button, or `npm run demo:remove -- --yes --confirm-host=<project host>`; preview first with `--dry-run`).
6. Optional: set `SITE_URL` if the canonical domain differs from `https://zamanlimakina.az`.
7. **Rebuild when content changes.** Product / manufacturer / category pages are prerendered at build time (see [SEO](#seo)).
   Create a Netlify *Build hook* (Site settings → Build & deploy → Build hooks) and call it from a Supabase *Database Webhook*
   (Database → Webhooks) on insert/update/delete of `generators`, `parts`, `manufacturers`, `categories`, `site_settings`
   — or just trigger a deploy after a batch of edits. Until the rebuild finishes, a brand-new product URL still works for
   visitors (the app renders it live), it simply is not yet in the static HTML/sitemap snapshot that crawlers see first.
   (`/sitemap.xml` is dynamic and lists new products immediately.)

**Safety net:** a build in Netlify's *production* context **fails** if Supabase variables are missing, so the browser-local
demo can never be deployed to the live domain by accident. Set `ALLOW_DEMO_BUILD=true` only if you really want a public demo.
Deploy previews / branch deploys may run in demo mode.

> Nothing in this repository pushes to production or touches production data. The scripts that write to a database
> require the service-role key, an explicit `--yes` **and** `--confirm-host=<project host>`.

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | build (public) | Supabase project URL. With the anon key it switches the app to Supabase mode. |
| `VITE_SUPABASE_ANON_KEY` | build (public) | Public anon key — safe in the browser; RLS protects data. |
| `VITE_DATA_MODE` | build, optional | `demo` forces local demo mode. |
| `SITE_URL` / `VITE_SITE_URL` | build, optional | Canonical origin for canonical/hreflang/robots/sitemap (default `https://zamanlimakina.az`). |
| `VITE_ALLOW_DEMO_TOOLS` | build, optional | `true` re-enables *install demo data* in the admin panel of a Supabase-connected build. **Staging only** — a production-context build fails if it is set. |
| `ALLOW_DEMO_TOOLS` | CLI only | Must be `true` for `npm run demo:install` to write anything. |
| `ALLOW_DEMO_BUILD` | build, optional | `true` allows a *production-context* Netlify build without Supabase (public demo). Default: such a build fails. |
| `SUPABASE_SERVICE_ROLE_KEY` | **local/CI only** | Used **only** by `scripts/demo.ts`. Never prefix with `VITE_`, never set in Netlify's build env for the site. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Netlify runtime | Read by the `/sitemap.xml` function (the `VITE_*` names also work). |

`.env.example` documents all of them. `.env*` files are git-ignored.

## Demo data

Every demo record has `isDemo = true` (`is_demo` in SQL), a deterministic UUID, and is visibly marked on the site
("Demo" badge, notes under specs, `DEMO-` part codes). Technical figures are **illustrative, formula-derived** — not
manufacturer specifications — and only a few records carry a (clearly labelled) demo price; the rest use
"Qiymət sorğu ilə". Demo product pages are served with `noindex` and are excluded from the sitemap, so fake
inventory can never be indexed on the real domain. There are no fake reviews, certificates or statistics.

| Where | Install | Remove |
| --- | --- | --- |
| Local demo mode | automatic on first load · Admin → Dashboard → *Demo məlumatı yüklə* | Admin → Dashboard → *Demo məlumatı sil* |
| Supabase (admin session) | **disabled** unless the build sets `VITE_ALLOW_DEMO_TOOLS=true` (staging only — a production-context build refuses it) | Admin → Dashboard → *Demo məlumatı sil*, after typing `DEMO SİL` |
| Supabase (CLI / CI) | `ALLOW_DEMO_TOOLS=true npm run demo:install -- --yes --confirm-host=<project host>` | `npm run demo:remove -- --yes --confirm-host=<project host>` |

Both CLI commands accept `--dry-run` (reports what would happen, writes nothing). Install refuses a database that already holds
genuine records (override with `--allow-populated` on a disposable project) and never overwrites a genuine row that uses a demo id.

Install is idempotent (upsert by id). **A record counts as demo data only if it has `is_demo = true` _and_ one of the
dataset's deterministic ids** — the flag alone is never enough, so a genuine record flagged by mistake is kept and reported
as "skipped". **Removal deletes only those rows.** Genuine records that referenced demo
ones are *detached* (their manufacturer/category cleared, generators fall back to draft because a published generator
needs a manufacturer) and compatibility links to demo rows are dropped — nothing genuine is ever deleted. The report
shows `added / removed / detached`.

Regenerate the placeholder artwork with `npm run demo:art` (`scripts/generate-demo-art.ts` → `public/demo/*.svg`).
The artwork is a set of technical illustrations (generator sets for each build type, control panel, part icons) used
**until real photography is uploaded**. Manufacturer logos are rendered as typographic wordmarks — no third-party
trademarks are shipped; upload logos in the admin.

## Admin panel

`/admin` (separate design, lazy-loaded chunk, `noindex`). Modules: dashboard (counts, drafts, recent items, demo
tools), manufacturers, generators, spare parts, categories, media library, website content, settings, inquiries,
account.

- **Generators**: manufacturer/category, per-language text, image gallery with reorder + alt text, price (fixed /
  on request / hidden), availability, featured, draft/published, SEO, filter attributes, **dynamic specification
  editor** (groups and fields added from presets or custom, per-language labels, reorder; empty values are never shown
  publicly) and the **compatible-parts picker**.
- **Parts**: OEM code, manufacturer, category, specs, and the **compatible-generators picker**.
- **Reordering**: manufacturers and categories by drag-and-drop or buttons.
- **Unsaved changes**: the app runs on a React Router *data router* (`createBrowserRouter`, single splat route → the existing `<Routes>`), so a
  `useBlocker` guard protects every dirty form on links, programmatic navigation and the browser **Back / Forward** buttons; `beforeunload`
  covers tab close / refresh; logout asks too. No prompt when nothing changed; saving, deleting and "Geri" reset or respect the dirty state.
- **Lost-update protection**: saving a record on top of a copy that someone else changed (another tab/admin) is refused with a clear message
  (`ConflictError`) instead of silently overwriting it. Demo store: exact; Supabase: best-effort compare of `updated_at` (not atomic).
- **Hero facts** (the strip under the home hero: "20–16000 kVA", "24/7", "5 il" by default) are edited in *Sayt məzmunu* (value + label per
  language, up to 4, reorder/remove). Empty value ⇒ item hidden; empty label ⇒ value only; no items ⇒ strip hidden; content saved before the
  feature existed falls back to the defaults. Defaults are the brand book's own statements — nothing is added.
- **Safety**: validation with inline errors, confirm dialogs, "in use" protection (a manufacturer/category that still
  has products cannot be deleted), unsaved-changes warning, toasts.
- **Account**: change password, sign out (and "sign out other sessions" in Supabase).
- The admin UI is in Azerbaijani; *content* is editable in AZ/RU/EN with a completeness indicator per field.

**Security model (production):** the route guard is UX only. Real protection is server-side: RLS policies require the
caller to be in `admin_users` for any write or any read of drafts/inquiries; anonymous visitors can read published rows
and insert a validated inquiry, nothing else. This was tested against PostgreSQL 16 (see QA).

## Languages & URLs

Azerbaijani is the default and lives at the root; Russian and English are prefixed. Fixed path segments are translated,
slugs are language-neutral:

| | AZ | RU | EN |
| --- | --- | --- | --- |
| Catalogue | `/generatorlar` | `/ru/generatory` | `/en/generators` |
| Product | `/generatorlar/<slug>` | `/ru/generatory/<slug>` | `/en/generators/<slug>` |
| Category | `/generatorlar/kateqoriya/<slug>` | `/ru/generatory/kategoriya/<slug>` | `/en/generators/category/<slug>` |
| Brands / parts | `/brendler`, `/ehtiyat-hisseleri` | `/ru/brendy`, `/ru/zapchasti` | `/en/brands`, `/en/spare-parts` |

All UI strings are in `src/i18n/{az,ru,en}.ts` (a test enforces identical keys and placeholders). Product,
manufacturer, category, content, FAQ and settings text are stored per language.
**Incomplete translations are never presented as complete:** a RU/EN page missing its own text shows a visible
"not translated yet" notice with the Azerbaijani text, its `<link rel="canonical">` points at a language that really has
the content, `hreflang` lists only real translations, and the sitemap omits that language. (A few demo products leave
Russian text empty on purpose to exercise this.) Languages can be switched on/off in Admin → Settings.

## WhatsApp inquiries & analytics

Every product (cards, detail pages, parts) has a WhatsApp button that opens `https://wa.me/<number>?text=<encoded>`
with the agreed message (AZ wording exactly as specified; RU/EN translations in `src/lib/whatsapp.ts`). A global floating
button and a sticky mobile bar on product pages (the floating button is hidden there so they never overlap).

- The number comes **only** from Admin → Settings (digits, international format). No number is hardcoded. **If it is not set, the
  buttons do not open a broken link**: they open a dialog explaining that WhatsApp is not connected yet, send the visitor to the
  contact form pre-filled with the product and message (and offer "copy message"), and tell the site owner where to configure it.
  The admin dashboard shows a warning while the number is missing. Contact-page/footer WhatsApp links are hidden until it is set.
- A general inquiry form (name, phone, product, message) is available on the contact page; WhatsApp remains primary.
  Inquiries land in Admin → Sorğular (honeypot + schema/DB constraints; add a CAPTCHA/rate limit if spam appears).
- Clicks fire `whatsapp_inquiry_click` (and `inquiry_form_submit`) through `src/lib/analytics.ts` **if** GA4 `gtag`,
  GTM `dataLayer` or Plausible is present on the page. No analytics script is bundled; to add one, load it and extend the
  CSP in `netlify.toml` (`script-src`, `connect-src`).

## SEO

**Rendering strategy: build-time prerendering (SSG) on top of the Vite SPA.** `npm run build` runs
`tsc → vite build → vite build --ssr (src/entry-server.tsx) → scripts/prerender.ts`. The prerender step renders the real React app
(`react-dom/static`) for **every** important public URL in **every enabled language** — home, catalogue, brands, parts, services,
about, contact, FAQ and every published manufacturer, generator category, generator and spare part — and writes
`dist/<path>/index.html` with the complete page *and* its head. Crawlers therefore receive full content and metadata in the first
HTTP response, without executing JavaScript.

Per page: unique `<title>`, meta description, canonical, `hreflang` (+ `x-default`) limited to languages that really have the
content, Open Graph/Twitter tags (raster `og:image` only), JSON-LD (`Organization`, `BreadcrumbList`, `Product` with `offers` only for
real fixed prices of non-demo items, `FAQPage`), exactly one `<h1>`, alt text, clean slugs. The same head model drives the browser
(`src/lib/head.ts`), so client navigation keeps the tags in sync.

- **Data source:** Supabase (published, non-demo rows) when the variables are present at build time; otherwise the demo dataset
  (pages are `noindex`). If Supabase is configured but unreachable the **build fails** — a bad deploy never replaces a good one.
- **Hydration:** in production the page hydrates the prerendered HTML using a build-time snapshot (`/_snapshot.json`), so there is no
  flash; fresh data is then fetched from Supabase in the background. Links with a query string (shared filters/search) render
  client-side from the snapshot instead of hydrating non-matching HTML.
- **Routing (`dist/_redirects`, generated from the route table):** real files first; `/admin`, client-only `/search` and slugs
  published after the last build are rewritten (200) to `/shell.html`; **everything else returns `404.html` with a real HTTP 404.**
  There is no catch-all `/* → /index.html`.
- **Freshness:** content published after a build is added to the static snapshot on the next build (Supabase webhook → Netlify build
  hook, see Production setup). `/sitemap.xml` is a Netlify function reading published, non-demo rows live.
- `robots.txt` disallows `/admin` and points to the sitemap; `/admin/*` is served with `X-Robots-Tag: noindex`.
- Prerendered demo pages carry `<meta name="robots" content="noindex">` and are excluded from the sitemap.
- Number/price formatting is deliberately engine-independent (no `Intl`), because Node's and the browser's CLDR data differ and
  would break hydration (found and fixed during the audit).

Performance: route-level code splitting (admin and the demo store are separate chunks), explicit image dimensions, `loading=lazy`,
`srcset` from thumbnail + full renditions, uploads converted client-side to WebP (1600 px + 480 px), self-hosted variable fonts,
no third-party requests, `scripting: enabled`-gated reveal animations (no hidden content without JS).

## Design system & brand book

Source of truth: *Zamanlı Makina Brand Book v1.0 (Dark Cyber-Industrial)*.

- **Colour** — Carbon `#0B0E13` (dark sections: hero, "why us", CTA, footer), Industrial Amber `#F4B400`
  (CTAs, rules, highlights — never body text on white), Steel `#4A5568`, Voltage Orange `#FF6B00` reserved for 24/7/urgent
  accents. The public site is light-first (white / `#F4F5F7`, graphite text) per the brief; tokens are in `src/styles/base.css`.
- **Typography** — the brand book names Rajdhani/Orbitron/Arial Black for display and Segoe UI/Inter for text. Rajdhani has no
  Azerbaijani **ə** and no Cyrillic, so headings use **Inter Tight** and body **Inter** (full AZ + RU coverage); Rajdhani is used
  only for numerals/units (kVA figures, OEM codes).
- **Logo** — the master mark must never be shown below 110 px wide, so the header uses the brand book's typographic wordmark
  and the official mark appears at ≥ 112 px (footer, about). The mark itself is never altered.
- Hierarchy, whitespace and restraint: hairline borders, 6 px radii, no decorative gradients (one soft amber glow behind the hero
  product), motion limited to subtle reveals/hover and disabled under `prefers-reduced-motion`.

## Project structure

```
src/
  data/            types, zod schema, Store interface, DemoStore (IndexedDB), SupabaseStore, queries (filter/search), DataContext
  demo/dataset.ts  repeatable demo seed
  i18n/            az / ru / en dictionaries + provider
  lib/             routes (localized URLs), head/SEO, JSON-LD, sitemap, WhatsApp, analytics, image processing, slug, ids
  components/      layout (header, footer, floating WhatsApp), catalogue (cards, filters, gallery, spec table), ui
  pages/           public pages (home, catalogue, brands, detail, parts, company, search, 404)
  admin/           admin panel (lazy chunk) + its tests
  styles/          tokens/base, layout, catalogue, pages
src/entry-server.tsx           server entry used only by the prerender step
netlify/functions/sitemap.ts   dynamic sitemap
supabase/                      migrations (schema, RLS, storage), first-admin.sql, tests/ (SQL security assertions)
scripts/                       prerender.ts (SSG + 404 + _redirects), demo.ts, test-sql.ts, serve-dist.ts, fake-supabase.ts, generate-demo-art.ts
public/demo/                   generated placeholder artwork
```

## Scripts, tests & QA

```bash
npm run dev | build | preview
npm run typecheck      # tsc -b
npm run lint           # oxlint (the TypeScript 7 toolchain is not compatible with typescript-eslint)
npm test               # vitest: unit, component, page, hydration, HTTP (needs a prior `npm run build` for the dist-based tests)
npm run test:sql       # Docker: migrations + RLS/storage security assertions on a throwaway PostgreSQL 16
npm run serve:dist     # serve ./dist with Netlify-like semantics (files → _redirects → 404.html)
npm run fake:supabase  # local PostgREST look-alike to exercise the Supabase code path end-to-end
npm run demo:art       # regenerate placeholder artwork
ALLOW_DEMO_TOOLS=true npm run demo:install -- --yes --confirm-host=<host>   # Supabase staging, service-role key in .env
npm run demo:remove  -- --dry-run                                           # preview; add --yes --confirm-host=<host> to apply
```

What the automated tests cover: localized routes; WhatsApp links/templates incl. Azerbaijani letters and URL encoding; slug/ids/text
fallback; engine-independent price formatting; dictionary parity; catalogue search/filter/sort/compatibility; demo-dataset integrity;
validation (incl. `javascript:` URL rejection); the demo store (seed, auth, CRUD, referential checks, compatibility, demo removal,
**atomic multi-tab writes, quota/blocked-storage behaviour**); the Supabase store against a fake client (error mapping, parity with the
demo store); mode selection (demo can't reach production); sitemap builder + function; page rendering and the full customer journey
(home → manufacturer → generator → specs → compatible part → WhatsApp), edge cases (no images / no specs / no parts / drafts / empty
results / price modes / XSS strings); **prerender → hydrate with zero mismatches**; **prerendered output over real HTTP** (status codes,
head tags, JSON-LD, unique titles, 404 behaviour, shell fallbacks, no secrets in the bundle); every admin module; and in SQL: anonymous,
signed-in-non-admin and admin roles, FK/CHECK constraints, storage bucket policy.

Manual browser QA is described in the audit report delivered with this work.

## Assumptions, limits & things to verify

- **Not run against a live Supabase project** (no credentials). What *was* verified: SQL, RLS and storage policies on real PostgreSQL 16
  (`npm run test:sql`); the browser Supabase client against a PostgREST look-alike (public reads, prerender, hydration, sitemap);
  store logic against a fake client. **Not verified:** Supabase Auth (sign-in, password change, "sign out other sessions"),
  Storage uploads through the real service, the `demo:install` upsert path, and the admin panel running in Supabase mode.
  Do a smoke test right after the first deploy (login, create a product, upload an image, edit settings).
- **No photography was available.** Placeholder technical illustrations stand in for product photos and the hero. No stock/AI imagery.
- **Facts taken from the brand book** and used as default copy — please confirm: 20–16000 kVA range, sales/rental/24-7 service,
  "5 il rəsmi zəmanət", address (Bakı ş., Binəqədi r., Biləcəri qəs., 1 May küç.), Tap.az link. The brand-book phone number is
  incomplete (`(050) 241-22-[XX]`), so **no phone/WhatsApp number is set**.
- Admin UI is Azerbaijani only (content is trilingual). The public catalogue is fetched once per session and filtered client-side
  (fine for thousands of rows; add server-side pagination beyond that).
- The inquiry form has a honeypot but no CAPTCHA / rate limit; add one if spam appears. The database forces `status`, `is_demo` and
  timestamps on visitor inquiries and caps field sizes, but anyone can still submit many.
- `VITE_SUPABASE_ANON_KEY` must be the public key: the build **fails** if it decodes to a `service_role` JWT or starts with `sb_secret_`.
- Supabase password rules / MFA / session lifetime are configured in the Supabase dashboard (Authentication), not in this repo — enable
  strong password requirements and MFA for admins. Sessions persist in the browser until sign-out.
- Known admin limitations: "purge unused media" decides from the lists loaded in that tab; the Supabase conflict check (`updated_at`) is best-effort, not an atomic
  compare-and-swap; in Supabase mode *install demo data* is disabled unless `VITE_ALLOW_DEMO_TOOLS=true` (staging only; production builds refuse it), while *remove demo data*
  stays available (typed confirmation, demo-flag **and** dataset-id only) — remove demo data before launch, because the live client would otherwise show it.
- `Content-Security-Policy` is strict (`script-src 'self'`); analytics scripts need CSP additions.
- Supabase Auth: disable public sign-ups (only users in `admin_users` can write anyway, but there is no reason to allow strangers to register).
