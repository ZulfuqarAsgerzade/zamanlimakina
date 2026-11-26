import type { Locale } from '../data/types.ts'

export function cleanNumber(raw: string): string {
  return raw.replace(/\D/g, '')
}

/**
 * wa.me link with a properly encoded message. Returns null when no valid number is configured — callers must then show
 * the "WhatsApp not configured" experience (see components/ui/WhatsAppButton) instead of a broken link.
 */
export function buildWhatsAppUrl(number: string | undefined, message?: string): string | null {
  const n = cleanNumber(number ?? '')
  if (n.length < 9) return null
  return message ? `https://wa.me/${n}?text=${encodeURIComponent(message)}` : `https://wa.me/${n}`
}

export interface GeneratorInquiry {
  name: string
  model: string
  manufacturer: string
  url: string
}
export interface PartInquiry {
  name: string
  oem: string
  /** Compatible generator model(s) — may be empty. */
  compatible: string
  url: string
}

/** AZ templates follow the wording agreed with the client verbatim. */
export function generatorMessage(locale: Locale, i: GeneratorInquiry): string {
  if (locale === 'ru')
    return `Здравствуйте. Меня интересует генератор на сайте Zamanli Makina:\n\nТовар: ${i.name}\nМодель: ${i.model}\nПроизводитель: ${i.manufacturer}\nСсылка: ${i.url}\n\nПожалуйста, сообщите цену и дополнительную информацию.`
  if (locale === 'en')
    return `Hello. I am interested in the following generator on the Zamanli Makina website:\n\nProduct: ${i.name}\nModel: ${i.model}\nManufacturer: ${i.manufacturer}\nProduct URL: ${i.url}\n\nPlease share the price and additional information.`
  return `Salam. Zamanli Makina saytında aşağıdakı generatorla maraqlanıram:\n\nMəhsul: ${i.name}\nModel: ${i.model}\nManufacturer: ${i.manufacturer}\nProduct URL: ${i.url}\n\nZəhmət olmasa, qiymət və əlavə məlumat verərdiniz.`
}

export function partMessage(locale: Locale, i: PartInquiry): string {
  if (locale === 'ru')
    return `Здравствуйте. Меня интересует следующая запчасть:\n\nДеталь: ${i.name}\nOEM-код: ${i.oem}\nПодходящая модель: ${i.compatible || '—'}\nСсылка: ${i.url}\n\nПожалуйста, сообщите о наличии и цене.`
  if (locale === 'en')
    return `Hello. I am interested in the following spare part:\n\nPart: ${i.name}\nOEM code: ${i.oem}\nCompatible model: ${i.compatible || '—'}\nProduct URL: ${i.url}\n\nPlease let me know the availability and price.`
  return `Salam. Aşağıdakı ehtiyat hissəsi ilə maraqlanıram:\n\nHissə: ${i.name}\nOEM kodu: ${i.oem}\nUyğun model: ${i.compatible || '—'}\nProduct URL: ${i.url}\n\nZəhmət olmasa, mövcudluğu və qiyməti barədə məlumat verərdiniz.`
}

export function generalMessage(locale: Locale, url: string): string {
  if (locale === 'ru') return `Здравствуйте. Хочу получить информацию о генераторах и запчастях Zamanli Makina.\n${url}`
  if (locale === 'en') return `Hello. I would like information about Zamanli Makina generators and spare parts.\n${url}`
  return `Salam. Zamanli Makina generatorları və ehtiyat hissələri barədə məlumat almaq istəyirəm.\n${url}`
}
