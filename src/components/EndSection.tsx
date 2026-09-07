'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { JAGGED_AMP_PX, jaggedTopClip } from '@/lib/jagged'
import EndHeading from './EndHeading'

const IMG = '/images/processed'

// Full length of the engulf timeline (spiral grow + splotch burst).
// Must match the CSS animation timeline in globals.css.
const ENGULF_MS = 4500

// Shared jagged top edge (interlocks with the navbar's inverse bottom edge).
const JAGGED_TOP = jaggedTopClip()

// Only feather the very tips of the teeth so they read as a torn edge
// instead of dissolving into a flat line. Must stay well below the tooth height.
const TOP_FADE = `linear-gradient(to bottom, transparent 0%, black ${Math.round(
  JAGGED_AMP_PX * 0.6,
)}px)`

type Phase = 'idle' | 'engulf'

interface SpiralOrigin {
  left: number
  top: number
  size: number
  scale: number
}

export default function EndSection() {
  const router = useRouter()
  const contentRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [active, setActive] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [origin, setOrigin] = useState<SpiralOrigin | null>(null)

  useEffect(() => {
    router.prefetch('/world')
  }, [router])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setActive(true)
          io.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Lock page scroll and go to /world once the overlay has finished.
  useEffect(() => {
    if (phase === 'idle') return
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => router.push('/world'), ENGULF_MS)
    return () => {
      document.body.style.overflow = ''
      window.clearTimeout(timer)
    }
  }, [phase, router])

  const beginEnd = () => {
    const btn = buttonRef.current
    if (!btn || phase !== 'idle') return
    const rect = btn.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    // Distance from the spiral's centre to the farthest viewport corner —
    // the circle must scale until its radius covers that distance.
    const farX = Math.max(cx, window.innerWidth - cx)
    const farY = Math.max(cy, window.innerHeight - cy)
    const radius = Math.hypot(farX, farY)
    setOrigin({
      left: rect.left,
      top: rect.top,
      size: rect.width,
      scale: (radius * 2) / rect.width,
    })
    setPhase('engulf')
  }

  const engulfing = phase !== 'idle'

  return (
    <section
      id="tour"
      className="relative z-30 -mt-16 flex h-screen w-full items-center justify-center overflow-hidden bg-black"
      style={{
        clipPath: JAGGED_TOP,
        maskImage: TOP_FADE,
        WebkitMaskImage: TOP_FADE,
      }}
    >
      {/* dusty grain texture, repeating, opacity reduced via filter */}
      <div
        className="pointer-events-none absolute inset-0 bg-repeat opacity-50 [filter:grayscale(1)_brightness(0.7)_contrast(1.1)]"
        style={{
          backgroundImage: `url(${IMG}/dusty-black-grain-texture.webp)`,
          backgroundSize: '320px',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black via-transparent to-black/80" />

      <div
        ref={contentRef}
        className="relative z-10 flex flex-col items-center px-6"
        style={{
          opacity: engulfing ? 0 : 1,
          transition: 'opacity 1500ms ease-out',
        }}
      >
        <button
          ref={buttonRef}
          type="button"
          aria-label="Enter the end"
          onClick={beginEnd}
          className="relative flex cursor-pointer items-center justify-center bg-transparent focus:outline-none"
        >
          {/* spiral icon sits behind the splotch, cropped to a circle */}
          <img
            src={`${IMG}/wgam-spiral-icon.webp`}
            alt=""
            aria-hidden
            className="animate-spin-slow pointer-events-none absolute inset-0 m-auto h-56 w-56 max-w-none select-none rounded-full object-cover opacity-90"
            style={{ visibility: engulfing ? 'hidden' : 'visible' }}
          />
          <img
            src={`${IMG}/animated-black-splotch.webp`}
            alt="Black splotch"
            className="relative z-10 h-56 w-56 select-none object-contain"
            style={{
              visibility: engulfing ? 'hidden' : 'visible',
              opacity: active ? 1 : 0,
              transform: active ? 'scale(1)' : 'scale(0)',
              transition: 'opacity 2200ms ease-out, transform 2200ms ease-out',
            }}
          />
        </button>

        <EndHeading active={active} />
      </div>

      {engulfing &&
        origin &&
        createPortal(
          <div className="fixed inset-0 z-[110]">
            {/* everything behind the spiral fades to black */}
            <div className="engulf-backdrop absolute inset-0 bg-black" />

            {/* growing spiral, with the splotch growing past it to black out
                the screen */}
            <div
              className="engulf-grow absolute"
              style={
                {
                  'left': origin.left,
                  'top': origin.top,
                  'width': origin.size,
                  'height': origin.size,
                  '--engulf-scale': origin.scale,
                } as React.CSSProperties
              }
            >
              <img
                src={`${IMG}/wgam-spiral-icon.webp`}
                alt=""
                aria-hidden
                className="engulf-spin h-full w-full select-none rounded-full object-cover"
              />
            </div>
            <div
              className="engulf-splotch absolute"
              style={
                {
                  'left': origin.left,
                  'top': origin.top,
                  'width': origin.size,
                  'height': origin.size,
                  '--splotch-scale': origin.scale * 5.5,
                } as React.CSSProperties
              }
            >
              <img
                src={`${IMG}/animated-black-splotch.webp`}
                alt=""
                aria-hidden
                className="h-full w-full select-none object-contain"
              />
            </div>
          </div>,
          document.body,
        )}
    </section>
  )
}
