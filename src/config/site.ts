/**
 * ───────────────────────────────────────────────────────────────
 *  ZAMANLI MAKİNA — mərkəzləşdirilmiş sayt konfiqurasiyası
 *  Real əlaqə məlumatlarını və şəkilləri YALNIZ bu fayldan dəyişin.
 *  Boş ("") saxlanılan sahələr saytda avtomatik gizlədilir.
 * ───────────────────────────────────────────────────────────────
 */

export const siteConfig = {
  brand: {
    name: 'Zamanlı Makina',
    /**
     * Rəsmi istehsal domeni (yalnız https, yol olmadan). Canonical, Open Graph, sitemap.xml,
     * robots.txt və JSON-LD bu dəyərdən yaranır. Build zamanı `SITE_URL` mühit dəyişəni
     * ilə əvəz edilə bilər (məs. test/staging build-i üçün).
     */
    url: 'https://zamanlimakina.az',
    nameUpper: 'ZAMANLI MAKİNA',
    footerDescription:
      'Etibarlı enerji həlləri və güclü performans. Generator həlləri sahəsində peşəkar yanaşma.',
  },

  /**
   * Rəsmi loqo faylı.
   * Loqo `public/brand/logo.png` faylıdır (kvadrat işarə).
   * Fayl yüklənməzsə, müvəqqəti mətn loqosu göstərilir.
   */
  logo: {
    src: '/brand/logo.png',
    alt: 'Zamanlı Makina loqosu',
  },

  /**
   * İstəyə bağlı peşəkar fotoşəkillər (məs. `/images/hero-generator.jpg`).
   * Boş saxlansa, saytdakı generator illüstrasiyası göstərilir.
   */
  images: {
    hero: '',
    about: '',
  },

  /**
   * Əlaqə məlumatları — hamısı istəyə bağlıdır.
   *  phone      : "+994 50 000 00 00"
   *  email      : e-poçt ünvanı
   *  whatsapp   : nömrə ("+994500000000") və ya tam wa.me linki
   *  instagram  : istifadəçi adı ("zamanlimakina") və ya tam profil linki
   *  location   : ünvan mətni
   *  mapsUrl    : (istəyə bağlı) xəritə linki — ünvan kartını kliklənən edir
   */
  contact: {
    phone: '',
    email: '',
    whatsapp: '',
    instagram: '',
    location: '',
    mapsUrl: '',
    /**
     * Hero-dakı əsas "Bizimlə əlaqə saxlayın" düyməsinin hədəfi.
     * Boş olsa, səhifədəki əlaqə bölməsinə sürüşür.
     * Məs: tam "https://wa.me/<nömrə>" linki və ya "mailto:<e-poçt>"
     */
    primaryCtaHref: '',
  },
} as const

export type ContactConfig = typeof siteConfig.contact
