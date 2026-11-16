import { IconBolt } from './Icons'
import './Marquee.css'

const words = ['GÜC', 'ETİBAR', 'DAVAMLILIQ', 'ENERJİ', 'PERFORMANS', 'TEZLİKLƏ']

/** Dekorativ sürüşən zolaq — ekran oxuyucular üçün gizlədilir. */
export function Marquee() {
  const row = (key: string) => (
    <ul className="marquee__row" key={key}>
      {words.map((w) => (
        <li key={w}>
          <span>{w}</span>
          <IconBolt />
        </li>
      ))}
    </ul>
  )

  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {row('a')}
        {row('b')}
      </div>
    </div>
  )
}
