import type { LText } from './types.ts'

export interface SpecPreset {
  key: string
  group: 'general' | 'power' | 'engine' | 'fuel' | 'cooling' | 'dimensions' | 'other'
  label: LText
  unit?: string
}

const L = (az: string, ru: string, en: string): LText => ({ az, ru, en })

export const SPEC_GROUP_TITLES: Record<SpecPreset['group'], LText> = {
  general: L('Ümumi', 'Общие', 'General'),
  power: L('Güc', 'Мощность', 'Power'),
  engine: L('Mühərrik', 'Двигатель', 'Engine'),
  fuel: L('Yanacaq', 'Топливо', 'Fuel'),
  cooling: L('Soyutma', 'Охлаждение', 'Cooling'),
  dimensions: L('Ölçülər', 'Габариты', 'Dimensions'),
  other: L('Digər', 'Прочее', 'Other'),
}

/** Preset spec fields offered by the admin panel; custom fields are always allowed too. */
export const SPEC_PRESETS: SpecPreset[] = [
  { key: 'manufacturer', group: 'general', label: L('İstehsalçı', 'Производитель', 'Manufacturer') },
  { key: 'model', group: 'general', label: L('Model', 'Модель', 'Model') },
  { key: 'generatorType', group: 'general', label: L('Generator tipi', 'Тип генератора', 'Generator type') },
  { key: 'frequency', group: 'general', label: L('Tezlik', 'Частота', 'Frequency'), unit: 'Hz' },
  { key: 'voltage', group: 'general', label: L('Gərginlik', 'Напряжение', 'Voltage'), unit: 'V' },
  { key: 'phase', group: 'general', label: L('Faza', 'Фазность', 'Phase') },

  { key: 'primePower', group: 'power', label: L('Əsas güc (prime)', 'Основная мощность (prime)', 'Prime power'), unit: 'kVA' },
  { key: 'standbyPower', group: 'power', label: L('Ehtiyat güc (standby)', 'Резервная мощность (standby)', 'Standby power'), unit: 'kVA' },
  { key: 'powerFactor', group: 'power', label: L('Güc əmsalı', 'Коэффициент мощности', 'Power factor'), unit: 'cos φ' },

  { key: 'engineManufacturer', group: 'engine', label: L('Mühərrik istehsalçısı', 'Производитель двигателя', 'Engine manufacturer') },
  { key: 'engineModel', group: 'engine', label: L('Mühərrik modeli', 'Модель двигателя', 'Engine model') },
  { key: 'cylinders', group: 'engine', label: L('Silindr sayı', 'Количество цилиндров', 'Number of cylinders') },
  { key: 'engineSpeed', group: 'engine', label: L('Mühərrik sürəti', 'Частота вращения', 'Engine speed'), unit: 'RPM' },
  { key: 'fuelConsumption', group: 'engine', label: L('Yanacaq sərfi (75% yük)', 'Расход топлива (75% нагрузки)', 'Fuel consumption (75% load)'), unit: 'L/h' },

  { key: 'fuelType', group: 'fuel', label: L('Yanacaq növü', 'Тип топлива', 'Fuel type') },
  { key: 'tankCapacity', group: 'fuel', label: L('Çən həcmi', 'Объём бака', 'Tank capacity'), unit: 'L' },
  { key: 'operatingTime', group: 'fuel', label: L('İş müddəti (75% yük)', 'Время работы (75% нагрузки)', 'Operating time (75% load)'), unit: 'h' },

  { key: 'coolingSystem', group: 'cooling', label: L('Soyutma sistemi', 'Система охлаждения', 'Cooling system') },
  { key: 'coolingCapacity', group: 'cooling', label: L('Soyuducu maye həcmi', 'Объём охлаждающей жидкости', 'Coolant capacity'), unit: 'L' },

  { key: 'length', group: 'dimensions', label: L('Uzunluq', 'Длина', 'Length'), unit: 'mm' },
  { key: 'width', group: 'dimensions', label: L('En', 'Ширина', 'Width'), unit: 'mm' },
  { key: 'height', group: 'dimensions', label: L('Hündürlük', 'Высота', 'Height'), unit: 'mm' },
  { key: 'weight', group: 'dimensions', label: L('Çəki', 'Масса', 'Weight'), unit: 'kg' },

  { key: 'noiseLevel', group: 'other', label: L('Səs səviyyəsi (7 m)', 'Уровень шума (7 м)', 'Noise level (7 m)'), unit: 'dB(A)' },
  { key: 'alternator', group: 'other', label: L('Alternator', 'Альтернатор', 'Alternator') },
  { key: 'controlPanel', group: 'other', label: L('İdarəetmə paneli', 'Панель управления', 'Control panel') },
  { key: 'startingSystem', group: 'other', label: L('Start sistemi', 'Система пуска', 'Starting system') },
  { key: 'warranty', group: 'other', label: L('Zəmanət', 'Гарантия', 'Warranty') },
]

export const SPEC_PRESET_BY_KEY: Record<string, SpecPreset> = Object.fromEntries(
  SPEC_PRESETS.map((p) => [p.key, p]),
)
