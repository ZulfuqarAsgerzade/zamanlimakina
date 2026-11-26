import type { FieldErrors } from '../../data/schema.ts'
import { LOCALES } from '../../data/types.ts'
import type { Locale, Settings, SocialLinks } from '../../data/types.ts'
import { useAdminData, useStore } from '../ctx.tsx'
import { ImageField } from '../editors.tsx'
import { ErrorSummary, formStateText, useDocForm } from '../form.tsx'
import { Card, CheckField, LTextField, PageHeader, SelectField, TextField } from '../ui.tsx'
import { LOCALE_LABEL, isHttpUrl } from '../util.ts'

const SOCIAL: Array<[keyof SocialLinks, string, string]> = [
  ['instagram', 'Instagram', 'https://instagram.com/…'],
  ['facebook', 'Facebook', 'https://facebook.com/…'],
  ['linkedin', 'LinkedIn', 'https://linkedin.com/company/…'],
  ['youtube', 'YouTube', 'https://youtube.com/@…'],
  ['tiktok', 'TikTok', 'https://tiktok.com/@…'],
  ['tapaz', 'Tap.az mağazası', 'https://tap.az/shops/…'],
]
const LANG_NAME: Record<Locale, string> = { az: 'Azərbaycan dili', ru: 'Rus dili', en: 'İngilis dili' }

export function SettingsPage() {
  const { settings } = useAdminData()
  if (!settings) return null
  return <SettingsEditor initial={settings} />
}

function SettingsEditor({ initial }: { initial: Settings }) {
  const store = useStore()
  const d = useAdminData()
  const { value: s, update, errors, saving, dirty, submit } = useDocForm<Settings>(
    initial,
    async (v) => {
      const saved = await store.saveSettings({ ...v, social: Object.fromEntries(Object.entries(v.social).filter(([, x]) => x?.trim())) })
      await d.reload()
      return saved
    },
    (v): FieldErrors => {
      const e: FieldErrors = {}
      if (!v.languages.enabled.includes(v.languages.default)) e['languages.default'] = 'Defolt dil aktiv dillər siyahısında olmalıdır.'
      // links end up in <a href>: only absolute http(s) URLs are accepted (blocks javascript:, data:, relative junk)
      for (const [key, label] of SOCIAL.map(([k, l]) => [k, l] as const)) {
        const val = v.social[key]?.trim()
        if (val && !isHttpUrl(val)) e[`social.${key}`] = `${label}: tam http(s) ünvanı daxil edin (məs. https://…).`
      }
      const og = v.seoDefaults.ogImage?.trim()
      if (og && !isHttpUrl(og) && !og.startsWith('/')) e['seoDefaults.ogImage'] = 'Open Graph şəkli: http(s) ünvanı və ya “/” ilə başlayan yol olmalıdır.'
      return e
    },
  )
  const set = (p: Partial<Settings>) => update((v) => ({ ...v, ...p }))

  const toggleLang = (l: Locale, on: boolean) =>
    set({
      languages: {
        ...s.languages,
        enabled: on ? LOCALES.filter((x) => x === l || s.languages.enabled.includes(x)) : s.languages.enabled.filter((x) => x !== l),
      },
    })

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <PageHeader title="Tənzimləmələr" sub="Şirkət məlumatları, əlaqə vasitələri, SEO və dillər." />
      <ErrorSummary errors={errors} />
      <div className="stack">
        <Card title="Şirkət">
          <TextField label="Şirkət adı" required value={s.companyName} error={errors.companyName} onChange={(companyName) => set({ companyName })} />
          <ImageField label="Loqo" value={s.logo} error={errors['logo.url']} onChange={(logo) => set({ logo })} hint="Boş qalsa, rəsmi loqo faylı (public/brand/logo.png) istifadə olunur." />
        </Card>

        <Card title="Əlaqə">
          <TextField
            label="WhatsApp nömrəsi"
            value={s.whatsapp}
            error={errors.whatsapp}
            inputMode="numeric"
            autoComplete="off"
            placeholder="994501234567"
            onChange={(v) => set({ whatsapp: v.replace(/[\s+()-]/g, '') })}
            hint="Yalnız rəqəmlər, beynəlxalq formatda (ölkə kodu ilə, “+” olmadan). Nömrə daxil edilənə qədər məhsul düymələri “kontakt seçin” rejimində açılır (mesaj hazır gəlir, alıcını istifadəçi seçir), əlaqə səhifəsindəki və altlıqdakı WhatsApp keçidləri isə gizlədilir."
          />
          <div className="grid grid--2">
            <TextField label="Telefon" type="tel" value={s.phone} error={errors.phone} onChange={(phone) => set({ phone })} />
            <TextField label="E-poçt" type="email" value={s.email} error={errors.email} onChange={(email) => set({ email })} />
          </div>
          <LTextField label="Ünvan" multiline rows={2} value={s.address} onChange={(address) => set({ address })} />
          <LTextField label="İş saatları" multiline rows={2} value={s.workingHours} onChange={(workingHours) => set({ workingHours })} hint="Məsələn: B.e.–Cümə 09:00–18:00" />
        </Card>

        <Card title="Sosial şəbəkələr">
          <div className="grid grid--2">
            {SOCIAL.map(([key, label, ph]) => (
              <TextField key={key} label={label} type="url" placeholder={ph} value={s.social[key] ?? ''} onChange={(v) => set({ social: { ...s.social, [key]: v } })} />
            ))}
          </div>
        </Card>

        <Card title="SEO standartları">
          <TextField label="Başlıq şəkilçisi" value={s.seoDefaults.titleSuffix} onChange={(titleSuffix) => set({ seoDefaults: { ...s.seoDefaults, titleSuffix } })} hint="Səhifə başlıqlarının sonuna əlavə olunur: “Səhifə | Zamanlı Makina”." />
          <LTextField label="Standart meta təsvir" multiline rows={3} value={s.seoDefaults.description} onChange={(description) => set({ seoDefaults: { ...s.seoDefaults, description } })} />
          <TextField label="Open Graph şəkli (URL)" value={s.seoDefaults.ogImage ?? ''} onChange={(ogImage) => set({ seoDefaults: { ...s.seoDefaults, ogImage: ogImage || undefined } })} hint="Sosial şəbəkələrdə paylaşım üçün 1200×630 şəkil ünvanı." />
        </Card>

        <Card title="Dillər">
          <SelectField<Locale>
            label="Defolt dil"
            value={s.languages.default}
            error={errors['languages.default']}
            onChange={(l) => l && set({ languages: { ...s.languages, default: l } })}
            options={LOCALES.map((l) => ({ value: l, label: `${LOCALE_LABEL[l]} — ${LANG_NAME[l]}` }))}
          />
          <fieldset className="plain-fieldset">
            <legend>Aktiv dillər</legend>
            {LOCALES.map((l) => (
              <CheckField key={l} label={`${LOCALE_LABEL[l]} — ${LANG_NAME[l]}`} checked={s.languages.enabled.includes(l)} onChange={(on) => toggleLang(l, on)} />
            ))}
            {errors['languages.enabled'] && <p className="err">{errors['languages.enabled']}</p>}
          </fieldset>
        </Card>
      </div>
      <div className="formbar">
        <div className="formbar__state" role="status" aria-live="polite">
          {formStateText(saving, dirty)}
        </div>
        <div className="formbar__actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saxlanılır…' : 'Saxla'}
          </button>
        </div>
      </div>
    </form>
  )
}
