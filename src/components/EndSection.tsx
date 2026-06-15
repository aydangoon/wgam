'use client'

import { useEffect, useRef, useState } from 'react'
import { JAGGED_AMP_PX, jaggedTopClip } from '@/lib/jagged'
import EndHeading from './EndHeading'

const IMG = '/images/processed'

// Shared jagged top edge (interlocks with the navbar's inverse bottom edge).
const JAGGED_TOP = jaggedTopClip()

// Only feather the very tips of the teeth so they read as a torn edge
// instead of dissolving into a flat line. Must stay well below the tooth height.
const TOP_FADE = `linear-gradient(to bottom, transparent 0%, black ${Math.round(
  JAGGED_AMP_PX * 0.6,
)}px)`

export default function EndSection() {
  const contentRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

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
      >
        <button
          type="button"
          aria-label="Enter the end"
          className="relative flex cursor-pointer items-center justify-center bg-transparent focus:outline-none"
        >
          {/* spiral icon sits behind the splotch, cropped to a circle */}
          <img
            src={`${IMG}/wgam-spiral-icon.webp`}
            alt=""
            aria-hidden
            className="animate-spin-slow pointer-events-none absolute inset-0 m-auto h-56 w-56 max-w-none select-none rounded-full object-cover opacity-90"
          />
          <img
            src={`${IMG}/animated-black-splotch.webp`}
            alt="Black splotch"
            className="relative z-10 h-56 w-56 select-none object-contain"
            style={{
              opacity: active ? 1 : 0,
              transform: active ? 'scale(1)' : 'scale(0)',
              transition: 'opacity 2200ms ease-out, transform 2200ms ease-out',
            }}
          />
        </button>

        <EndHeading active={active} />
      </div>
    </section>
  )
}
