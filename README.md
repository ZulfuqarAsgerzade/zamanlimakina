# Zamanlı Makina — Coming Soon

Vite + React + TypeScript, sadə CSS (əlavə UI kitabxanası yoxdur).

```bash
npm install
npm run dev      # lokal inkişaf
npm run build    # istehsal build-i → dist/
npm run preview  # build-in lokal yoxlanışı
```

## Əlavə etməli olduqlarınız

Hamısı [src/config/site.ts](src/config/site.ts) və `public/` qovluğundadır:

| Nə | Harada |
| --- | --- |
| **Rəsmi loqo** | `public/brand/logo.png` (artıq əlavə olunub; `site.ts` → `logo.src`). Fayl yüklənməzsə müvəqqəti mətn loqosu göstərilir. |
| **Əlaqə məlumatları** | `site.ts` → `contact` (telefon, e-poçt, WhatsApp, Instagram, ünvan). Boş sahələr saytda avtomatik gizlənir. |
| **Hero CTA hədəfi** | `contact.primaryCtaHref` (boşdursa əlaqə bölməsinə sürüşür). |
| **Real fotoşəkil** | `public/images/` altına qoyun və `site.ts` → `images.hero` / `images.about` yolunu yazın. Boşdursa vektor generator illüstrasiyası göstərilir. |
| **İstehsal domeni** | `site.ts` → `brand.url` = `https://zamanlimakina.az` (təyin olunub; bax: aşağıda «SEO və istehsal»). |
| **Open Graph şəkli** | `public/og-image.png` (1200×630, hazırdır). Dizayn dəyişərsə eyni ölçüdə PNG ilə əvəz edin. |

## Struktur

```
src/
  config/site.ts       ← brend, loqo, şəkillər, əlaqə məlumatları
  config/contact.ts    ← konfiqdən kliklənən əlaqə elementləri
  components/          ← Navbar, Hero, Marquee, About, Expect, Announcement, Contact, Footer, Logo, GeneratorVisual
  hooks/               ← useReveal (scroll animasiyası), useScrollSpy
  styles/global.css    ← rənglər, tipoqrafiya, düymələr, ortaq stil
```

## SEO və istehsal

**Domen.** Rəsmi domen `src/config/site.ts` → `brand.url`-dədir (`https://zamanlimakina.az`). Başqa ünvanla (məs. staging) build etmək üçün əmr sətrində əvəz edin:

```bash
SITE_URL=https://staging.zamanlimakina.az npm run build     # bax: .env.example
```

Domen olduqda (indi var) `dist/`-ə əlavə olunur: `<link rel="canonical">`, `og:url`, mütləq `og:image` / `twitter:image` (1200×630 PNG), JSON-LD-də `url` və `logo`, `sitemap.xml` və `robots.txt`-də `Sitemap:` sətri.
Domen boş olarsa build xəbərdarlıq çıxarır, qalan hər şey (title, description, OG/Twitter mətnləri, favicon, JSON-LD adı, `robots.txt`) yenə yaradılır.

**Axtarış robotları üçün HTML.** `npm run build` səhifəni əvvəlcədən HTML-ə çevirir (`scripts/prerender.mjs`); brauzer onu «hydrate» edir. JavaScript işləməyən robotlar da başlıqları, mətni və linkləri görür.

**Strukturlaşdırılmış data.** `Organization` JSON-LD avtomatik yaranır; telefon, e-poçt, Instagram və ünvan `src/config/site.ts`-də doldurulduqda özü əlavə olunur.

**404.** `public/404.html` (noindex) hazırdır. Host adətən onu yalnız mövcud olmayan ünvanlar üçün 404 status ilə göstərir; hostda «bütün yolları index.html-ə yönləndir» (SPA fallback) qaydasını **söndürün** — bu saytda marşrutlar yoxdur.

**Təhlükəsizlik başlıqları (hostda təyin olunmalıdır).** Sayt heç bir üçüncü tərəf resursu yükləmir. Aşağıdakı başlıqlar real Chrome-da yoxlanılıb (CSP pozuntusu yoxdur):

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-k8ZoqoS/qHVRhkcvg0oiWri9mxhXHtdBYt1phVUaxW8='; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Strict-Transport-Security: max-age=31536000; includeSubDomains     (yalnız HTTPS qurulduqdan sonra)
```

`script-src` hash-i `index.html`-dəki kiçik inline skriptə (`html.js` sinfi) aiddir; həmin skripti dəyişsəniz hash-i yenidən hesablayın.
Saytı domenin kökündən başqa alt-qovluqda yerləşdirəcəksinizsə `vite.config.ts`-də `base` təyin edin (indi `/`).
