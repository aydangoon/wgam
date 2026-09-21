// Central place to edit external links. Replace the placeholder URLs below.
export const LINKS = {
  listenNow: '#',
  tiktok: 'https://www.tiktok.com/',
  spotify: 'https://open.spotify.com/',
  instagram: 'https://www.instagram.com/',
  email: 'mailto:whosgotamatchband@gmail.com',
}

/** Socials are hidden until the accounts are live; only the email icon shows. */
export const SHOW_SOCIALS = false

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
