import type { CSSProperties, ReactNode } from 'react'
import { Download, Mail, MapPin, Phone, Play } from 'lucide-react'
import { jaggedCellClip } from '@/lib/jagged'
import BioModal from './BioModal'

const IMG = '/images/processed'
const PHOTO = '/images'

type CellProps = {
  /** desktop grid-column, e.g. "1 / 8" */
  c: string
  /** desktop grid-row, e.g. "1 / 7" */
  r: string
  seed: number
  className?: string
  children?: ReactNode
}

function Cell({
  c,
  r,
  seed,
  className = '',
  texture = false,
  children,
}: CellProps & { texture?: boolean }) {
  const clip = jaggedCellClip(seed)
  const style: CSSProperties = {
    ['--c' as string]: c,
    ['--r' as string]: r,
    ['--cm' as string]: 'span 2',
    clipPath: clip,
    WebkitClipPath: clip,
  }
  return (
    <div
      className={`epk-cell relative overflow-hidden ${className}`}
      style={style}
    >
      {texture && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 bg-repeat opacity-[0.20] mix-blend-multiply [filter:grayscale(1)_invert(1)_contrast(1.15)_brightness(1.05)]"
            style={{
              backgroundImage: `url(${IMG}/dusty-black-grain-texture.webp)`,
              backgroundSize: '340px',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 bg-repeat opacity-[0.15] mix-blend-multiply [filter:grayscale(1)_contrast(1.1)]"
            style={{
              backgroundImage: `url(${IMG}/film-grain-overlay-static.webp)`,
              backgroundSize: '480px',
            }}
          />
        </>
      )}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  )
}

function Photo({
  c,
  r,
  seed,
  src,
  alt,
}: {
  c: string
  r: string
  seed: number
  src: string
  alt: string
}) {
  return (
    <Cell c={c} r={r} seed={seed} className="min-h-[220px] bg-black">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover [filter:grayscale(0.35)_contrast(1.05)]"
      />
    </Cell>
  )
}

function VideoThumb({ title }: { title: string }) {
  return (
    <div className="aspect-video flex flex-1 flex-col gap-3">
      <div className="relative flex flex-1 items-center justify-center bg-black">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-repeat opacity-30 [filter:grayscale(1)]"
          style={{
            backgroundImage: `url(${IMG}/dusty-black-grain-texture.webp)`,
            backgroundSize: '220px',
          }}
        />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--accent))]">
          <Play className="ml-1 h-7 w-7 text-black" fill="black" />
        </span>
      </div>
      <div className="font-aboreto text-base font-bold tracking-[0.2em] text-black">
        {title}
      </div>
    </div>
  )
}

// Placeholder styled to read as an embedded Spotify playlist player.
function SpotifyPlaceholder() {
  const tracks = [
    "I Don't Care",
    'Little White Pills',
    'Take',
    'New Crashed Car',
    'Plug Me In',
  ]
  return (
    <div className="flex h-full min-h-[240px] flex-col gap-4 rounded-xl bg-[#121212] p-5 text-white">
      <div className="flex items-center gap-4">
        <img
          src="/images/processed/wgam-front-cover.webp"
          className="flex h-16 w-16"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold">Discography</div>
          <div className="text-sm text-white/60">Who&apos;s Got a Match?</div>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent))]">
          <Play className="ml-0.5 h-6 w-6 text-black" fill="black" />
        </span>
      </div>
      <ul className="flex flex-1 flex-col justify-center divide-y divide-white/10 text-sm">
        {tracks.map((t, i) => (
          <li key={t} className="flex items-center gap-3 py-2">
            <span className="w-4 text-right text-white/40">{i + 1}</span>
            <span className="flex-1 truncate">{t}</span>
            <span className="text-white/30">3:2{i}</span>
          </li>
        ))}
      </ul>
      <div className="text-xs font-bold tracking-[0.2em] text-[#1DB954]">
        PLACEHOLDER · SPOTIFY EMBED
      </div>
    </div>
  )
}

export default function EpkGrid() {
  return (
    <section className="relative bg-white">
      {/* Brick grid. Black container = black jagged dividers between white cells.
          Desktop placement is fully explicit via --c / --r, so DOM order only
          affects the single-column mobile stack. The cells are ordered here so
          content and photos ALTERNATE on mobile. */}
      <div className="epk-grid relative z-10 w-full min-h-screen bg-black p-[5px]">
        {/* Header (desktop row 1, image left) */}
        <Cell
          c="6 / 13"
          r="1 / 7"
          seed={11}
          texture
          className="bg-white p-8 sm:p-12"
        >
          <div className="flex h-full flex-col justify-between gap-8">
            <h1 className="font-manufacturing text-6xl leading-[0.88] text-black sm:text-7xl md:text-8xl lg:text-9xl">
              Who&apos;s Got a Match?
            </h1>
            <div className="flex items-center gap-4">
              <span className="h-3 w-3 rounded-full bg-[hsl(var(--accent))]" />
              <span className="font-aboreto text-lg font-bold tracking-[0.35em] text-black sm:text-xl">
                ELECTRONIC PRESS KIT
              </span>
            </div>
          </div>
        </Cell>

        <Photo
          c="1 / 6"
          r="1 / 7"
          seed={22}
          src={`${PHOTO}/band.JPG`}
          alt="Band promo photo"
        />

        {/* Bio (desktop row 2, image right) */}
        <Cell
          c="1 / 8"
          r="7 / 13"
          seed={44}
          texture
          className="bg-white p-8 sm:p-12"
        >
          <div className="flex h-full flex-col justify-between gap-6">
            <p className="font-aboreto text-xl leading-relaxed text-black sm:text-2xl">
              Who&apos;s Got a Match is a three-piece band, perhaps the best in
              the world. They make music, it is really good and will completely
              blow you away. They are know for their guitar, bass, drums, and
              vocals. Their debut album was phenominal. Everyone loved it. Many
              people spoke about it. They will release more music. So that's
              good.
            </p>
            <BioModal />
          </div>
        </Cell>

        <Photo
          c="8 / 13"
          r="7 / 13"
          seed={33}
          src={`${PHOTO}/band-7.JPG`}
          alt="Band promo photo"
        />

        {/* Stage plot & tech rider (desktop row 3, image left) */}
        <Cell
          c="6 / 13"
          r="13 / 16"
          seed={77}
          texture
          className="bg-white p-8 sm:p-10"
        >
          <div className="font-aboreto text-sm font-bold tracking-[0.35em] text-black/50">
            STAGE PLOT &amp; TECH RIDER
          </div>
          <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
            <p className="flex-1 text-base leading-relaxed text-black/70 sm:text-lg">
              3-piece: guitar/lead vox, bass/backing vox, and drums. 12 inputs,
              2 monitor mixes, Full input list and stage layout in the
              downloads.
            </p>
            <div className="flex flex-1 flex-col gap-3">
              <a
                href="#"
                className="flex items-center justify-between border-2 border-black/15 px-4 py-3 text-sm font-bold tracking-[0.15em] text-black"
              >
                STAGE PLOT.PDF <Download className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="flex items-center justify-between border-2 border-black/15 px-4 py-3 text-sm font-bold tracking-[0.15em] text-black"
              >
                TECH RIDER.PDF <Download className="h-5 w-5" />
              </a>
            </div>
          </div>
        </Cell>

        <Photo
          c="1 / 6"
          r="13 / 19"
          seed={88}
          src={`${PHOTO}/band-6.JPG`}
          alt="Band promo photo"
        />

        {/* Contact (desktop row 3, image left) */}
        <Cell
          c="6 / 13"
          r="16 / 19"
          seed={66}
          texture
          className="bg-white p-8 sm:p-10"
        >
          <div className="font-aboreto text-sm font-bold tracking-[0.35em] text-black/50">
            CONTACT
          </div>
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="text-xs font-bold tracking-[0.2em] text-black/40">
                BOOKING
              </div>
              <a
                href="mailto:booking@whosgotamatch.com"
                className="mt-1 flex items-center gap-2 text-lg font-semibold text-black"
              >
                <Mail className="h-5 w-5" /> booking@whosgotamatch.com
              </a>
            </div>
            <div>
              <div className="text-xs font-bold tracking-[0.2em] text-black/40">
                MANAGEMENT
              </div>
              <a
                href="mailto:mgmt@whosgotamatch.com"
                className="mt-1 flex items-center gap-2 text-lg font-semibold text-black"
              >
                <Mail className="h-5 w-5" /> mgmt@whosgotamatch.com
              </a>
            </div>
            <div className="flex items-center gap-2 text-lg font-semibold text-black/70">
              <Phone className="h-5 w-5" /> (555) 018-2049
            </div>
            <div className="flex items-center gap-2 text-lg font-semibold text-black/70">
              <MapPin className="h-5 w-5" /> New York City, NY
            </div>
          </div>
        </Cell>

        <Photo
          c="8 / 13"
          r="19 / 25"
          seed={178}
          src={`${PHOTO}/band-2.JPG`}
          alt="Band promo photo"
        />

        {/* Music videos (desktop row 4, image right) */}
        <Cell
          c="1 / 8"
          r="19 / 22"
          seed={101}
          texture
          className="bg-white p-8 sm:p-10"
        >
          <div className="font-aboreto text-sm font-bold tracking-[0.35em] text-black/50">
            MUSIC VIDEOS
          </div>
          <div className="mt-5 flex flex-col gap-6 sm:flex-row">
            <VideoThumb title="TAKE" />
            <VideoThumb title="LITTLE WHITE PILLS (LIVE)" />
          </div>
        </Cell>

        <Photo
          c="1 / 6"
          r="25 / 31"
          seed={57}
          src={`${PHOTO}/band-3.JPG`}
          alt="Band promo photo"
        />

        {/* Press (desktop row 4, image right) */}
        <Cell
          c="1 / 8"
          r="22 / 25"
          seed={145}
          className="bg-[hsl(var(--accent))] p-8 sm:p-12"
        >
          <div className="flex h-full flex-col justify-between gap-8 text-white">
            <div className="font-aboreto text-sm font-bold tracking-[0.35em] text-white/70">
              PRESS
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <figure>
                <blockquote className="font-manufacturing text-3xl leading-tight sm:text-4xl">
                  &ldquo;A killer live band — they&apos;ll leave you
                  singed.&rdquo;
                </blockquote>
                <figcaption className="font-aboreto mt-3 text-sm font-bold tracking-[0.2em] text-white/80">
                  — PLACEHOLDER WEEKLY
                </figcaption>
              </figure>
              <figure>
                <blockquote className="font-manufacturing text-3xl leading-tight sm:text-4xl">
                  &ldquo;Pure, combustible catharsis.&rdquo;
                </blockquote>
                <figcaption className="font-aboreto mt-3 text-sm font-bold tracking-[0.2em] text-white/80">
                  — THE FILLER TIMES
                </figcaption>
              </figure>
            </div>
          </div>
        </Cell>

        {/* Discography (desktop row 5, image left) */}
        <Cell
          c="6 / 13"
          r="25 / 31"
          seed={191}
          texture
          className="bg-white p-8 sm:p-10"
        >
          <div className="flex h-full flex-col gap-5">
            <div className="font-aboreto text-sm font-bold tracking-[0.35em] text-black/50">
              DISCOGRAPHY
            </div>
            <div className="flex-1">
              <SpotifyPlaceholder />
            </div>
          </div>
        </Cell>
      </div>
    </section>
  )
}
