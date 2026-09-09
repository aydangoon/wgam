export type LocationId =
  | 'map'
  | 'tents'
  | 'screen'
  | 'library'
  | 'alley'
  | 'scrapyard'
  | 'chapel'
  | 'venue'
  | 'fire'

export type FlagKey =
  | 'seenFlyer'
  | 'tuned2071'
  | 'readDoctrine'
  | 'hasMatchbook'
  | 'knowsMatch'
  | 'chapelFound'
  | 'venueUnlocked'
  | 'rabbitBlink'
  | 'glyphUnlocked'

export type Flags = Record<FlagKey, boolean>

export const FLAG_KEYS: FlagKey[] = [
  'seenFlyer',
  'tuned2071',
  'readDoctrine',
  'hasMatchbook',
  'knowsMatch',
  'chapelFound',
  'venueUnlocked',
  'rabbitBlink',
  'glyphUnlocked',
]

export const EMPTY_FLAGS: Flags = {
  seenFlyer: false,
  tuned2071: false,
  readDoctrine: false,
  hasMatchbook: false,
  knowsMatch: false,
  chapelFound: false,
  venueUnlocked: false,
  rabbitBlink: false,
  glyphUnlocked: false,
}

export const LOCATION_IDS: LocationId[] = [
  'map',
  'tents',
  'screen',
  'library',
  'alley',
  'scrapyard',
  'chapel',
  'venue',
  'fire',
]

export type PuzzleId = 'crt' | 'password' | 'trace' | 'strike'

export type HotspotAction =
  | { type: 'go'; to: LocationId }
  | { type: 'inspect'; text: string }
  | { type: 'flag'; flag: FlagKey; text?: string }
  | { type: 'puzzle'; puzzle: PuzzleId }
  | { type: 'rabbit' }
  | { type: 'footage'; n: number }
  | { type: 'invert' }

export type Hotspot = {
  id: string
  x: number
  y: number
  w: number
  h: number
  src?: string
  z?: number
  opacity?: number
  rotate?: number
  tiltX?: number
  flipX?: boolean
  filter?: string
  label?: string
  labelAt?: 'bottom' | 'top' | 'left' | 'right'
  spin?: boolean
  className?: string
  remountKey?: string | number
  fit?: 'contain' | 'cover'
  behind?: boolean
  /** Fill a punched hole in this sprite. x/y/w/h are % of the image. */
  screen?: { src: string; x: number; y: number; w: number; h: number }
  visible?: (flags: Flags) => boolean
  action?: HotspotAction
  /** Optional SFX id (`click`, `fabric`, `paper`, …). Overrides id-based mapping. */
  sfx?: string
}

export type Scene = {
  id: LocationId
  title: string
  hint?: string
  bg?: string
  hotspots: Hotspot[]
}

export const CUT = '/images/world/cut'
export const BGS = '/images/world/cut/bgs'
export const PROC = '/images/processed'

export function cut(name: string) {
  return `${CUT}/${name}.webp`
}

export function bg(name: string) {
  return `${BGS}/${name}.webp`
}

export function pathFor(id: LocationId) {
  return id === 'map' ? '/world' : `/world/${id}`
}

export function idFromPath(pathname: string): LocationId {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean)
  const slug = parts[1]
  if (!slug) return 'map'
  if (slug === 'car') return 'scrapyard'
  return (LOCATION_IDS as string[]).includes(slug) ? (slug as LocationId) : 'map'
}

export const TITLES: Record<LocationId, string> = {
  map: 'THE WASTED CITY',
  tents: 'TENT CITY',
  screen: 'THE SCREEN',
  library: 'THE LIBRARY',
  alley: 'DEAD CHANNEL',
  scrapyard: 'THE SCRAPYARD',
  chapel: 'SPIRAL CHAPEL',
  venue: 'THE VENUE',
  fire: 'THE FIRE',
}

export function describeHotspot(hotspot: Hotspot): string {
  const a = hotspot.action
  const id = hotspot.label || hotspot.id
  if (!a) return `${id}\n(no action)`
  switch (a.type) {
    case 'go':
      return `${id}\ngo → ${TITLES[a.to]}`
    case 'inspect':
      return `${id}\ninspect: “${a.text}”`
    case 'flag':
      return `${id}\nset flag “${a.flag}”${a.text ? `\nthen inspect: “${a.text}”` : ''}`
    case 'puzzle':
      return `${id}\nopen puzzle: ${a.puzzle}`
    case 'rabbit':
      return `${id}\neaster egg — click 3× for rabbit mask`
    case 'footage':
      return `${id}\nplay found footage ${a.n}`
    case 'invert':
      return `${id}\ninvert the chapel`
  }
}
