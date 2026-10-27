// Central place to edit external links. Replace the placeholder URLs below.
export const LINKS = {
  listenNow: '#',
  tiktok: 'https://www.tiktok.com/@whosgotamatchband',
  youtube: 'https://www.youtube.com/@Whosgotamatchband',
  spotify: 'https://open.spotify.com/',
  instagram: 'https://www.instagram.com/whosgotamatchband',
  email: 'mailto:whosgotamatchband@gmail.com',
}

/** Bottom-bar social icons. Email always shows beside them. */
export const SHOW_SOCIALS = true

export const NAV_TABS: Array<{
  label: string
  href?: string
  /** Tab is visible but shows a COMING SOON toast instead of navigating. */
  comingSoon?: boolean
}> = [
  { label: 'HOME', href: '/' },
  { label: 'MUSIC', href: '/music', comingSoon: true },
  { label: 'VIDEOS', href: '/videos', comingSoon: true },
  { label: 'EPK', href: '/epk' },
]
