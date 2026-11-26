import { demoId } from '../lib/ids.ts'
import { SPEC_GROUP_TITLES, SPEC_PRESET_BY_KEY } from '../data/specPresets.ts'
import type {
  Availability,
  Catalogue,
  Category,
  Compat,
  CoolingSystem,
  FuelType,
  Generator,
  GeneratorType,
  ImageRef,
  LText,
  Manufacturer,
  MediaItem,
  Part,
  Phase,
  SpecGroup,
} from '../data/types.ts'

/**
 * DEMONSTRATION DATA — NOT REAL INVENTORY.
 *
 * Every record produced here carries `isDemo: true` and a deterministic id (demoId), so the
 * seed is repeatable and removable without touching genuine records.
 * Technical figures are *illustrative*, derived by simple formulas from the nominal kVA rating —
 * they are NOT manufacturer-verified specifications. Part codes are prefixed "DEMO-" so they
 * can never be mistaken for real OEM numbers. No prices are invented except a few clearly
 * marked demo prices (the rest use "price on request").
 */

const BASE_TIME = Date.UTC(2026, 0, 10)
const stamp = (i: number) => new Date(BASE_TIME + i * 86_400_000).toISOString()
const t = (az: string, ru: string, en: string): LText => ({ az, ru, en })

/* ───────────────────────── manufacturers ───────────────────────── */

interface MfrDef {
  key: string
  name: string
  website?: string
  desc: LText
}

const MANUFACTURERS: MfrDef[] = [
  {
    key: 'perkins',
    name: 'Perkins',
    desc: t(
      'Dizel mühərrik istehsalçısı. Perkins mühərrikləri əsasında yığılmış generator qurğuları kiçikdən yüksək gücə qədər geniş diapazonu əhatə edir.',
      'Производитель дизельных двигателей. Генераторные установки на базе двигателей Perkins охватывают диапазон от малой до высокой мощности.',
      'Diesel engine manufacturer. Generator sets built around Perkins engines cover a range from small to high output.',
    ),
  },
  {
    key: 'cummins',
    name: 'Cummins',
    desc: t(
      'Mühərrik və enerji sistemləri istehsalçısı. Cummins generator qurğuları sənaye və kommersiya obyektlərində geniş istifadə olunur.',
      'Производитель двигателей и энергосистем. Генераторные установки Cummins широко применяются на промышленных и коммерческих объектах.',
      'Engine and power-system manufacturer. Cummins generator sets are widely used in industrial and commercial facilities.',
    ),
  },
  {
    key: 'baudouin',
    name: 'Baudouin',
    desc: t(
      'Dəniz və generator tətbiqləri üçün dizel mühərrikləri istehsal edən fransız brendi.',
      'Французский бренд дизельных двигателей для морских и генераторных применений.',
      'French brand of diesel engines for marine and generator applications.',
    ),
  },
  {
    key: 'volvo-penta',
    name: 'Volvo Penta',
    desc: t(
      'Sənaye və dəniz mühərrikləri istehsalçısı. Volvo Penta mühərrikləri generator qurğularında geniş tətbiq olunur.',
      'Производитель промышленных и морских двигателей. Двигатели Volvo Penta широко применяются в генераторных установках.',
      'Industrial and marine engine manufacturer. Volvo Penta engines are widely used in generator sets.',
    ),
  },
  {
    key: 'mtu',
    name: 'MTU',
    desc: t(
      'Yüksək güclü dizel mühərrikləri və enerji sistemləri. Məlumat mərkəzləri və strateji obyektlər üçün həllər.',
      'Мощные дизельные двигатели и энергосистемы. Решения для дата-центров и стратегических объектов.',
      'High-output diesel engines and power systems. Solutions for data centres and strategic sites.',
    ),
  },
]

/* ───────────────────────── categories ───────────────────────── */

interface CatDef {
  key: string
  kind: 'generator' | 'part'
  name: LText
  desc: LText
  icon?: string
}

const GEN_CATEGORIES: CatDef[] = [
  {
    key: 'small',
    kind: 'generator',
    name: t('Kiçik güclü (20–100 kVA)', 'Малой мощности (20–100 кВА)', 'Small output (20–100 kVA)'),
    desc: t(
      'Kiçik obyektlər, ofislər və tikinti sahələri üçün generatorlar.',
      'Генераторы для небольших объектов, офисов и строительных площадок.',
      'Generators for small sites, offices and construction areas.',
    ),
  },
  {
    key: 'medium',
    kind: 'generator',
    name: t('Orta güclü (100–500 kVA)', 'Средней мощности (100–500 кВА)', 'Medium output (100–500 kVA)'),
    desc: t(
      'Müəssisələr, ticarət mərkəzləri və istehsalat sahələri üçün.',
      'Для предприятий, торговых центров и производственных площадок.',
      'For enterprises, shopping centres and production sites.',
    ),
  },
  {
    key: 'large',
    kind: 'generator',
    name: t('Yüksək güclü (500–2000 kVA)', 'Высокой мощности (500–2000 кВА)', 'High output (500–2000 kVA)'),
    desc: t(
      'Böyük sənaye obyektləri və infrastruktur üçün.',
      'Для крупных промышленных объектов и инфраструктуры.',
      'For large industrial facilities and infrastructure.',
    ),
  },
  {
    key: 'industrial',
    kind: 'generator',
    name: t('Sənaye və meqa güc (2000+ kVA)', 'Промышленные и сверхмощные (2000+ кВА)', 'Industrial & mega output (2000+ kVA)'),
    desc: t(
      'Strateji obyektlər, məlumat mərkəzləri və böyük zavodlar üçün.',
      'Для стратегических объектов, дата-центров и крупных заводов.',
      'For strategic sites, data centres and large plants.',
    ),
  },
  {
    key: 'mobile',
    kind: 'generator',
    name: t('Mobil və treylerli', 'Мобильные и на прицепе', 'Mobile & trailer-mounted'),
    desc: t(
      'Yerdəyişmə tələb edən obyektlər və müvəqqəti istifadə üçün.',
      'Для объектов, требующих перемещения, и временного использования.',
      'For sites that need relocation and temporary use.',
    ),
  },
]

const PART_CATEGORIES: CatDef[] = [
  { key: 'oil-filters', kind: 'part', icon: 'oil-filter', name: t('Yağ filtrləri', 'Масляные фильтры', 'Oil filters'), desc: t('Mühərrik yağı üçün filtrlər.', 'Фильтры для моторного масла.', 'Filters for engine oil.') },
  { key: 'fuel-filters', kind: 'part', icon: 'fuel-filter', name: t('Yanacaq filtrləri', 'Топливные фильтры', 'Fuel filters'), desc: t('Yanacaq və su ayırıcı filtrlər.', 'Топливные фильтры и водоотделители.', 'Fuel filters and water separators.') },
  { key: 'air-filters', kind: 'part', icon: 'air-filter', name: t('Hava filtrləri', 'Воздушные фильтры', 'Air filters'), desc: t('Mühərrikə daxil olan hava üçün filtrlər.', 'Фильтры для воздуха, поступающего в двигатель.', 'Filters for engine intake air.') },
  { key: 'belts', kind: 'part', icon: 'belt', name: t('Qayışlar', 'Ремни', 'Belts'), desc: t('Ötürücü və fan qayışları.', 'Приводные и вентиляторные ремни.', 'Drive and fan belts.') },
  { key: 'sensors', kind: 'part', icon: 'sensor', name: t('Sensorlar', 'Датчики', 'Sensors'), desc: t('Temperatur və təzyiq sensorları.', 'Датчики температуры и давления.', 'Temperature and pressure sensors.') },
  { key: 'gaskets', kind: 'part', icon: 'gasket', name: t('Contalar', 'Прокладки', 'Gaskets'), desc: t('Mühərrik conta və möhürləyici dəstlər.', 'Прокладки и комплекты уплотнений двигателя.', 'Engine gaskets and seal sets.') },
  { key: 'cooling', kind: 'part', icon: 'thermostat', name: t('Soyutma sistemi', 'Система охлаждения', 'Cooling system'), desc: t('Termostatlar və soyutma komponentləri.', 'Термостаты и компоненты охлаждения.', 'Thermostats and cooling components.') },
  { key: 'electrical', kind: 'part', icon: 'electrical', name: t('Elektrik və idarəetmə', 'Электрика и управление', 'Electrical & control'), desc: t('Start, şarj və idarəetmə komponentləri.', 'Компоненты пуска, зарядки и управления.', 'Starting, charging and control components.') },
]

/* ───────────────────────── generators ───────────────────────── */

type CatKey = 'small' | 'medium' | 'large' | 'industrial' | 'mobile'

interface GenDef {
  mfr: string
  model: string
  kva: number
  standby: number
  cyl: number
  type: GeneratorType
  cat: CatKey
  featured?: boolean
  availability: Availability
  fuel?: FuelType
  phase?: Phase
  cooling?: CoolingSystem
  price?: { amount: number; currency: 'AZN' | 'USD' | 'EUR' }
  hidePrice?: boolean
  draft?: boolean
  /** Leave Russian description untranslated on purpose (exercises the "not translated" notice). */
  noRu?: boolean
}

const GENS: GenDef[] = [
  { mfr: 'perkins', model: '1103A-33G', kva: 30, standby: 33, cyl: 3, type: 'canopy', cat: 'small', availability: 'in_stock', featured: true },
  { mfr: 'perkins', model: '1104A-44TG2', kva: 100, standby: 110, cyl: 4, type: 'canopy', cat: 'small', availability: 'in_stock', featured: true, price: { amount: 18900, currency: 'USD' } },
  { mfr: 'perkins', model: '1106A-70TAG4', kva: 220, standby: 242, cyl: 6, type: 'open', cat: 'medium', availability: 'on_order', noRu: true },
  { mfr: 'perkins', model: '2506C-E15TAG1', kva: 500, standby: 550, cyl: 6, type: 'container', cat: 'large', availability: 'on_order', featured: true },
  { mfr: 'cummins', model: 'C33 D5', kva: 33, standby: 36, cyl: 4, type: 'trailer', cat: 'mobile', availability: 'in_stock' },
  { mfr: 'cummins', model: 'C110 D5', kva: 110, standby: 121, cyl: 6, type: 'canopy', cat: 'medium', availability: 'in_stock', featured: true },
  { mfr: 'cummins', model: 'C275 D5', kva: 275, standby: 303, cyl: 6, type: 'open', cat: 'medium', availability: 'in_stock', hidePrice: true },
  { mfr: 'cummins', model: 'C1100 D5', kva: 1100, standby: 1210, cyl: 12, type: 'container', cat: 'large', availability: 'on_order', featured: true },
  { mfr: 'baudouin', model: '4M11G50/5', kva: 50, standby: 55, cyl: 4, type: 'trailer', cat: 'mobile', availability: 'in_stock' },
  { mfr: 'baudouin', model: '6M21G400/5', kva: 400, standby: 440, cyl: 6, type: 'canopy', cat: 'medium', availability: 'in_stock', price: { amount: 64500, currency: 'USD' } },
  { mfr: 'baudouin', model: '12M26G900/5', kva: 900, standby: 990, cyl: 12, type: 'container', cat: 'large', availability: 'coming_soon', noRu: true },
  { mfr: 'volvo-penta', model: 'TAD531GE', kva: 100, standby: 110, cyl: 4, type: 'canopy', cat: 'small', availability: 'in_stock' },
  { mfr: 'volvo-penta', model: 'TAD734GE', kva: 200, standby: 220, cyl: 6, type: 'canopy', cat: 'medium', availability: 'in_stock', featured: true },
  { mfr: 'volvo-penta', model: 'TAD1344GE', kva: 420, standby: 462, cyl: 6, type: 'open', cat: 'medium', availability: 'out_of_stock' },
  { mfr: 'mtu', model: '12V2000G65', kva: 640, standby: 704, cyl: 12, type: 'container', cat: 'large', availability: 'on_order' },
  { mfr: 'mtu', model: '16V4000G63', kva: 1800, standby: 1980, cyl: 16, type: 'container', cat: 'large', availability: 'on_order', featured: true },
  { mfr: 'mtu', model: '20V4000G63', kva: 2250, standby: 2475, cyl: 20, type: 'container', cat: 'industrial', availability: 'coming_soon', draft: true },
]

const MFR_NAME = Object.fromEntries(MANUFACTURERS.map((m) => [m.key, m.name]))
const round = (n: number, step = 1) => Math.round(n / step) * step

function specGroups(key: string, d: GenDef): SpecGroup[] {
  const kw = d.kva * 0.8
  const lph = Math.max(6, Math.round(kw * 0.75 * 0.27))
  const tank = Math.max(60, round(lph * 8, 10))
  const length = round(1500 + d.kva * 2.4, 50)
  const width = d.kva > 700 ? 2350 : round(800 + d.kva * 1.1, 50)
  const height = d.kva > 700 ? 2600 : round(1250 + d.kva * 1.2, 50)
  const weight = round(650 + d.kva * 4.4, 10)
  const noise = d.type === 'open' ? 92 : d.type === 'trailer' ? 70 : d.type === 'canopy' ? 71 : 74
  const coolantL = Math.max(8, round(d.kva * 0.09 + 6, 1))

  const row = (group: keyof typeof SPEC_GROUP_TITLES, k: string, value: LText | string, unit?: string) => {
    const preset = SPEC_PRESET_BY_KEY[k]
    return {
      group,
      item: {
        id: demoId(`spec:${key}:${k}`),
        label: preset.label,
        value: typeof value === 'string' ? t(value, value, value) : value,
        unit: unit ?? preset.unit,
      },
    }
  }
  const gtype: Record<GeneratorType, LText> = {
    open: t('Açıq çərçivə', 'Открытая рама', 'Open frame'),
    canopy: t('Səssiz (canopy)', 'В кожухе (canopy)', 'Silent (canopy)'),
    container: t('Konteyner tipli', 'Контейнерный', 'Containerised'),
    trailer: t('Mobil (treyler)', 'Мобильный (прицеп)', 'Mobile (trailer)'),
  }
  const rows = [
    row('general', 'manufacturer', MFR_NAME[d.mfr]),
    row('general', 'model', d.model),
    row('general', 'generatorType', gtype[d.type]),
    row('general', 'frequency', '50'),
    row('general', 'voltage', '400/230'),
    row('general', 'phase', '3'),
    row('power', 'primePower', String(d.kva)),
    row('power', 'standbyPower', String(d.standby)),
    row('power', 'powerFactor', '0.8'),
    row('engine', 'engineManufacturer', MFR_NAME[d.mfr]),
    row('engine', 'engineModel', d.model),
    row('engine', 'cylinders', String(d.cyl)),
    row('engine', 'engineSpeed', '1500'),
    row('engine', 'fuelConsumption', String(lph)),
    row('fuel', 'fuelType', t('Dizel', 'Дизель', 'Diesel')),
    row('fuel', 'tankCapacity', String(tank)),
    row('fuel', 'operatingTime', '8'),
    row('cooling', 'coolingSystem', t('Maye soyutma', 'Жидкостное охлаждение', 'Liquid cooled')),
    row('cooling', 'coolingCapacity', String(coolantL)),
    row('dimensions', 'length', String(length)),
    row('dimensions', 'width', String(width)),
    row('dimensions', 'height', String(height)),
    row('dimensions', 'weight', String(weight)),
    row('other', 'noiseLevel', String(noise)),
    row('other', 'alternator', t('Fırçasız sinxron (demo)', 'Бесщёточный синхронный (демо)', 'Brushless synchronous (demo)')),
    row('other', 'controlPanel', t('Avtomatik idarəetmə paneli (demo)', 'Панель автоматического управления (демо)', 'Automatic control panel (demo)')),
    row('other', 'startingSystem', t('Elektrik starter, 24 V (demo)', 'Электростартер, 24 В (демо)', 'Electric starter, 24 V (demo)')),
  ]
  const order = ['general', 'power', 'engine', 'fuel', 'cooling', 'dimensions', 'other'] as const
  return order.map((g) => ({
    id: demoId(`specgroup:${key}:${g}`),
    title: SPEC_GROUP_TITLES[g],
    items: rows.filter((r) => r.group === g).map((r) => r.item),
  }))
}

const ADV: Record<string, LText[]> = {
  canopy: [
    t('Səs izolyasiyalı korpus', 'Шумоизолирующий кожух', 'Sound-attenuated enclosure'),
    t('Xarici istifadə üçün hava şəraitindən qorunma', 'Защита от погодных условий для наружной установки', 'Weather protection for outdoor installation'),
  ],
  open: [
    t('Kompakt açıq çərçivə konstruksiyası', 'Компактная открытая рама', 'Compact open-frame design'),
    t('Texniki xidmət üçün asan çıxış', 'Удобный доступ для обслуживания', 'Easy access for servicing'),
  ],
  container: [
    t('Konteyner tipli korpus: daşınma və quraşdırma rahatlığı', 'Контейнерное исполнение: удобство транспортировки и монтажа', 'Containerised housing for easy transport and siting'),
    t('Yüksək güc üçün ayrıca xidmət məkanı', 'Отдельное сервисное пространство для высокой мощности', 'Dedicated service space for high output'),
  ],
  trailer: [
    t('Treyler şassisi: tez yerdəyişmə', 'Шасси-прицеп: быстрое перемещение', 'Trailer chassis for quick relocation'),
    t('Müvəqqəti və mobil obyektlər üçün', 'Для временных и мобильных объектов', 'For temporary and mobile sites'),
  ],
}
const COMMON_ADV: LText[] = [
  t('Maye soyutmalı dizel mühərrik', 'Дизельный двигатель с жидкостным охлаждением', 'Liquid-cooled diesel engine'),
  t('Üç fazalı 400/230 V çıxış', 'Трёхфазный выход 400/230 В', 'Three-phase 400/230 V output'),
]
const APPS: LText[] = [
  t('Ehtiyat enerji təchizatı', 'Резервное электроснабжение', 'Standby power supply'),
  t('Tikinti meydançaları', 'Строительные площадки', 'Construction sites'),
  t('Sənaye və istehsalat obyektləri', 'Промышленные и производственные объекты', 'Industrial and production facilities'),
]

function buildGenerator(d: GenDef, i: number): Generator {
  const key = `${d.mfr}:${d.model}`
  const mname = MFR_NAME[d.mfr]
  const slug = `${d.mfr}-${d.model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const typeAz: Record<GeneratorType, string> = { open: 'açıq çərçivəli', canopy: 'səssiz korpuslu (canopy)', container: 'konteyner tipli', trailer: 'treylerdə mobil' }
  const typeRu: Record<GeneratorType, string> = { open: 'на открытой раме', canopy: 'в шумоизолирующем кожухе (canopy)', container: 'в контейнерном исполнении', trailer: 'мобильный, на прицепе' }
  const typeEn: Record<GeneratorType, string> = { open: 'open-frame', canopy: 'silent canopy', container: 'containerised', trailer: 'trailer-mounted' }

  const shortDescription: LText = {
    az: `${mname} ${d.model} — ${d.kva} kVA ${typeAz[d.type]} dizel generator qurğusu (demo).`,
    ru: d.noRu ? undefined : `${mname} ${d.model} — дизель-генераторная установка ${d.kva} кВА, ${typeRu[d.type]} (демо).`,
    en: `${mname} ${d.model} — ${d.kva} kVA ${typeEn[d.type]} diesel generator set (demo).`,
  }
  const description: LText = {
    az: `Bu, ${mname} ${d.model} əsasında ${d.kva} kVA əsas (${d.standby} kVA ehtiyat) güclü ${typeAz[d.type]} dizel generator qurğusunun NÜMAYİŞ təsviridir. Texniki göstəricilər illüstrativdir və istehsalçının rəsmi məlumatı deyil — dəqiq konfiqurasiya və qiymət üçün sorğu göndərin.`,
    ru: d.noRu
      ? undefined
      : `Это ДЕМОНСТРАЦИОННОЕ описание дизель-генераторной установки ${mname} ${d.model} мощностью ${d.kva} кВА (резервная ${d.standby} кВА), ${typeRu[d.type]}. Характеристики носят иллюстративный характер и не являются официальными данными производителя — для точной комплектации и цены отправьте запрос.`,
    en: `This is a DEMONSTRATION description of a ${d.kva} kVA prime (${d.standby} kVA standby) ${typeEn[d.type]} diesel generator set based on the ${mname} ${d.model}. Figures are illustrative and not official manufacturer data — send an inquiry for the exact configuration and price.`,
  }

  const price = d.price
    ? { type: 'fixed' as const, amount: d.price.amount, currency: d.price.currency }
    : d.hidePrice
      ? { type: 'hidden' as const }
      : { type: 'request' as const }

  const imgType = d.type
  const images: ImageRef[] = (['side', 'rear', 'panel'] as const).map((view) => ({
    mediaId: demoId(`media:gen-${imgType}-${view}`),
    url: `/demo/gen-${imgType}-${view}.svg`,
    width: 1200,
    height: 800,
    alt: {
      az: `${mname} ${d.model} generatoru (demo illüstrasiya, ${view === 'side' ? 'yan görünüş' : view === 'rear' ? 'arxa görünüş' : 'idarəetmə paneli'})`,
      ru: `Генератор ${mname} ${d.model} (демо-иллюстрация, ${view === 'side' ? 'вид сбоку' : view === 'rear' ? 'вид сзади' : 'панель управления'})`,
      en: `${mname} ${d.model} generator (demo illustration, ${view === 'side' ? 'side view' : view === 'rear' ? 'rear view' : 'control panel'})`,
    },
  }))

  return {
    id: demoId(`gen:${key}`),
    createdAt: stamp(10 + i),
    updatedAt: stamp(10 + i),
    isDemo: true,
    slug,
    manufacturerId: demoId(`mfr:${d.mfr}`),
    categoryId: demoId(`cat:${d.cat}`),
    model: d.model,
    title: {},
    shortDescription,
    description,
    advantages: [...(ADV[d.type] ?? []), ...COMMON_ADV],
    applications: APPS,
    images,
    price,
    availability: d.availability,
    featured: !!d.featured,
    status: d.draft ? 'draft' : 'published',
    kvaPrime: d.kva,
    kvaStandby: d.standby,
    generatorType: d.type,
    fuelType: d.fuel ?? 'diesel',
    phase: d.phase ?? 3,
    coolingSystem: d.cooling ?? 'water',
    specGroups: specGroups(key, d),
    seo: {},
  }
}

/* ───────────────────────── spare parts ───────────────────────── */

interface PartDef {
  key: string
  cat: string
  mfr: string | null
  name: LText
  oem: string
  /** generator keys "<mfr>:<model>" or "mfr:*" wildcard / "mfr:prefix*" */
  fits: string[]
  availability: Availability
  featured?: boolean
  price?: { amount: number; currency: 'AZN' | 'USD' | 'EUR' }
  draft?: boolean
}

const PARTS: PartDef[] = [
  { key: 'pk-oil-1100', cat: 'oil-filters', mfr: 'perkins', oem: 'DEMO-PK-OF-1100', name: t('Yağ filtri — Perkins 1100 seriyası', 'Масляный фильтр — Perkins серии 1100', 'Oil filter — Perkins 1100 series'), fits: ['perkins:1103A*', 'perkins:1104A*', 'perkins:1106A*'], availability: 'in_stock', featured: true, price: { amount: 38, currency: 'AZN' } },
  { key: 'pk-fuel-1100', cat: 'fuel-filters', mfr: 'perkins', oem: 'DEMO-PK-FF-1100', name: t('Yanacaq filtri — Perkins 1100 seriyası', 'Топливный фильтр — Perkins серии 1100', 'Fuel filter — Perkins 1100 series'), fits: ['perkins:1103A*', 'perkins:1104A*', 'perkins:1106A*'], availability: 'in_stock', featured: true },
  { key: 'pk-air-1100', cat: 'air-filters', mfr: 'perkins', oem: 'DEMO-PK-AF-1104', name: t('Hava filtri elementi — Perkins 1104/1106', 'Элемент воздушного фильтра — Perkins 1104/1106', 'Air filter element — Perkins 1104/1106'), fits: ['perkins:1104A*', 'perkins:1106A*'], availability: 'on_order' },
  { key: 'pk-belt-1104', cat: 'belts', mfr: 'perkins', oem: 'DEMO-PK-BL-1104', name: t('Ötürücü qayış — Perkins 1104A', 'Приводной ремень — Perkins 1104A', 'Drive belt — Perkins 1104A'), fits: ['perkins:1104A*'], availability: 'in_stock' },
  { key: 'pk-sensor', cat: 'sensors', mfr: 'perkins', oem: 'DEMO-PK-SN-CT01', name: t('Soyuducu temperatur sensoru — Perkins', 'Датчик температуры охлаждающей жидкости — Perkins', 'Coolant temperature sensor — Perkins'), fits: ['perkins:*'], availability: 'in_stock' },
  { key: 'pk-gasket-1103', cat: 'gaskets', mfr: 'perkins', oem: 'DEMO-PK-GS-1103', name: t('Silindr başlığı contası — Perkins 1103A', 'Прокладка головки блока — Perkins 1103A', 'Cylinder head gasket — Perkins 1103A'), fits: ['perkins:1103A*'], availability: 'on_order' },
  { key: 'pk-oil-2500', cat: 'oil-filters', mfr: 'perkins', oem: 'DEMO-PK-OF-2500', name: t('Yağ filtri — Perkins 2500 seriyası', 'Масляный фильтр — Perkins серии 2500', 'Oil filter — Perkins 2500 series'), fits: ['perkins:2506C*'], availability: 'in_stock' },

  { key: 'cm-oil', cat: 'oil-filters', mfr: 'cummins', oem: 'DEMO-CM-OF-C01', name: t('Yağ filtri — Cummins C seriyası', 'Масляный фильтр — Cummins серии C', 'Oil filter — Cummins C series'), fits: ['cummins:*'], availability: 'in_stock', featured: true },
  { key: 'cm-fuel', cat: 'fuel-filters', mfr: 'cummins', oem: 'DEMO-CM-FF-C02', name: t('Yanacaq filtri / su ayırıcı — Cummins', 'Топливный фильтр / водоотделитель — Cummins', 'Fuel filter / water separator — Cummins'), fits: ['cummins:C110*', 'cummins:C275*', 'cummins:C1100*'], availability: 'in_stock' },
  { key: 'cm-air', cat: 'air-filters', mfr: 'cummins', oem: 'DEMO-CM-AF-C03', name: t('Hava filtri — Cummins C275/C1100', 'Воздушный фильтр — Cummins C275/C1100', 'Air filter — Cummins C275/C1100'), fits: ['cummins:C275*', 'cummins:C1100*'], availability: 'on_order' },
  { key: 'cm-belt', cat: 'belts', mfr: 'cummins', oem: 'DEMO-CM-BL-C04', name: t('Poli-V qayış — Cummins C110/C275', 'Поликлиновой ремень — Cummins C110/C275', 'Poly-V belt — Cummins C110/C275'), fits: ['cummins:C110*', 'cummins:C275*'], availability: 'in_stock' },
  { key: 'cm-sensor', cat: 'sensors', mfr: 'cummins', oem: 'DEMO-CM-SN-C05', name: t('Yağ təzyiqi sensoru — Cummins', 'Датчик давления масла — Cummins', 'Oil pressure sensor — Cummins'), fits: ['cummins:*'], availability: 'in_stock' },
  { key: 'cm-thermo', cat: 'cooling', mfr: 'cummins', oem: 'DEMO-CM-TH-C06', name: t('Termostat — Cummins C110/C275', 'Термостат — Cummins C110/C275', 'Thermostat — Cummins C110/C275'), fits: ['cummins:C110*', 'cummins:C275*'], availability: 'out_of_stock' },

  { key: 'bd-oil', cat: 'oil-filters', mfr: 'baudouin', oem: 'DEMO-BD-OF-M01', name: t('Yağ filtri — Baudouin M seriyası', 'Масляный фильтр — Baudouin серии M', 'Oil filter — Baudouin M series'), fits: ['baudouin:4M11*', 'baudouin:6M21*'], availability: 'in_stock' },
  { key: 'bd-fuel', cat: 'fuel-filters', mfr: 'baudouin', oem: 'DEMO-BD-FF-M02', name: t('Yanacaq filtri — Baudouin', 'Топливный фильтр — Baudouin', 'Fuel filter — Baudouin'), fits: ['baudouin:*'], availability: 'in_stock' },
  { key: 'bd-air', cat: 'air-filters', mfr: 'baudouin', oem: 'DEMO-BD-AF-M03', name: t('Hava filtri — Baudouin 6M21/12M26', 'Воздушный фильтр — Baudouin 6M21/12M26', 'Air filter — Baudouin 6M21/12M26'), fits: ['baudouin:6M21*', 'baudouin:12M26*'], availability: 'on_order' },
  { key: 'bd-belt', cat: 'belts', mfr: 'baudouin', oem: 'DEMO-BD-BL-M04', name: t('Fan qayışı — Baudouin 4M11', 'Вентиляторный ремень — Baudouin 4M11', 'Fan belt — Baudouin 4M11'), fits: ['baudouin:4M11*'], availability: 'in_stock' },

  { key: 'vp-oil', cat: 'oil-filters', mfr: 'volvo-penta', oem: 'DEMO-VP-OF-T01', name: t('Yağ filtri — Volvo Penta TAD', 'Масляный фильтр — Volvo Penta TAD', 'Oil filter — Volvo Penta TAD'), fits: ['volvo-penta:TAD531*', 'volvo-penta:TAD734*'], availability: 'in_stock', featured: true },
  { key: 'vp-fuel', cat: 'fuel-filters', mfr: 'volvo-penta', oem: 'DEMO-VP-FF-T02', name: t('Yanacaq filtri — Volvo Penta TAD', 'Топливный фильтр — Volvo Penta TAD', 'Fuel filter — Volvo Penta TAD'), fits: ['volvo-penta:*'], availability: 'in_stock' },
  { key: 'vp-sensor', cat: 'sensors', mfr: 'volvo-penta', oem: 'DEMO-VP-SN-T03', name: t('Soyuducu sensoru — Volvo Penta', 'Датчик охлаждающей жидкости — Volvo Penta', 'Coolant sensor — Volvo Penta'), fits: ['volvo-penta:*'], availability: 'on_order' },
  { key: 'vp-gasket', cat: 'gaskets', mfr: 'volvo-penta', oem: 'DEMO-VP-GS-T04', name: t('Conta dəsti — Volvo Penta TAD734', 'Комплект прокладок — Volvo Penta TAD734', 'Gasket set — Volvo Penta TAD734'), fits: ['volvo-penta:TAD734*'], availability: 'on_order' },

  { key: 'mt-oil', cat: 'oil-filters', mfr: 'mtu', oem: 'DEMO-MT-OF-S01', name: t('Yağ filtri — MTU 2000/4000 seriyası', 'Масляный фильтр — MTU серий 2000/4000', 'Oil filter — MTU 2000/4000 series'), fits: ['mtu:*'], availability: 'on_order' },
  { key: 'mt-fuel', cat: 'fuel-filters', mfr: 'mtu', oem: 'DEMO-MT-FF-S02', name: t('Yanacaq ön filtri — MTU', 'Топливный префильтр — MTU', 'Fuel pre-filter — MTU'), fits: ['mtu:*'], availability: 'on_order' },
  { key: 'mt-air', cat: 'air-filters', mfr: 'mtu', oem: 'DEMO-MT-AF-S03', name: t('Hava filtri — MTU 4000 seriyası', 'Воздушный фильтр — MTU серии 4000', 'Air filter — MTU 4000 series'), fits: ['mtu:16V4000*', 'mtu:20V4000*'], availability: 'coming_soon' },

  { key: 'uni-charger', cat: 'electrical', mfr: null, oem: 'DEMO-UNI-EL-BC24', name: t('Universal akkumulyator şarj cihazı, 24 V', 'Универсальное зарядное устройство для АКБ, 24 В', 'Universal battery charger, 24 V'), fits: ['perkins:*', 'cummins:*', 'baudouin:*', 'volvo-penta:*', 'mtu:*'], availability: 'in_stock', featured: true, price: { amount: 220, currency: 'AZN' } },
  { key: 'uni-thermo', cat: 'cooling', mfr: null, oem: 'DEMO-UNI-CL-TH82', name: t('Universal termostat (82 °C)', 'Универсальный термостат (82 °C)', 'Universal thermostat (82 °C)'), fits: ['perkins:1103A*', 'perkins:1104A*', 'baudouin:4M11*', 'cummins:C33*'], availability: 'in_stock' },
  { key: 'uni-relay', cat: 'electrical', mfr: null, oem: 'DEMO-UNI-EL-SR24', name: t('Start rölesi, 24 V', 'Стартерное реле, 24 В', 'Starter relay, 24 V'), fits: ['cummins:C33*', 'cummins:C110*', 'perkins:1103A*', 'baudouin:4M11*'], availability: 'in_stock', draft: true },
]

const PART_DESC: Record<string, LText> = {
  'oil-filters': t('Mühərrik yağının təmizlənməsi üçün filtr elementi. Nümayiş məlumatıdır.', 'Фильтрующий элемент для очистки моторного масла. Демонстрационные данные.', 'Filter element for engine oil cleaning. Demonstration data.'),
  'fuel-filters': t('Yanacaq sistemini çirkləndiricilərdən qoruyan filtr. Nümayiş məlumatıdır.', 'Фильтр, защищающий топливную систему от загрязнений. Демонстрационные данные.', 'Filter protecting the fuel system from contaminants. Demonstration data.'),
  'air-filters': t('Mühərrikə daxil olan havanı təmizləyən filtr elementi. Nümayiş məlumatıdır.', 'Фильтрующий элемент для очистки воздуха, поступающего в двигатель. Демонстрационные данные.', 'Filter element cleaning engine intake air. Demonstration data.'),
  belts: t('Köməkçi aqreqatların ötürücü qayışı. Nümayiş məlumatıdır.', 'Приводной ремень вспомогательных агрегатов. Демонстрационные данные.', 'Drive belt for auxiliary components. Demonstration data.'),
  sensors: t('Mühərrikin vəziyyətini izləyən sensor. Nümayiş məlumatıdır.', 'Датчик для контроля состояния двигателя. Демонстрационные данные.', 'Sensor monitoring engine condition. Demonstration data.'),
  gaskets: t('Mühərrik komponentləri arasında möhürləmə təmin edən conta. Nümayiş məlumatıdır.', 'Прокладка, обеспечивающая уплотнение между компонентами двигателя. Демонстрационные данные.', 'Gasket sealing between engine components. Demonstration data.'),
  cooling: t('Soyutma sistemi komponenti. Nümayiş məlumatıdır.', 'Компонент системы охлаждения. Демонстрационные данные.', 'Cooling-system component. Demonstration data.'),
  electrical: t('Elektrik və idarəetmə sisteminin komponenti. Nümayiş məlumatıdır.', 'Компонент электрической системы и управления. Демонстрационные данные.', 'Electrical and control-system component. Demonstration data.'),
}

const PART_ICON: Record<string, string> = Object.fromEntries(PART_CATEGORIES.map((c) => [c.key, c.icon ?? 'oil-filter']))

function matchFit(pattern: string, gens: GenDef[]): GenDef[] {
  const [mfr, model] = pattern.split(':')
  return gens.filter((g) => {
    if (g.mfr !== mfr) return false
    if (model === '*') return true
    if (model.endsWith('*')) return g.model.toLowerCase().startsWith(model.slice(0, -1).toLowerCase())
    return g.model.toLowerCase() === model.toLowerCase()
  })
}

function buildPart(p: PartDef, i: number): Part {
  const icon = PART_ICON[p.cat]
  const specs: SpecGroup[] = [
    {
      id: demoId(`partspec:${p.key}`),
      title: t('Texniki məlumat', 'Техническая информация', 'Technical information'),
      items: [
        { id: demoId(`partspec:${p.key}:code`), label: t('İstinad kodu', 'Артикул', 'Reference code'), value: t(p.oem, p.oem, p.oem) },
        { id: demoId(`partspec:${p.key}:note`), label: t('Qeyd', 'Примечание', 'Note'), value: t('Demo məlumat', 'Демо-данные', 'Demo data') },
      ],
    },
  ]
  return {
    id: demoId(`part:${p.key}`),
    createdAt: stamp(40 + i),
    updatedAt: stamp(40 + i),
    isDemo: true,
    slug: p.key,
    name: p.name,
    oemCode: p.oem,
    manufacturerId: p.mfr ? demoId(`mfr:${p.mfr}`) : null,
    categoryId: demoId(`cat:${p.cat}`),
    description: PART_DESC[p.cat],
    images: [
      {
        mediaId: demoId(`media:part-${icon}`),
        url: `/demo/part-${icon}.svg`,
        width: 800,
        height: 800,
        alt: {
          az: `${p.name.az} (demo illüstrasiya)`,
          ru: `${p.name.ru} (демо-иллюстрация)`,
          en: `${p.name.en} (demo illustration)`,
        },
      },
    ],
    price: p.price ? { type: 'fixed', amount: p.price.amount, currency: p.price.currency } : { type: 'request' },
    availability: p.availability,
    featured: !!p.featured,
    status: p.draft ? 'draft' : 'published',
    specGroups: specs,
    seo: {},
  }
}

/* ───────────────────────── assemble ───────────────────────── */

export interface DemoDataset extends Catalogue {
  media: MediaItem[]
}

export function buildDemoDataset(): DemoDataset {
  const manufacturers: Manufacturer[] = MANUFACTURERS.map((m, i) => ({
    id: demoId(`mfr:${m.key}`),
    createdAt: stamp(i),
    updatedAt: stamp(i),
    isDemo: true,
    slug: m.key,
    name: m.name,
    description: m.desc,
    website: m.website,
    seo: {},
    status: 'published',
    sortOrder: i,
  }))

  const categories: Category[] = [...GEN_CATEGORIES, ...PART_CATEGORIES].map((c, i) => ({
    id: demoId(`cat:${c.key}`),
    createdAt: stamp(5 + i),
    updatedAt: stamp(5 + i),
    isDemo: true,
    kind: c.kind,
    slug: c.key,
    name: c.name,
    description: c.desc,
    icon: c.icon,
    sortOrder: c.kind === 'generator' ? i : i - GEN_CATEGORIES.length,
    status: 'published',
  }))

  const generators = GENS.map(buildGenerator)
  const parts = PARTS.map(buildPart)

  const compat: Compat[] = []
  for (const p of PARTS) {
    const seen = new Set<string>()
    for (const pattern of p.fits)
      for (const g of matchFit(pattern, GENS)) {
        const gid = demoId(`gen:${g.mfr}:${g.model}`)
        if (!seen.has(gid)) {
          seen.add(gid)
          compat.push({ partId: demoId(`part:${p.key}`), generatorId: gid })
        }
      }
  }

  // Media library entries for every demo artwork file
  const mediaFiles = new Set<string>()
  for (const r of [...generators, ...parts]) for (const img of r.images) mediaFiles.add(img.url)
  const media: MediaItem[] = [...mediaFiles].sort().map((url, i) => {
    const name = url.split('/').pop() ?? url
    const img = [...generators, ...parts].flatMap((r) => r.images).find((x) => x.url === url)!
    return {
      id: img.mediaId!,
      createdAt: stamp(60 + i),
      updatedAt: stamp(60 + i),
      isDemo: true,
      name,
      url,
      width: img.width,
      height: img.height,
      alt: { az: 'Demo illüstrasiya', ru: 'Демо-иллюстрация', en: 'Demo illustration' },
    }
  })

  return { manufacturers, categories, generators, parts, compat, media }
}

/* ───────────────────────── reliable demo identity ───────────────────────── */

export interface DemoIdSets {
  manufacturers: ReadonlySet<string>
  categories: ReadonlySet<string>
  generators: ReadonlySet<string>
  parts: ReadonlySet<string>
  media: ReadonlySet<string>
}

let idSets: DemoIdSets | null = null

/**
 * The ids the demo dataset owns (deterministic, see `demoId`). A record counts as demo data ONLY when it carries the
 * `isDemo` flag AND one of these ids — the flag alone can be set by hand on a genuine record, so it is never enough
 * to delete anything.
 */
export function demoIdSets(): DemoIdSets {
  if (!idSets) {
    const d = buildDemoDataset()
    const ids = (rows: Array<{ id: string }>): ReadonlySet<string> => new Set(rows.map((r) => r.id))
    idSets = { manufacturers: ids(d.manufacturers), categories: ids(d.categories), generators: ids(d.generators), parts: ids(d.parts), media: ids(d.media) }
  }
  return idSets
}
