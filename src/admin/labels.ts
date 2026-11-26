import type { Availability, CoolingSystem, FuelType, GeneratorType } from '../data/types.ts'

export const AVAIL_LABEL: Record<Availability, string> = {
  in_stock: 'Stokda',
  on_order: 'Sifarişlə',
  out_of_stock: 'Stokda yoxdur',
  coming_soon: 'Tezliklə',
}
export const AVAIL_TONE: Record<Availability, 'ok' | 'warn' | 'off' | 'info'> = {
  in_stock: 'ok',
  on_order: 'warn',
  out_of_stock: 'off',
  coming_soon: 'info',
}
export const GTYPE_LABEL: Record<GeneratorType, string> = {
  open: 'Açıq çərçivə',
  canopy: 'Səssiz (canopy)',
  container: 'Konteyner tipli',
  trailer: 'Mobil (treyler)',
}
export const FUEL_LABEL: Record<FuelType, string> = { diesel: 'Dizel', gas: 'Qaz', petrol: 'Benzin', dual: 'İkili yanacaq' }
export const COOLING_LABEL: Record<CoolingSystem, string> = { water: 'Maye soyutma', air: 'Hava soyutma' }

export const opts = <T extends string>(m: Record<T, string>) =>
  (Object.keys(m) as T[]).map((value) => ({ value, label: m[value] }))
