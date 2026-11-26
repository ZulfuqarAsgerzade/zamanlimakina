import { ICON_KEYS } from '../../components/ui/Icons.tsx'
import { newId } from '../../lib/ids.ts'
import { defaultHeroFacts } from '../../data/defaults.ts'
import type { FaqItem, HeroFact, ServiceItem, SiteContent } from '../../data/types.ts'
import { useAdminData, useStore } from '../ctx.tsx'
import { ImageField } from '../editors.tsx'
import { ErrorSummary, formStateText, useDocForm } from '../form.tsx'
import { Card, LTextField, LTextListEditor, PageHeader, ReorderButtons, TextField } from '../ui.tsx'
import { move, pickAz } from '../util.ts'

// must stay in sync with the icons the public site can render (components/ui/Icons.tsx → ICON_KEYS)
const ICONS = ICON_KEYS

export function ContentPage() {
  const { content } = useAdminData()
  if (!content) return null
  return <ContentEditor initial={content} />
}

function ContentEditor({ initial: saved }: { initial: SiteContent }) {
  // content saved before hero facts existed shows the defaults on the site, so the editor starts from the same list
  const initial = saved.hero.facts ? saved : { ...saved, hero: { ...saved.hero, facts: defaultHeroFacts() } }
  const store = useStore()
  const d = useAdminData()
  const { value: c, update, errors, saving, dirty, submit } = useDocForm<SiteContent>(initial, async (v) => {
    const saved = await store.saveContent(v)
    await d.reload()
    return saved
  })
  const set = (patch: Partial<SiteContent>) => update((v) => ({ ...v, ...patch }))

  const setService = (i: number, p: Partial<ServiceItem>) => set({ services: c.services.map((s, j) => (j === i ? { ...s, ...p } : s)) })
  const facts = c.hero.facts ?? []
  const setFacts = (next: HeroFact[]) => set({ hero: { ...c.hero, facts: next } })
  const setFact = (i: number, p: Partial<HeroFact>) => setFacts(facts.map((f, j) => (j === i ? { ...f, ...p } : f)))
  const setFaq = (i: number, p: Partial<FaqItem>) => set({ faq: c.faq.map((s, j) => (j === i ? { ...s, ...p } : s)) })

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <PageHeader title="Sayt məzmunu" sub="Ana səhifə, haqqımızda, xidmətlər, FAQ və altlıq mətnləri. Hər sahə üç dildə redaktə olunur." />
      <ErrorSummary errors={errors} />
      <div className="stack">
        <Card title="Ana səhifə — hero">
          <LTextField label="Üst yazı (eyebrow)" value={c.hero.eyebrow} onChange={(eyebrow) => set({ hero: { ...c.hero, eyebrow } })} />
          <LTextField label="Hero başlığı" value={c.hero.title} onChange={(title) => set({ hero: { ...c.hero, title } })} />
          <LTextField label="Hero təsviri" multiline rows={3} value={c.hero.text} onChange={(text) => set({ hero: { ...c.hero, text } })} />
          <ImageField label="Hero şəkli" value={c.hero.image} onChange={(image) => set({ hero: { ...c.hero, image } })} hint="Boş qalsa, standart illüstrasiya göstərilir." />
        </Card>

        <Card title="Ana səhifə — hero göstəriciləri">
          <p className="hint">
            Hero-nun altındakı qısa göstəricilər (ən çoxu 4). Bunlar şirkət barədə iddialardır — yalnız doğru və təsdiq olunmuş məlumatı yazın. Dəyər boş olarsa göstərici gizlənir; etiket boş olarsa yalnız dəyər görünür; hamısı silinərsə zolaq göstərilmir.
          </p>
          {facts.length === 0 && <p className="hint">Göstərici yoxdur — ana səhifədə zolaq göstərilməyəcək.</p>}
          {facts.map((f, i) => (
            <div className="list-editor__row" key={f.id}>
              <div className="list-editor__main">
                <LTextField label={`Göstərici #${i + 1} — dəyər`} value={f.value} onChange={(value) => setFact(i, { value })} />
                <LTextField label={`Göstərici #${i + 1} — etiket`} value={f.label} onChange={(label) => setFact(i, { label })} />
              </div>
              <div className="list-editor__side">
                <ReorderButtons index={i} count={facts.length} onMove={(to) => setFacts(move(facts, i, to))} label={`göstərici ${pickAz(f.value) || i + 1}`} />
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setFacts(facts.filter((_, j) => j !== i))}>
                  Sil
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn--sm" disabled={facts.length >= 4} onClick={() => setFacts([...facts, { id: newId(), label: {}, value: {} }])}>
            + Göstərici əlavə et
          </button>
        </Card>

        <Card title="Şirkət haqqında">
          <LTextField label="Başlıq" value={c.about.title} onChange={(title) => set({ about: { ...c.about, title } })} />
          <LTextListEditor label="Abzas" addLabel="Abzas əlavə et" multiline items={c.about.paragraphs} onChange={(paragraphs) => set({ about: { ...c.about, paragraphs } })} />
          <ImageField label="Haqqımızda şəkli" value={c.about.image} onChange={(image) => set({ about: { ...c.about, image } })} />
        </Card>

        <Card title="Xidmətlər">
          {c.services.length === 0 && <p className="hint">Xidmət əlavə edilməyib.</p>}
          <datalist id="service-icons">{ICONS.map((i) => <option key={i} value={i} />)}</datalist>
          {c.services.map((s, i) => (
            <div className="list-editor__row" key={s.id}>
              <div className="list-editor__main">
                <TextField label={`İkon açarı (xidmət #${i + 1})`} value={s.icon} onChange={(icon) => setService(i, { icon })} hint={`Mümkün açarlar: ${ICONS.join(', ')}. Tanınmayan açar ildırım ikonu ilə göstərilir.`} />
                <LTextField label={`Xidmət başlığı #${i + 1}`} value={s.title} onChange={(title) => setService(i, { title })} />
                <LTextField label={`Xidmət mətni #${i + 1}`} multiline rows={3} value={s.text} onChange={(text) => setService(i, { text })} />
              </div>
              <div className="list-editor__side">
                <ReorderButtons index={i} count={c.services.length} onMove={(to) => set({ services: move(c.services, i, to) })} label={`xidmət ${pickAz(s.title) || i + 1}`} />
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => set({ services: c.services.filter((_, j) => j !== i) })}>
                  Sil
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn--sm" onClick={() => set({ services: [...c.services, { id: newId(), icon: 'generator', title: {}, text: {} }] })}>
            + Xidmət əlavə et
          </button>
        </Card>

        <Card title="Tez-tez verilən suallar">
          {c.faq.length === 0 && <p className="hint">Sual əlavə edilməyib.</p>}
          {c.faq.map((f, i) => (
            <div className="list-editor__row" key={f.id}>
              <div className="list-editor__main">
                <LTextField label={`Sual #${i + 1}`} value={f.question} onChange={(question) => setFaq(i, { question })} />
                <LTextField label={`Cavab #${i + 1}`} multiline rows={3} value={f.answer} onChange={(answer) => setFaq(i, { answer })} />
              </div>
              <div className="list-editor__side">
                <ReorderButtons index={i} count={c.faq.length} onMove={(to) => set({ faq: move(c.faq, i, to) })} label={`sual ${pickAz(f.question) || i + 1}`} />
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => set({ faq: c.faq.filter((_, j) => j !== i) })}>
                  Sil
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn--sm" onClick={() => set({ faq: [...c.faq, { id: newId(), question: {}, answer: {} }] })}>
            + Sual əlavə et
          </button>
        </Card>

        <Card title="Əlaqə və altlıq">
          <LTextField label="Əlaqə səhifəsi giriş mətni" multiline rows={3} value={c.contactIntro} onChange={(contactIntro) => set({ contactIntro })} />
          <LTextField label="Altlıq (footer) mətni" multiline rows={3} value={c.footerText} onChange={(footerText) => set({ footerText })} />
          <p className="hint">Əlaqə məlumatları və sosial şəbəkə linkləri “Tənzimləmələr” bölməsindədir.</p>
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
