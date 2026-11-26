import { describe, expect, it } from 'vitest'
import { buildWhatsAppUrl, generatorMessage, partMessage } from '../whatsapp.ts'

describe('WhatsApp links', () => {
  it('percent-encodes Azerbaijani letters, reserved characters, newlines and emoji exactly', () => {
    const url = buildWhatsAppUrl('994501234567', 'Əli & Vəli: İşıq #1 100% a+b=c? "q" \'s\' ç ğ ö ş ü\n✓ 🔧')!
    const q = url.split('?text=')[1]
    expect(q).toContain('%C6%8Fli') // Ə
    expect(q).toContain('V%C9%99li') // ə
    expect(q).toContain('%C4%B0%C5%9F%C4%B1q') // İşıq
    expect(q).toContain('%26') // &
    expect(q).toContain('%231') // #
    expect(q).toContain('100%25') // %
    expect(q).toContain('a%2Bb%3Dc%3F') // + = ?
    expect(q).toContain('%0A') // newline
    expect(q).toContain('%F0%9F%94%A7') // 🔧
    expect(q).not.toMatch(/[ &#"+?]/)
    expect(decodeURIComponent(q)).toBe('Əli & Vəli: İşıq #1 100% a+b=c? "q" \'s\' ç ğ ö ş ü\n✓ 🔧')
  })

  it('keeps a product URL with its own query string intact', () => {
    const m = generatorMessage('az', { name: 'N', model: 'M', manufacturer: 'Mf', url: 'https://x.az/generatorlar/a?x=1&y=2#top' })
    const back = decodeURIComponent(buildWhatsAppUrl('994501234567', m)!.split('?text=')[1])
    expect(back).toContain('Product URL: https://x.az/generatorlar/a?x=1&y=2#top')
  })

  it('returns null without a configured number', () => {
    expect(buildWhatsAppUrl('', 'hi')).toBeNull()
    expect(buildWhatsAppUrl(undefined)).toBeNull()
    expect(buildWhatsAppUrl('123')).toBeNull()
  })

  it('strips formatting from the number and URL-encodes the message', () => {
    const msg = 'Salam. Zamanli Makina saytında\n\nMəhsul: A&B #1 100%'
    const url = buildWhatsAppUrl('+994 (50) 123-45-67', msg)!
    expect(url.startsWith('https://wa.me/994501234567?text=')).toBe(true)
    const text = url.split('?text=')[1]
    expect(text).not.toMatch(/[\s&#]/)
    expect(decodeURIComponent(text)).toBe(msg)
  })

  it('generator message follows the agreed Azerbaijani template', () => {
    const m = generatorMessage('az', { name: 'Perkins 1104A', model: '1104A-44TG2', manufacturer: 'Perkins', url: 'https://x.az/g/1' })
    expect(m).toBe(
      'Salam. Zamanli Makina saytında aşağıdakı generatorla maraqlanıram:\n\nMəhsul: Perkins 1104A\nModel: 1104A-44TG2\nManufacturer: Perkins\nProduct URL: https://x.az/g/1\n\nZəhmət olmasa, qiymət və əlavə məlumat verərdiniz.',
    )
  })

  it('part message follows the agreed Azerbaijani template and is translated for ru/en', () => {
    const i = { name: 'Yağ filtri', oem: 'DEMO-1', compatible: 'Perkins 1104A', url: 'https://x.az/p/1' }
    expect(partMessage('az', i)).toBe(
      'Salam. Aşağıdakı ehtiyat hissəsi ilə maraqlanıram:\n\nHissə: Yağ filtri\nOEM kodu: DEMO-1\nUyğun model: Perkins 1104A\nProduct URL: https://x.az/p/1\n\nZəhmət olmasa, mövcudluğu və qiyməti barədə məlumat verərdiniz.',
    )
    expect(partMessage('ru', i)).toContain('OEM-код: DEMO-1')
    expect(partMessage('en', i)).toContain('OEM code: DEMO-1')
  })
})
