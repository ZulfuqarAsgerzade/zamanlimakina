import type { ReactNode, SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = (children: ReactNode, p: P, fill = false) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill={fill ? 'currentColor' : 'none'}
    stroke={fill ? 'none' : 'currentColor'}
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...p}
  >
    {children}
  </svg>
)

export const IconArrow = (p: P) => base(<path d="M5 12h14M13 6l6 6-6 6" />, { className: 'arrow', ...p })
export const IconChevron = (p: P) => base(<path d="m6 9 6 6 6-6" />, p)
export const IconChevronLeft = (p: P) => base(<path d="m15 18-6-6 6-6" />, p)
export const IconChevronRight = (p: P) => base(<path d="m9 18 6-6-6-6" />, p)
export const IconSearch = (p: P) => base(<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>, p)
export const IconMenu = (p: P) => base(<path d="M4 7h16M4 12h16M4 17h16" />, p)
export const IconClose = (p: P) => base(<path d="M6 6l12 12M18 6 6 18" />, p)
export const IconFilter = (p: P) => base(<path d="M4 6h16M7 12h10M10 18h4" />, p)
export const IconExpand = (p: P) => base(<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />, p)
export const IconCheck = (p: P) => base(<path d="m5 12.5 4.5 4.5L19 7.5" />, p)
export const IconPhone = (p: P) => base(<path d="M6.6 3.5h3l1.4 4-2 1.3a11 11 0 0 0 5.2 5.2l1.3-2 4 1.4v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.6 5.7 2 2 0 0 1 6.6 3.5Z" />, p)
export const IconMail = (p: P) => base(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>, p)
export const IconPin = (p: P) => base(<><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>, p)
export const IconClock = (p: P) => base(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>, p)
export const IconBolt = (p: P) => base(<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" />, p)
export const IconWrench = (p: P) => base(<path d="M14.5 6.5a4 4 0 0 0-5.2 5.2L3.5 17.5a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.2-5.2l-2.6 2.6-2.2-.4-.4-2.2z" />, p)
export const IconShield = (p: P) => base(<><path d="M12 3 5 6v5.5c0 4.4 2.9 7.6 7 9.5 4.1-1.9 7-5.1 7-9.5V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></>, p)
export const IconGenerator = (p: P) => base(<><rect x="2.5" y="8" width="19" height="10" rx="1.5" /><path d="M6 18v2M18 18v2M7 8V5h3v3M12.8 11.2 11 14h2.2l-1 2.2" /></>, p)
export const IconFilterPart = (p: P) => base(<><rect x="6" y="5" width="12" height="14" rx="2" /><path d="M6 9h12M6 15h12M10 5v14M14 5v14" /></>, p)
export const IconCog = (p: P) => base(<><circle cx="12" cy="12" r="3" /><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" /></>, p)
export const IconGlobe = (p: P) => base(<><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.6 3.7 5.4 3.7 8.5s-1.2 5.9-3.7 8.5c-2.5-2.6-3.7-5.4-3.7-8.5S9.5 6.1 12 3.5Z" /></>, p)
export const IconPlus = (p: P) => base(<path d="M12 5v14M5 12h14" />, p)
export const IconMinus = (p: P) => base(<path d="M5 12h14" />, p)
export const IconInstagram = (p: P) => base(<><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="3.8" /><circle cx="17.2" cy="6.8" r=".6" fill="currentColor" /></>, p)
export const IconFacebook = (p: P) => base(<path d="M14 8.5h2.5V5H14a3.5 3.5 0 0 0-3.5 3.5V11H8v3.5h2.5V21H14v-6.5h2.4l.6-3.5H14V8.8c0-.2.1-.3.3-.3Z" />, p)
export const IconLinkedin = (p: P) => base(<><path d="M6.5 9.5V18M6.5 6v.01M10.5 18v-8.5M10.5 13c0-2 1.2-3.5 3.2-3.5s3.3 1.4 3.3 3.5V18" /></>, p)
export const IconYoutube = (p: P) => base(<><rect x="3" y="6" width="18" height="12" rx="3.5" /><path d="m10.5 9.5 4 2.5-4 2.5z" fill="currentColor" /></>, p)
export const IconTiktok = (p: P) => base(<path d="M14 4v10.2a3.2 3.2 0 1 1-3.2-3.2M14 4c.3 2.3 1.8 3.8 4 4" />, p)
export const IconTag = (p: P) => base(<><path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7a1 1 0 0 1 .7.3l7.3 7.3a1 1 0 0 1 0 1.4l-7.7 7.7a1 1 0 0 1-1.4 0l-7.3-7.3a1 1 0 0 1-.3-.7Z" /><circle cx="8" cy="8" r="1.2" /></>, p)

/** WhatsApp glyph (filled). */
export const IconWhatsApp = (p: P) =>
  base(
    <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.38A9.94 9.94 0 1 0 12.04 2Zm0 1.8a8.13 8.13 0 1 1-4.15 15.14l-.3-.18-3.1.82.83-3.02-.2-.31A8.12 8.12 0 0 1 12.04 3.8Zm-3.2 3.7c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.08 3.3 5.13 4.5 2.54 1 3.05.8 3.6.75.56-.05 1.8-.74 2.05-1.45.25-.7.25-1.31.18-1.44-.08-.12-.28-.2-.58-.35-.3-.15-1.8-.89-2.07-.99-.28-.1-.48-.15-.68.15-.2.3-.78.99-.96 1.19-.18.2-.35.22-.65.07-.3-.15-1.28-.47-2.43-1.5-.9-.8-1.5-1.79-1.68-2.09-.18-.3-.02-.46.13-.6.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.65-.92-2.25-.24-.57-.49-.5-.68-.5h-.58Z" />,
    p,
    true,
  )

const ICONS: Record<string, (p: P) => ReactNode> = {
  generator: IconGenerator,
  clock: IconClock,
  wrench: IconWrench,
  filter: IconFilterPart,
  shield: IconShield,
  bolt: IconBolt,
  cog: IconCog,
  globe: IconGlobe,
  tag: IconTag,
}
/** Icon by key (used by admin-editable service cards). */
export function IconByKey({ name, ...p }: { name: string } & P) {
  const C = ICONS[name] ?? IconBolt
  return <>{C(p)}</>
}
export const ICON_KEYS = Object.keys(ICONS)
