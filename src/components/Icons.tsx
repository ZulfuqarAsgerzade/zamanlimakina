import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base: IconProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

export const IconArrow = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export const IconBolt = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" />
  </svg>
)

export const IconGenerator = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="2.5" y="7" width="19" height="11" rx="1.5" />
    <path d="M6 18v2M18 18v2M7 7V4.5h3V7M13.5 11.2 11.5 14h2.2l-1 2.2" />
    <path d="M16 10.5h3" />
  </svg>
)

export const IconShield = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3 4.5 6v5.5c0 4.5 3 7.7 7.5 9.5 4.5-1.8 7.5-5 7.5-9.5V6z" />
    <path d="m8.8 12.2 2.3 2.3 4.2-4.6" />
  </svg>
)

export const IconHandshake = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m3 11 4-4 4 1.5L14 7l4 2 3 2" />
    <path d="m3 11 5.5 5.5a1.7 1.7 0 0 0 2.4 0l.4-.4M11.3 16.1l1.2 1.2a1.7 1.7 0 0 0 2.4 0l.2-.2M14.7 14.4l1.4 1.4a1.7 1.7 0 0 0 2.4 0L21 13.3" />
    <path d="M7 7v0M18 9" />
  </svg>
)

export const IconPhone = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 4h3.5l1.7 4.2-2.2 1.4a11 11 0 0 0 5.4 5.4l1.4-2.2L19 14.5V18a2 2 0 0 1-2 2A13 13 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </svg>
)

export const IconMail = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 7 8.5 6.5L20.5 7" />
  </svg>
)

export const IconWhatsApp = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3.5 20.5 5 16A8.5 8.5 0 1 1 8.2 19z" />
    <path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8a4.6 4.6 0 0 1-2.2-2.2l.8-1-1-2z" />
  </svg>
)

export const IconInstagram = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r=".6" fill="currentColor" />
  </svg>
)

export const IconPin = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 21s7-5.7 7-11.2A7 7 0 0 0 5 9.8C5 15.300 12 21 12 21Z" />
    <circle cx="12" cy="9.8" r="2.4" />
  </svg>
)

export const IconMenu = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
)

export const IconClose = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
