import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const mk = (d: string) =>
  function Icon(p: P) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...p}
      >
        <path d={d} />
      </svg>
    )
  }

export const IcDashboard = mk('M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z')
export const IcFactory = mk('M3 21V9l6 4V9l6 4V5h6v16zM7 17h2M12 17h2M17 17h2')
export const IcGenerator = mk('M3 7h18v11H3zM7 18v2M17 18v2M8 7V4h3v3M13 10l-2 3h3l-2 3')
export const IcGear = mk('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z')
export const IcTag = mk('M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01')
export const IcImage = mk('M3 5h18v14H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 16l-5-5-8 8')
export const IcDoc = mk('M14 3H6v18h12V7zM14 3v4h4M9 12h6M9 16h6')
export const IcCog = mk('M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0M14 4v4M6 10v4M16 16v4')
export const IcMail = mk('M3 5h18v14H3zM3 7l9 6 9-6')
export const IcUser = mk('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0')
export const IcMenu = mk('M4 6h16M4 12h16M4 18h16')
export const IcClose = mk('M6 6l12 12M18 6 6 18')
export const IcPlus = mk('M12 5v14M5 12h14')
export const IcTrash = mk('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3')
export const IcEdit = mk('M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4')
export const IcUp = mk('M6 15l6-6 6 6')
export const IcDown = mk('M6 9l6 6 6-6')
export const IcDrag = mk('M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01')
export const IcSearch = mk('M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5')
export const IcCheck = mk('M5 12l5 5 9-10')
export const IcAlert = mk('M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z')
export const IcLogout = mk('M9 21H5V3h4M16 17l5-5-5-5M21 12H9')
export const IcStar = mk('M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z')
export const IcUpload = mk('M12 16V4M7 9l5-5 5 5M4 20h16')
export const IcExternal = mk('M14 4h6v6M20 4l-9 9M18 14v6H4V6h6')
