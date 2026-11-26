import { demoId } from '../lib/ids.ts'
import type { HeroFact, Settings, SiteContent } from './types.ts'

/**
 * Factual defaults for a brand-new installation. Everything here comes from the client's
 * brand book (company name, address, slogans, 20–16000 kVA range, sales / rental / 24-7 service,
 * "5 il rəsmi zəmanət") or is deliberately generic. Edit it in the admin panel ("Sayt məzmunu",
 * "Tənzimləmələr"). Nothing here is fabricated customer data: no reviews, no certificates,
 * no statistics, and NO phone / WhatsApp number (the brand book number is incomplete).
 */
export const defaultSettings = (): Settings => ({
  companyName: 'Zamanlı Makina',
  whatsapp: '',
  phone: '',
  email: '',
  address: {
    az: 'Bakı ş., Binəqədi r., Biləcəri qəs., 1 May küç.',
    ru: 'г. Баку, Бинагадинский р-н, пос. Биляджари, ул. 1 Мая',
    en: '1 May St., Bilajari settlement, Binagadi district, Baku',
  },
  workingHours: {},
  social: { tapaz: 'https://tap.az/shops/zamanli_makina' },
  seoDefaults: {
    titleSuffix: 'Zamanlı Makina',
    description: {
      az: 'Zamanlı Makina — generatorların satışı, icarəsi və ehtiyat hissələri. Perkins, Cummins, Baudouin, Volvo Penta və digər istehsalçıların həlləri.',
      ru: 'Zamanlı Makina — продажа и аренда генераторов, запчасти. Решения Perkins, Cummins, Baudouin, Volvo Penta и других производителей.',
      en: 'Zamanlı Makina — generator sales, rental and spare parts. Solutions from Perkins, Cummins, Baudouin, Volvo Penta and other manufacturers.',
    },
  },
  languages: { default: 'az', enabled: ['az', 'ru', 'en'] },
})

const sid = (k: string) => demoId(`content:${k}`)

/**
 * The three facts shown under the hero. They are the brand book's own statements (20–16000 kVA range, 24/7 service,
 * 5-year official warranty) — nothing is added. Editable in Admin → Sayt məzmunu.
 */
export const defaultHeroFacts = (): HeroFact[] => [
  {
    id: demoId('content:fact-range'),
    label: { az: 'kVA aralığı', ru: 'диапазон кВА', en: 'kVA range' },
    value: { az: '20–16000', ru: '20–16000', en: '20–16000' },
  },
  {
    id: demoId('content:fact-service'),
    label: { az: 'Texniki dəstək', ru: 'Техподдержка', en: 'Technical support' },
    value: { az: '24/7', ru: '24/7', en: '24/7' },
  },
  {
    id: demoId('content:fact-warranty'),
    label: { az: 'Rəsmi zəmanət', ru: 'Официальная гарантия', en: 'Official warranty' },
    value: { az: '5 il', ru: '5 лет', en: '5 years' },
  },
]

export const defaultContent = (): SiteContent => ({
  hero: {
    facts: defaultHeroFacts(),
    eyebrow: { az: 'Generator və ehtiyat hissələri', ru: 'Генераторы и запчасти', en: 'Generators & spare parts' },
    title: {
      az: 'Etibarlı enerji. Dayanıqlı gələcək.',
      ru: 'Надёжная энергия. Устойчивое будущее.',
      en: 'Reliable power. Resilient future.',
    },
    text: {
      az: 'İşinizin fasiləsiz davam etməsi üçün peşəkar generator həlləri və ehtiyat hissələri.',
      ru: 'Профессиональные решения на базе генераторов и запчасти для бесперебойной работы вашего бизнеса.',
      en: 'Professional generator solutions and spare parts to keep your operation running without interruption.',
    },
  },
  about: {
    title: {
      az: 'Fasiləsiz enerji üçün etibarlı tərəfdaş',
      ru: 'Надёжный партнёр для бесперебойной энергии',
      en: 'A reliable partner for uninterrupted power',
    },
    paragraphs: [
      {
        az: 'Zamanlı Makina sənaye müəssisələri, tikinti meydançaları və strateji obyektlər üçün fasiləsiz enerji təmin edən dizel generator həlləri brendidir.',
        ru: 'Zamanlı Makina — бренд решений на базе дизельных генераторов, обеспечивающих бесперебойное электроснабжение промышленных предприятий, строительных площадок и стратегических объектов.',
        en: 'Zamanlı Makina is a brand of diesel generator solutions that provide uninterrupted power for industrial facilities, construction sites and strategic sites.',
      },
      {
        az: 'Məhsul və xidmət spektri: 20 kVA – 16000 kVA dizel generatorların satışı, icarəsi və 24/7 servis xidməti.',
        ru: 'Спектр продуктов и услуг: продажа и аренда дизельных генераторов от 20 до 16000 кВА и сервис 24/7.',
        en: 'Our range: sale and rental of diesel generators from 20 kVA to 16000 kVA, plus 24/7 service.',
      },
    ],
  },
  services: [
    {
      id: sid('sales'),
      icon: 'generator',
      title: { az: 'Generator satışı', ru: 'Продажа генераторов', en: 'Generator sales' },
      text: {
        az: '20 kVA-dan 16000 kVA-dək dizel generatorların satışı. Güc, yanacaq və tətbiq sahəsinə uyğun seçim.',
        ru: 'Продажа дизельных генераторов от 20 до 16000 кВА. Подбор по мощности, топливу и области применения.',
        en: 'Diesel generators from 20 to 16000 kVA, selected for output, fuel and application.',
      },
    },
    {
      id: sid('rental'),
      icon: 'clock',
      title: { az: 'Generator icarəsi', ru: 'Аренда генераторов', en: 'Generator rental' },
      text: {
        az: 'Müvəqqəti obyektlər, tədbirlər və təcili ehtiyac üçün icarə həlləri.',
        ru: 'Решения для временных объектов, мероприятий и срочных потребностей.',
        en: 'Rental solutions for temporary sites, events and urgent needs.',
      },
    },
    {
      id: sid('service'),
      icon: 'wrench',
      title: { az: '24/7 servis', ru: 'Сервис 24/7', en: '24/7 service' },
      text: {
        az: 'Texniki xidmət, diaqnostika və təcili dəstək.',
        ru: 'Техническое обслуживание, диагностика и срочная поддержка.',
        en: 'Maintenance, diagnostics and urgent support.',
      },
    },
    {
      id: sid('parts'),
      icon: 'filter',
      title: { az: 'Ehtiyat hissələri', ru: 'Запчасти', en: 'Spare parts' },
      text: {
        az: 'Generatorunuza uyğun filtr, qayış, sensor və digər hissələrin təchizatı.',
        ru: 'Поставка фильтров, ремней, датчиков и других деталей, подходящих к вашему генератору.',
        en: 'Supply of filters, belts, sensors and other parts matching your generator.',
      },
    },
  ],
  faq: [
    {
      id: sid('faq-price'),
      question: { az: 'Qiyməti necə öyrənə bilərəm?', ru: 'Как узнать цену?', en: 'How can I find out the price?' },
      answer: {
        az: 'Hər məhsul səhifəsindəki WhatsApp düyməsi ilə sorğu göndərin — məhsulun adı və ünvanı mesaja avtomatik əlavə olunur. Qiymət məhsula görə dəyişə bilər və sorğu ilə təqdim olunur.',
        ru: 'Отправьте запрос кнопкой WhatsApp на странице товара — название и ссылка добавятся в сообщение автоматически. Цена зависит от товара и предоставляется по запросу.',
        en: 'Use the WhatsApp button on any product page — the product name and link are added to the message automatically. Prices vary by product and are provided on request.',
      },
    },
    {
      id: sid('faq-choose'),
      question: {
        az: 'Hansı güclü generator seçməliyəm?',
        ru: 'Генератор какой мощности мне выбрать?',
        en: 'What generator size should I choose?',
      },
      answer: {
        az: 'Seçim obyektin ümumi yükündən, işə salma cərəyanı olan avadanlıqlardan və iş rejimindən asılıdır. Məlumatları bizə göndərin — uyğun güc sinfini birlikdə müəyyən edək.',
        ru: 'Выбор зависит от общей нагрузки объекта, оборудования с высокими пусковыми токами и режима работы. Пришлите данные — вместе определим подходящий класс мощности.',
        en: 'It depends on the total site load, equipment with high starting currents and the duty cycle. Send us the details and we will size it together.',
      },
    },
    {
      id: sid('faq-parts'),
      question: {
        az: 'Ehtiyat hissəsinin generatora uyğunluğunu necə yoxlayım?',
        ru: 'Как проверить совместимость запчасти с генератором?',
        en: 'How do I check that a part fits my generator?',
      },
      answer: {
        az: 'Generatorun səhifəsində “Uyğun ehtiyat hissələri” bölməsinə baxın və ya ehtiyat hissələri kataloqunda generator modeli üzrə axtarın. Əmin deyilsinizsə, OEM kodu və ya model nömrəsi ilə bizə yazın.',
        ru: 'Посмотрите раздел «Совместимые запчасти» на странице генератора или найдите деталь по модели в каталоге запчастей. Если не уверены — напишите нам OEM-код или номер модели.',
        en: 'Check the “Compatible spare parts” section on the generator page, or search the parts catalogue by generator model. If unsure, message us the OEM code or model number.',
      },
    },
    {
      id: sid('faq-rental'),
      question: { az: 'Generator icarəsi mümkündür?', ru: 'Возможна ли аренда генератора?', en: 'Is generator rental available?' },
      answer: {
        az: 'Bəli, icarə xidməti təklif olunur. Müddət və güc tələbinizi bildirin.',
        ru: 'Да, услуга аренды предоставляется. Сообщите срок и необходимую мощность.',
        en: 'Yes, rental is offered. Tell us the duration and the output you need.',
      },
    },
  ],
  footerText: {
    az: 'Etibarlı enerji həlləri və güclü performans. Generator və ehtiyat hissələri.',
    ru: 'Надёжные энергетические решения и высокая производительность. Генераторы и запчасти.',
    en: 'Reliable power solutions and strong performance. Generators and spare parts.',
  },
  contactIntro: {
    az: 'Sualınız, sorğunuz və ya texniki məsləhət üçün bizimlə əlaqə saxlayın.',
    ru: 'Свяжитесь с нами по вопросам, запросам или за технической консультацией.',
    en: 'Contact us for questions, inquiries or technical advice.',
  },
})
