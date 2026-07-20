import type { ReactNode } from 'react'
import Navbar from '@/components/Navbar'

const IMG = '/images/processed'

/**
 * Shared shell for the /music and /videos pages: white page with the same
 * dual grain texture as the EPK cells, the main-page navbar on top, and the
 * main-page end section as the footer.
 */
export function MediaShell({
  title,
  tagline,
  children,
}: {
  title: string
  tagline?: string
  children: ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-white text-black">
      <Navbar />

      <main className="relative overflow-hidden pb-32 pt-28 sm:pt-32">
        {/* Grain texture over the white background (same recipe as /epk) */}
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

        <div className="relative z-10 mx-auto max-w-6xl px-6 sm:px-10">
          <header className="text-center">
            <h1 className="font-manufacturing text-6xl leading-[0.88] text-black sm:text-7xl md:text-8xl">
              {title}
            </h1>
            {tagline && (
              <div className="mt-5 flex items-center justify-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--accent))]" />
                <span className="font-aboreto text-xs font-bold tracking-[0.35em] text-black/60 sm:text-sm">
                  {tagline}
                </span>
              </div>
            )}
          </header>

          <div className="mt-14 flex flex-col gap-14 sm:mt-16 sm:gap-16">
            {children}
          </div>
        </div>
      </main>

      {/* <EndSection /> */}
    </div>
  )
}

/**
 * One alternating row: splotch-backed media on one side, text on the other.
 * Rows alternate sides on desktop via `reverse`; on mobile everything stacks
 * and centers.
 */
export function MediaRow({
  reverse = false,
  splotch = 1,
  media,
  eyebrow,
  title,
  description,
  cta,
}: {
  reverse?: boolean
  /** which black splotch asset to use behind the media */
  splotch?: 1 | 2
  media: ReactNode
  eyebrow: string
  title: string
  description: string
  /** optional button rendered below the description */
  cta?: { label: string; href: string }
}) {
  return (
    <section
      className={`flex flex-col items-center gap-8 ${
        reverse ? 'md:flex-row-reverse' : 'md:flex-row'
      }`}
    >
      {/* media sitting on a black splotch */}
      <div className="flex w-full justify-center py-8 md:w-1/2 md:py-10">
        <div className="relative flex flex-col items-center">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[150%] w-[165%] -translate-x-1/2 -translate-y-1/2 bg-contain bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${IMG}/black-splotch-${splotch}.webp)`,
            }}
          />
          <div className="relative z-10 flex flex-col items-center">
            {media}
          </div>
        </div>
      </div>

      <div
        className={`w-full text-center md:w-1/2 ${
          reverse ? 'md:text-right' : 'md:text-left'
        }`}
      >
        <div className="font-aboreto text-xs font-bold tracking-[0.35em] text-black/50">
          {eyebrow}
        </div>
        <h2 className="font-manufacturing mt-2 text-4xl leading-[0.95] text-black sm:text-5xl">
          {title}
        </h2>
        <p className="font-aboreto mt-4 text-sm leading-relaxed text-black/70 sm:text-base">
          {description}
        </p>
        {cta && (
          <a
            href={cta.href}
            className="font-aboreto mt-5 inline-block rounded-sm bg-[hsl(var(--accent))] px-7 py-2.5 text-xs tracking-[0.25em] text-white transition-transform duration-200 hover:scale-[1.02] sm:text-sm"
          >
            {cta.label}
          </a>
        )}
      </div>
    </section>
  )
}
