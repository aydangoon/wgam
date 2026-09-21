import type { CSSProperties, ReactNode } from 'react'
import { Images, Mail, MapPin, Phone } from 'lucide-react'
import { jaggedCellClip } from '@/lib/jagged'
import { BIO_EXCERPT, CONTACT, PHOTOS, PRESS_QUOTE } from '@/lib/epk/content'
import BioModal from './BioModal'
import MusicPlayer from './MusicPlayer'
import MusicVideo from './MusicVideo'
import PhotoCarousel from './PhotoCarousel'

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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="font-aboreto text-sm font-bold tracking-[0.35em] text-black/50">
      {children}
    </div>
  )
}

export default function EpkGrid() {
  return (
    <section className="relative bg-white">
      {/* Brick grid. Black container = black jagged dividers between white cells.
          Desktop placement is fully explicit via --c / --r, so DOM order only
          affects the single-column mobile stack. The cells are ordered here so
          content and photos ALTERNATE on mobile:
          title, bio, music, music video, press quote, contact. */}
      <div className="epk-grid relative z-10 w-full min-h-screen bg-black p-[5px]">
        {/* Title (desktop band 1, image left) */}
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

        {/* Bio (desktop band 2, image right) */}
        <Cell
          c="1 / 8"
          r="7 / 13"
          seed={44}
          texture
          className="bg-white p-8 sm:p-12"
        >
          <div className="flex h-full flex-col justify-between gap-6">
            <p className="font-aboreto text-xl leading-relaxed text-black sm:text-2xl lg:text-[1.8rem] lg:leading-[1.45]">
              {BIO_EXCERPT}
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

        {/* Music (desktop band 3, image left) */}
        <Cell
          c="6 / 13"
          r="13 / 20"
          seed={191}
          texture
          className="bg-white p-8 sm:p-10"
        >
          <div className="flex h-full flex-col gap-5">
            <SectionLabel>MUSIC</SectionLabel>
            <div className="flex-1">
              <MusicPlayer />
            </div>
          </div>
        </Cell>

        <Photo
          c="1 / 6"
          r="13 / 20"
          seed={88}
          src={`${PHOTO}/band-6.JPG`}
          alt="Band promo photo"
        />

        {/* Music video (desktop band 4, image right) */}
        <Cell
          c="1 / 8"
          r="20 / 26"
          seed={101}
          texture
          className="bg-white p-8 sm:p-10"
        >
          <div className="flex h-full flex-col gap-5">
            <div className="font-aboreto text-center text-sm font-bold tracking-[0.35em] text-black">
              MUSIC VIDEO
            </div>
            <MusicVideo />
          </div>
        </Cell>

        <Photo
          c="8 / 13"
          r="20 / 26"
          seed={178}
          src={`${PHOTO}/band-2.JPG`}
          alt="Band promo photo"
        />

        {/* Press quote (desktop band 5 top, image left spans both) */}
        <Cell
          c="6 / 13"
          r="26 / 30"
          seed={145}
          className="bg-[hsl(var(--accent))] p-8 sm:p-12"
        >
          <div className="flex h-full flex-col justify-between gap-8 text-white">
            <div className="font-aboreto text-sm font-bold tracking-[0.35em] text-white/70">
              PRESS
            </div>
            <figure>
              <blockquote className="font-manufacturing text-4xl leading-tight sm:text-5xl md:text-6xl">
                &ldquo;{PRESS_QUOTE.text}&rdquo;
              </blockquote>
              <figcaption className="font-aboreto mt-5 text-sm font-bold tracking-[0.2em] text-white/80">
                — {PRESS_QUOTE.author.toUpperCase()}, {PRESS_QUOTE.role.toUpperCase()}
              </figcaption>
            </figure>
          </div>
        </Cell>

        <Photo
          c="1 / 6"
          r="26 / 33"
          seed={57}
          src={`${PHOTO}/band-3.JPG`}
          alt="Band promo photo"
        />

        {/* Contact + high-res photos (desktop band 5 bottom) */}
        <Cell
          c="6 / 13"
          r="30 / 33"
          seed={66}
          texture
          className="bg-white p-8 sm:p-10"
        >
          <SectionLabel>CONTACT</SectionLabel>
          <div className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-3">
              <a
                href={`mailto:${CONTACT.email}`}
                className="flex items-center gap-3 text-lg font-semibold text-black transition-colors hover:text-[hsl(var(--accent))] sm:text-xl"
              >
                <Mail className="h-5 w-5 shrink-0" /> {CONTACT.email}
              </a>
              <a
                href={CONTACT.phoneHref}
                className="flex items-center gap-3 text-lg font-semibold text-black/70 transition-colors hover:text-[hsl(var(--accent))]"
              >
                <Phone className="h-5 w-5 shrink-0" /> {CONTACT.phoneDisplay}
              </a>
              <div className="flex items-center gap-3 text-lg font-semibold text-black/70">
                <MapPin className="h-5 w-5 shrink-0" /> {CONTACT.location}
              </div>
            </div>

            <PhotoCarousel>
              <button
                type="button"
                className="flex items-center gap-4 self-start border-2 border-black/15 px-5 py-3 text-left transition-colors hover:border-black"
              >
                <Images className="h-7 w-7 shrink-0" strokeWidth={1.6} />
                <span className="flex flex-col">
                  <span className="font-aboreto text-sm font-bold tracking-[0.2em] text-black">
                    HIGH-RES PHOTOS
                  </span>
                  <span className="text-xs text-black/50">
                    {PHOTOS.length} press photos · view &amp; download originals
                  </span>
                </span>
              </button>
            </PhotoCarousel>
          </div>
        </Cell>
      </div>
    </section>
  )
}
