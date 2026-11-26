# Zamanlı Makina — Project Handover

> Written 2026-11-20 for a new Claude account/session that continues this project.
> Every statement was checked against the code, the git state, or a command run on that date.
> Legend: **[VERIFIED]** = confirmed by code, a test, or a command run while writing this file ·
> **[REPORTED]** = stated in the README or earlier work and consistent with the code, but not re-run today ·
> **[NOT VERIFIED]** = never tested or unknown · **[DECISION]** = a user requirement to preserve.
> No secrets are in this file. Variable *names* only.

---

## 0. Read this first (60-second summary)

- Project folder: `~/Desktop/ZamanliMakina` (git repo, branch `main`).
  **Open Claude Code in this folder.** The earlier sessions were started from a different, empty sibling folder
  (`~/Desktop/ZamanliMakinaMain`); the real project is `ZamanliMakina`. **[VERIFIED]**
- On 2026-11-26 the user asked to replace everything in the GitHub repo with this project: the old "coming soon" code **and its history were deleted**
  and this project was force-pushed as a single root commit on `main` (see §14). Work after that commit is uncommitted until the user asks otherwise.
  Still: **never commit, push, deploy, reset or stash without the user's explicit approval.**
- The site runs today in **local demo mode** (no backend). **No Supabase environment is configured**: there is no `.env`
  or `.env.*` file except `.env.example`. **[VERIFIED]**
- The user is **currently doing a visual review** and has "1–2 minor visual adjustments" to ask for. **Do not redesign. Do not
  start database/Supabase work until the user says the stage has come.** **[DECISION]**
- Latest checks (2026-11-20): `typecheck`, `lint`, `build`, `test` (31 files / 247 tests), `test:sql` — all exit code 0. **[VERIFIED]**

---

## 1. Project overview

**Business purpose.** Zamanlı Makina (Baku, Azerbaijan) sells and services diesel/gas generators and supplies spare parts.
The site turns a former single-page "coming soon" page into a premium, light-first industrial catalogue:
Manufacturer → Generator → technical specifications → compatible spare parts, with a spare-parts catalogue,
WhatsApp-first inquiries, a full admin panel, and three languages (AZ default, RU, EN). **[VERIFIED from code/README]**

**Stack.** **[VERIFIED: package.json, tsconfig.json, vite.config.ts]**

| Layer | Choice |
| --- | --- |
| Build / dev | Vite 8, TypeScript 7 (`strict`, `erasableSyntaxOnly`), oxlint (no ESLint) |
| UI | React 19, react-router 8 (data router in the browser, `StaticRouter` for prerender) |
| Validation | zod 4 (same schema for both data backends) |
| Backend (production, **not connected**) | Supabase: Postgres + RLS, Auth, Storage (`@supabase/supabase-js`) |
| Backend (today) | Browser-local "DemoStore" in IndexedDB — no network |
| Hosting | Netlify (static prerender + one function), config in `netlify.toml` |
| Fonts (self-hosted) | Inter Variable (body), Inter Tight Variable (headings), Rajdhani 600/700 latin (numerals/units only) |
| Tests | Vitest 5 + jsdom + Testing Library + fake-indexeddb; SQL tests on PostgreSQL 16 in Docker |

**Architecture in one picture.** **[VERIFIED: src/data/index.ts, store.ts]**

```
React UI ─► Store interface (src/data/store.ts) ─┬─► DemoStore     (IndexedDB)            used when Supabase vars are absent
                                                 └─► SupabaseStore (Postgres/Auth/Storage) used when BOTH VITE_SUPABASE_URL
                                                                                           and VITE_SUPABASE_ANON_KEY are set
```
The backend is chosen **at build time** (`resolveMode()`); `VITE_DATA_MODE=demo` forces demo mode even if Supabase vars exist.
SEO uses **build-time prerendering (SSG)**: `npm run build` = `tsc -b` → `vite build` → `vite build --ssr src/entry-server.tsx`
→ `scripts/prerender.ts` (writes one HTML file per public URL per language, `404.html`, `shell.html`, `_redirects`, `_snapshot.json`).
Latest build: "data source: demo … wrote 177 pages + 404.html + shell.html + _redirects (az, ru, en)". **[VERIFIED]**

---

## 2. Project structure (important paths)

```
HANDOVER.md                 this file
README.md                   long, accurate user/dev documentation (read it)
package.json / tsconfig.json / vite.config.ts / vitest.config.ts
netlify.toml                build, headers, CSP, caching, functions dir
.env.example                the ONLY env file in the repo (names, no values)
index.html, public/         favicon, og-image.png, brand/logo.png, demo/ (20 generated SVG placeholder artworks)
src/
  main.tsx, App.tsx, entry-server.tsx
  data/       types, schema (zod), Store interface, demoStore.ts, supabaseStore.ts, supabaseMap.ts,
              supabaseDemo.ts (demo install/remove on Postgres), demoPolicy.ts, queries.ts, defaults.ts, DataContext.tsx
  demo/dataset.ts           deterministic demo dataset + demoIdSets() (the allow-list of demo ids)
  i18n/       az.ts, ru.ts, en.ts (+ test that keys/placeholders are identical)
  lib/        routes.ts (localized URLs), head.ts/useSeo.ts, jsonld.ts, sitemap.ts, whatsapp.ts, analytics.ts,
              image.ts (client-side WebP processing), slug.ts, ids.ts, heroFacts.ts, format.ts, safeUrl.ts
  components/ layout/ (Header, Footer, FloatingWhatsApp, LanguageSwitcher, SiteLayout, Logo),
              catalogue/ (cards, filters, Gallery, SpecTable, Browsers), ui/ (Icons, Picture, States, WhatsAppButton…)
  pages/      Home, Generators, GeneratorDetail, Brands, Parts, Company (about/services/contact/faq), Search, NotFound
  admin/      AdminApp.tsx, ui.tsx, form.tsx (versioned saves), editors.tsx, ctx.tsx, pages/*.tsx, admin.css, __tests__
  styles/     base.css (tokens), layout.css, catalogue.css, pages.css
netlify/functions/sitemap.ts   dynamic /sitemap.xml
scripts/      prerender.ts, demo.ts (CLI), test-sql.ts, serve-dist.ts, fake-supabase.ts, generate-demo-art.ts, lib/*
supabase/     migrations/ (2 files), first-admin.sql, tests/ (rls.test.sql, stub.sql)
```
`dist/`, `dist-ssr/`, `node_modules/`, `.env*` (except the example), `.claude/` and `*.local` are git-ignored. **[VERIFIED: .gitignore]**

---

## 3. What is implemented and works today

**[VERIFIED]** means a test or command covers it; the in-browser smoke checks below were done in local demo mode only.

- Public catalogue, prerendering, 3 languages, SEO head/JSON-LD, WhatsApp flow, search, 404 — covered by `src/pages/__tests__`,
  `src/lib/__tests__`, `scripts/prerender.http.test.ts` (real HTTP responses incl. 404 status) and the build above.
- Admin panel with real CRUD in demo mode — covered by 11 admin test files; opened in a real browser pane in this and earlier sessions
  (login creation, media alt-text guard, demo-removal dialog).
- Unsaved-changes protection on every form and on the media alt-text dialog (Save, Cancel, ✕, Esc, backdrop, browser Back via
  `useBlocker`, `beforeunload`) — `unsaved-guard.test.tsx`, `media-alt-guard.test.tsx`; Back-button blocking also seen in a real browser. 
- Versioned saves (edits typed during an in-flight save are kept and stay "dirty"; double submit ignored) for manufacturers, generators,
  parts, categories, settings, content — `save-versioning.test.tsx` (18 tests). The race itself cannot be slowed in a real browser, so it
  is verified deterministically in jsdom only.
- Demo-tool protections (see §7) — `supabaseDemo.test.ts`, `demo-tools.test.tsx`, `scripts/lib/demoCli.test.ts`, SQL assertions.
- Hero facts strip editable in admin (AZ/RU/EN, max 4, fallbacks to brand-book defaults: "20–16000 kVA", "24/7", "5 il" warranty). **[VERIFIED: defaults.ts, heroFacts tests]**

## 4. Public site: routes, languages, catalogue

**[VERIFIED: src/lib/routes.ts, src/App.tsx]** AZ lives at the root; RU under `/ru`, EN under `/en`. Fixed segments are translated, slugs are language-neutral.

| Page | AZ | RU | EN |
| --- | --- | --- | --- |
| Home | `/` | `/ru` | `/en` |
| Generators | `/generatorlar` | `/ru/generatory` | `/en/generators` |
| Generator detail | `/generatorlar/:slug` | `/ru/generatory/:slug` | `/en/generators/:slug` |
| Generator category | `/generatorlar/kateqoriya/:slug` | `/ru/generatory/kategoriya/:slug` | `/en/generators/category/:slug` |
| Brands (manufacturers) | `/brendler` | `/ru/brendy` | `/en/brands` |
| Brand detail | `/brendler/:slug` | `/ru/brendy/:slug` | `/en/brands/:slug` |
| Spare parts | `/ehtiyat-hisseleri` | `/ru/zapchasti` | `/en/spare-parts` |
| Spare part detail | `/ehtiyat-hisseleri/:slug` | `/ru/zapchasti/:slug` | `/en/spare-parts/:slug` |
| Services | `/xidmetler` | `/ru/uslugi` | `/en/services` |
| About | `/sirket-haqqinda` | `/ru/o-kompanii` | `/en/about` |
| Contact | `/elaqe` | `/ru/kontakty` | `/en/contact` |
| FAQ | `/tez-tez-verilen-suallar` | `/ru/voprosy-i-otvety` | `/en/faq` |
| Search (client-only) | `/axtaris` | `/ru/poisk` | `/en/search` |
| Admin | `/admin` (not localized) | | |

Languages can be enabled/disabled in Admin → Settings. A RU/EN page whose own text is missing shows a visible "not translated yet" notice,
and its canonical/hreflang/sitemap entries only list languages that really have the content (README; i18n + sitemap tests). **[REPORTED + tests]**

**Data model & relationships.** `Manufacturer 1─* Generator`; `Category(kind: generator|part) 1─* Generator/Part`;
`Generator *─* Part` through `part_compatibility` (editable from either side); generators carry dynamic specification groups
(per-language labels; empty values never shown); parts have OEM code, manufacturer, category, specs; media library items are referenced
by generators/parts/manufacturers/settings/content. Two JSON documents: `settings` (WhatsApp number, phone, e-mail, address, hours,
social, SEO defaults, languages) and `content` (hero, hero facts, about, services, FAQ, contact intro, footer). Inquiries are a separate list.
Price types: `fixed | request | hidden`; availability: `in_stock | on_order | out_of_stock | coming_soon`; status: `published | draft`.
**[VERIFIED: types.ts, schema.ts, SQL migrations]**

**Demo dataset (counted by running `buildDemoDataset()` today):** 5 manufacturers (Perkins, Cummins, Baudouin, Volvo Penta, MTU), 13 categories
(5 generator, 8 part), 17 generators (16 published, 1 draft), 27 spare parts (26 published), 20 media items, 85 compatibility links.
Example: `/generatorlar/perkins-1104a-44tg2` has 7 compatible parts. **[VERIFIED]**

## 5. Admin panel

**[VERIFIED: src/admin/AdminApp.tsx + pages; tests]** Modules (UI language: Azerbaijani only; *content* editable in AZ/RU/EN):

| Section | Route | What it does |
| --- | --- | --- |
| Dashboard | `/admin` | counts, drafts, recent items, WhatsApp-not-set warning, demo tools card |
| Manufacturers | `/admin/manufacturers[/new\|/:id]` | CRUD, logo/cover, per-language description, SEO, drag/button reorder, "in use" delete protection |
| Generators | `/admin/generators…` | CRUD, manufacturer/category, galleries with alt text + reorder, price, availability, featured, draft/published, SEO, filter attributes, dynamic spec editor with presets, compatible-parts picker |
| Spare parts | `/admin/parts…` | CRUD, OEM code, manufacturer, category, specs, compatible-generators picker |
| Categories | `/admin/categories…` | CRUD for generator/part categories, reorder |
| Media library | `/admin/media` | upload (multi), replace file, delete, delete unused, alt text, "where used", search |
| Website content | `/admin/content` | hero, hero facts, about, services (icon keys), FAQ, contact intro, footer |
| Settings | `/admin/settings` | company, WhatsApp number, contact data, social links (http/https only), SEO defaults, languages |
| Inquiries | `/admin/inquiries` | list/status of contact-form submissions |
| Account | `/admin/account` | change password, sign out (+ "sign out other sessions" in Supabase mode) |

Cross-cutting: zod validation with inline errors, confirm dialogs, toasts, lost-update protection (`ConflictError`), error boundary,
`noindex` meta. Admin route guard is UX only; real protection in production is RLS (§7).

## 6. Demo mode

**[VERIFIED: src/data/demoStore.ts]**
- Used whenever `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are not both present. Performs **no network requests** (unit-tested).
- **Where data lives:** the visiting browser's IndexedDB database `zm-demo-store` (per browser profile + origin; `localhost:5173` is a different
  origin from `127.0.0.1:4180`). Not shared with other browsers/devices/visitors. Writes are atomic per transaction; other tabs of the
  same browser are notified via `BroadcastChannel`.
- **Admin "login":** the first visit to `/admin` asks to *create* a demo admin (e-mail + a password of the user's choice; PBKDF2-SHA-256,
  150 000 iterations, stored in IndexedDB). There are **no default credentials**. The signed-in session lives in `sessionStorage`
  (per tab) — a new tab/browser restart asks again. It gates the UI only; it is **not** a security boundary.
- **Seeding:** on first load the demo dataset is seeded (`flags.demoSeeded`). After "remove demo data" (`flags.demoRemoved`) it is not re-seeded.
- **Fallback:** if IndexedDB is blocked (private window) the app works in memory and the admin warns that changes are lost on reload.
- **Visible markers:** yellow "Demo" banner, "Demo" badges, demo product pages `noindex` and excluded from the sitemap; a build in demo mode is refused in Netlify's *production* context (§8).
- **Limitations:** images are generated SVG placeholders; prices are demo values; uploads are stored as data URLs in IndexedDB (browser quota applies); data disappears if the user clears site data (the demo set is then re-seeded, admin account and edits are gone).

**How to avoid deleting demo data by accident** **[DECISION + VERIFIED]**
1. Do **not** click *Demo məlumatı sil* (Admin → Dashboard). In local demo mode it removes every record that is flagged demo **and** has a dataset id,
   with an ordinary confirmation dialog (no typing required).
2. Do **not** click *Demo məlumatı yüklə* either unless intended: it re-writes demo records back to their original values (edits to demo records are lost).
3. Do **not** clear site data for `localhost:5173` or use a private window for work you want to keep.
4. Editing a demo record is fine — it stays a demo record (same id/flag). Deleting individual records in the admin is permanent.
5. Never run `npm run demo:remove` against anything real. (It only works with Supabase env + service-role key, `--yes` and `--confirm-host`; it is a no-op without them.)

## 7. Database / Supabase status

**Status: implemented and locally tested; NEVER connected to a real Supabase project.** No Supabase environment is configured today:
there is no `.env`/`.env.*` file (only `.env.example`). **[VERIFIED 2026-11-20]** The user explicitly said: stop Supabase work for now; visual review first. **[DECISION]**

**Implemented [VERIFIED by code + `npm run test:sql` + fake clients]**
- `supabase/migrations/20260101000000_schema.sql`: extension `pgcrypto`; tables `admin_users`, `manufacturers`, `categories`, `generators`, `parts`,
  `part_compatibility`, `media`, `inquiries`, `site_settings`; functions `is_admin()` (security definer), `touch_updated_at()` + `updated_at` triggers;
  CHECK constraints (slug format, name lengths, enums, price types, "published generator needs manufacturer and kVA", phone/message limits); FKs; indexes; an
  `is_demo` flag on content tables. Plain `create table` — **not idempotent: use only on a fresh, empty project.**
- `supabase/migrations/20260101000100_rls_and_storage.sql`: RLS on every table; public (anon) can read **published** rows and `site_settings`, and insert an inquiry
  (a trigger forces `status='new'`, `is_demo=false`, timestamps); everything else requires membership in `admin_users`; admins cannot be added through the API;
  `revoke all … from anon, authenticated` then explicit grants; storage bucket `media` (public read by URL, no listing policy, 5 242 880-byte limit, MIME
  webp/jpeg/png/avif only — no SVG/HTML) with admin-only insert/update/delete/select policies. **Note:** it revokes privileges on all tables/functions in schema `public`,
  so use a dedicated project.
- `supabase/first-admin.sql`: after creating a user in Authentication → Users, run it (edit the e-mail) to insert that user into `admin_users`; must report `INSERT 0 1`.
- `SupabaseStore` (`src/data/supabaseStore.ts`): admin check tri-state (yes/no/unknown), best-effort `updated_at` conflict check, storage upload/replace/delete, local-scope sign-out,
  demo tools gated (below). Prerender/sitemap/hydration read published, non-demo rows with the anon key.
- Tests: `npm run test:sql` starts a throwaway `postgres:16-alpine` Docker container, loads `supabase/tests/stub.sql` (a **stand-in** for Supabase's `auth`/`storage` schemas and roles) and
  runs `rls.test.sql` assertions (anon/non-admin/admin behaviour, no privilege escalation, bucket config, demo rows get no special privileges).

**NOT verified (never run against real Supabase):** Supabase Auth (sign-in, wrong password, session persistence, password change, sign-out-others), the
`auth.uid()`/JWT behaviour in the real service, Storage uploads/replacement/public URLs/5 MB bucket limit through the real service, `SupabaseStore` against a real
PostgREST, the admin panel in Supabase mode, concurrent edits against a real DB, public sign-up being disabled, hydration/prerender against a real project. The
client's upload cap is 15 MB (`MAX_UPLOAD_BYTES`) but files are re-encoded to WebP (≤1600 px + 480 px thumbnail) first, so the 5 MB bucket limit only matters for crafted uploads. **[VERIFIED: src/lib/image.ts]**

**Environment variables** **[VERIFIED: .env.example, vite.config.ts, scripts, netlify/functions]**

| Name | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | build, public | Project URL. With the anon key, switches the app to Supabase mode |
| `VITE_SUPABASE_ANON_KEY` | build, public | **Public** anon/publishable key only. The build fails if it decodes to a `service_role` JWT or starts with `sb_secret_` |
| `VITE_DATA_MODE` | build, optional | `demo` forces demo mode |
| `SITE_URL` / `VITE_SITE_URL` | build, optional | canonical origin (default `https://zamanlimakina.az`) |
| `ALLOW_DEMO_BUILD` | build, optional | `true` allows a *production-context* Netlify build without Supabase |
| `VITE_ALLOW_DEMO_TOOLS` | build, staging only | `true` enables demo **install** in the admin of a Supabase build; a production-context build (`CONTEXT=production`) refuses it |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Netlify runtime | used by the sitemap function (the `VITE_*` names also work) |
| `SUPABASE_SERVICE_ROLE_KEY` | local CLI only | only for `scripts/demo.ts`; **never** in the browser, never `VITE_`-prefixed, not needed for normal setup |
| `ALLOW_DEMO_TOOLS` | CLI only | must be `true` for `demo:install` to write |

**Credentials go in:** a git-ignored `.env.local` (or `.env`) on the developer machine for local runs, and Netlify → Site settings → Environment variables for deploys.
Never in source files, chat, screenshots or logs.

**Demo-tool protections [VERIFIED by tests]:** a record counts as demo only if `is_demo = true` **and** its id is in the dataset's id set (`demoIdSets()`); flagged-only rows are
"skipped" and kept; install refuses to overwrite a real row that uses a demo id and refuses a database that already has real records (CLI override `--allow-populated`);
Supabase-mode install is disabled (UI hidden + store refuses) unless `VITE_ALLOW_DEMO_TOOLS=true`; Supabase-mode removal requires typing `DEMO SİL`;
CLI needs `--yes` **and** `--confirm-host=<exact host>` (plus `ALLOW_DEMO_TOOLS=true` for install), and supports `--dry-run`.

**Safe future setup (only when the user says the database stage has started; ask before each step):**
1. Create a **dedicated staging** Supabase project (never reuse a project with other tables). Note project URL + anon/publishable key.
2. The *user* applies the two migrations in order in the SQL editor (or via the Supabase CLI themselves). Claude must not request database passwords/tokens in chat.
3. User creates the admin in Authentication → Users, edits and runs `supabase/first-admin.sql` (expects `INSERT 0 1`), and turns **off** "Allow new users to sign up". Create a second user (not an admin) for the unauthorized-access test.
4. User creates `.env.local` with the two `VITE_` values. Leave `VITE_ALLOW_DEMO_TOOLS` unset.
5. Claude starts the dev server, confirms Supabase mode, and checks sign-ups are off by reading the public `/auth/v1/settings` endpoint (read-only).
6. Browser tests (admin login, wrong password, reload persistence, CRUD, compatible parts, public pages show published only, upload/replace image, invalid types, two-tab conflict). **The user must type real passwords into the login form themselves.**
7. Never run demo removal against real staging content without explicit approval. Ask before any destructive step.

## 8. Netlify deployment status

- Config present and reviewed: `netlify.toml` (build `npm run build`, publish `dist`, `NODE_VERSION = "22"`, functions dir, immutable asset caching, `/admin` `noindex` + `no-store`, strict CSP
  allowing `https://*.supabase.co`, security headers). No catch-all SPA rewrite: real files → generated `_redirects` (`/admin`, `/search`, newly published slugs → `/shell.html`) → `404.html` with a real 404. **[VERIFIED]**
- **Nothing has been deployed by Claude. Whether a Netlify site is connected to the GitHub repo, and what is live on `zamanlimakina.az`, is [NOT VERIFIED]** (the last commit message is "Prepare Zamanlı Makina website for Netlify deployment", but that commit predates all of this work).
- **Known deployment issues / gotchas:**
  - A build in Netlify's *production* context **fails by design** without Supabase variables (so the demo cannot reach the live domain). Deploy previews/branch deploys may run in demo mode. Setting `ALLOW_DEMO_BUILD=true` overrides it deliberately.
  - Content published in Supabase appears in the static snapshot only after the next build; the README describes a Supabase Database Webhook → Netlify build hook (not configured). `/sitemap.xml` is a live function.
  - Without `SUPABASE_URL`/`SUPABASE_ANON_KEY`, the sitemap function lists only static pages.
  - `npm run serve:dist` emulates routing but **not** the `netlify.toml` headers, so the CSP/headers have only been verified by reading the file, not in a browser against Netlify.
  - The strict CSP (`script-src 'self'`) blocks analytics scripts until `netlify.toml` is extended. No analytics script is bundled.
  - The old coming-soon code no longer exists in the repo (history was wiped on the user's request, 2026-11-26). The push commit message contains `[skip netlify]` so Netlify should not have built it; if the site is connected to `main`, the next push will start a production-context build, which fails without Supabase variables (see above).

## 9. Tests, build, lint, typecheck (latest run: 2026-11-20, Node v26.13.0, npm 11.20.0) **[VERIFIED]**

| Command | What it does | Exit | Result |
| --- | --- | --- | --- |
| `npm run typecheck` | `tsc -b` | 0 | clean |
| `npm run lint` | `oxlint src scripts netlify` | 0 | no warnings |
| `npm run build` | tsc + client + SSR build + prerender | 0 | 177 pages + 404 + shell + `_redirects`, demo data source |
| `npm test` | `vitest run` (jsdom) | 0 | 31 files, 247 tests passed |
| `npm run test:sql` | Docker Postgres 16 RLS/storage assertions | 0 | "ALL SQL SECURITY ASSERTIONS PASSED" |

Notes: run `npm run build` before `npm test` (some page/HTTP tests read `dist/`, per the README). `test:sql` needs Docker running. Other scripts: `npm run serve:dist [port]` (default 4180),
`npm run fake:supabase` (PostgREST look-alike), `npm run demo:art` (regenerate placeholder SVGs), `npm run demo:install|demo:remove` (Supabase CLI, guarded).
Test areas: data layer (schema, DemoStore, Supabase store with fakes, demo policy), admin (auth, CRUD, save versioning, unsaved guards, media guard, demo tools), public pages/hydration/journey, i18n key parity,
routes/sitemap/WhatsApp/hero facts, prerender over real HTTP, sitemap function.

## 10. Known bugs, limitations, risks, missing items

- **Missing real content/assets [VERIFIED/REPORTED]:** no product photography (placeholder SVG illustrations everywhere, including the hero); no WhatsApp/phone number (the brand-book number is incomplete, so `settings.whatsapp` is empty and WhatsApp buttons open a "not configured" dialog); address, Tap.az link, "5 il rəsmi zəmanət", kVA range 20–16000 and "24/7" support are taken from the brand book and **need the owner's confirmation**; no real product data, prices or specs (all demo, clearly labelled); real logo is used only at ≥ 112 px (brand-book rule).
- **Supabase path unverified** (see §7) — the biggest risk before launch.
- Supabase conflict detection is best-effort (compares `updated_at`, not atomic). Demo store is exact.
- "Purge unused media" decides from the lists loaded in that tab.
- Admin UI is Azerbaijani only. Public catalogue is fetched once per session and filtered client-side (fine for thousands of rows; add server pagination beyond that).
- No CAPTCHA/rate limit on the inquiry form (honeypot + DB constraints only).
- Password policy/MFA/session lifetime must be configured in the Supabase dashboard; none of it is in the repo.
- Number/price formatting is intentionally hand-written (no `Intl`) because Node vs browser CLDR differences broke hydration (a bug found and fixed earlier). Do not "simplify" it back.
- Node strips TypeScript types only: no parameter properties, no enums/namespaces (`erasableSyntaxOnly`). Lint is oxlint, not ESLint.
- npm: `~/.npm` was root-owned on this machine; install/run npm with `--cache <writable dir>` (or `./.npm-cache`, git-ignored) if you see `EACCES`.
- The earlier mobile/five-width visual audits (1440/1280/820/390/320 px) and AZ/RU/EN reviews were done in previous sessions; they were **not re-run** while writing this handover. The user's own review is now in progress.
- Outstanding decisions for the user: which 1–2 visual adjustments; whether/when to commit the work; real WhatsApp/phone; real photography; confirmation of brand-book facts; Supabase staging stage timing; Netlify site/domain state; whether to use analytics (needs CSP change).

## 11. User requirements and decisions to preserve **[DECISION]**

- **Do not redesign the website; preserve the current visual identity/design.** The user has only **1–2 minor visual adjustments** to request after reviewing the current implementation. Make no visual change before they say what.
- **Do not start database/Supabase work until the appropriate stage** — the user said "STOP all Supabase and database-related work" and asked for the visual review first. Wait for their go-ahead.
- Work **step by step** and explain important decisions in simple language. Give recommendations rather than option dumps.
- **Never commit, push, deploy, reset, stash or discard** without the user's explicit approval. Keep all demo records; do not delete genuine data; never run demo removal against real data without explicit approval.
- Never put credentials in source, logs, screenshots or reports; never use or request a service-role key in the browser. Do not claim anything is tested against real Supabase unless it actually was.
- Brand: source of truth is the brand book PDF (`~/Downloads/Zamanli Makina — Brand Book (Dark Cyber-Industrial) (1).pdf` on the user's machine). Palette: Carbon `#0B0E13`, Industrial Amber `#F4B400`, Steel `#4A5568`, Voltage Orange `#FF6B00` (urgent/24-7 only); site is light-first with dark hero/CTA/footer. Headings Inter Tight, body Inter, numerals Rajdhani (Rajdhani lacks "ə" and Cyrillic).
- Security behaviour to keep: Claude does not type real passwords into login forms for real services; the user does.

## 12. Recommended next steps (priority order)

1. **First action of the next session:** read this file and README, run `git status` and `git branch --show-current` (expect `main` and a clean or near-clean tree) — do not alter anything. Run `npm run dev` (http://localhost:5173) if it is not already running.
2. **Ask the user for their visual feedback** (the 1–2 adjustments). Apply only those, minimally, with the existing tokens in `src/styles/*.css`; re-check at 320/390/820/1280/1440 px and in AZ/RU/EN; re-run typecheck, lint, test (+ build).
3. **Commit discipline:** the platform is in the single root commit on `main` (pushed 2026-11-26). Any later change is uncommitted until the user approves a commit; never push without approval.
4. Collect real inputs from the user: WhatsApp number/phone/e-mail/address, confirmed company facts, real photography, real manufacturers/products. Enter them through the admin (Settings, Content, Media) — not hard-coded.
5. When the user opens the database stage: follow §7 "Safe future setup" on a dedicated **staging** project; report with the real-vs-local distinction; then update README "Assumptions" and this file.
6. Netlify: create/confirm a site on a **staging/preview** context first with the two public env vars, verify headers/CSP in a real browser, test the build hook/webhook, then production configuration (no `VITE_ALLOW_DEMO_TOOLS`, no service-role key in Netlify).
7. Before launch: remove demo data deliberately (with approval), set the WhatsApp number, strong password policy + MFA for admins, consider CAPTCHA/rate limiting and analytics (CSP update).

## 13. Local development

- **Node:** `^20.19.0 || >=22.12.0` (`engines`); Netlify uses 22; checks here ran on v26.13.0. **[VERIFIED]**
- Install: `npm install` (use `--cache ./.npm-cache` if `~/.npm` is not writable). Start: `npm run dev` → **http://localhost:5173** (verified serving HTTP 200 and rendering today). Demo mode needs no env vars.
- First admin visit: http://localhost:5173/admin → create a demo admin (choose your own e-mail/password; nothing is shared).
- Production-like preview: `npm run build` then `npm run serve:dist` → http://127.0.0.1:4180 (Netlify-like routing, no headers).
- A dev server started in the previous session may still be running on port 5173 (`lsof -iTCP:5173 -sTCP:LISTEN`); reuse or stop it deliberately. Claude's browser-preview tool looks for `.claude/launch.json` in the *session's* folder; a launch config named `zamanli-dev` exists in this project (git-ignored). If the session folder is different, start Vite via Bash and open the URL in the browser pane.

## 14. Git state **[VERIFIED at push time, 2026-11-26]**

- Repository: `github.com/ZulfuqarAsgerzade/zamanlimakina` (remote `origin`). At the user's explicit request ("delete everything old, I don't need it; this project should be there")
  the previous history (one commit, `e19e7dc`, the old coming-soon page) was removed and this project was force-pushed as **one root commit on `main`**
  (`git push --force-with-lease`). Only `main` exists on the remote.
- Local branch: `main` only (the earlier `feature/catalogue-platform` branch was folded into it). A local safety bundle of the old history was written to the session scratchpad
  (temporary; may disappear) — the user said they do not need it.
- Not in git (git-ignored): `node_modules/`, `dist/`, `dist-ssr/`, `.env*` except `.env.example`, `*.local`, `.claude/`, `.netlify`, `tsconfig.tsbuildinfo`, `screenshots`.
- Any change made after the push is uncommitted. Check `git status` first and ask before committing or pushing again.
