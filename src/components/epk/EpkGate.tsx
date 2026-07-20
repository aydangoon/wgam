'use client'

import { useEffect, useState } from 'react'
import { jaggedGateClips } from '@/lib/jagged'

const { topClip, bottomClip } = jaggedGateClips(90210, 14)

const CIRCLE_TEXT = "WHO'S GOT A MATCH?  \u00B7  WHO'S GOT A MATCH?  \u00B7  "

export default function EpkGate({ onEnter }: { onEnter: () => void }) {
  const [open, setOpen] = useState(false)
  const [gone, setGone] = useState(false)
  const [showSub, setShowSub] = useState(false)

  // Fade the subtitle in after a beat.
  useEffect(() => {
    const t = window.setTimeout(() => setShowSub(true), 500)
    return () => window.clearTimeout(t)
  }, [])

  const handleEnter = () => {
    if (open) return
    onEnter()
    setOpen(true)
    // Unmount after the door finishes retracting.
    window.setTimeout(() => setGone(true), 1400)
  }

  if (gone) return null

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden">
      {/* Top door half */}
      <div
        className="absolute inset-x-0 top-0 h-[52%] bg-black will-change-transform"
        style={{
          clipPath: topClip,
          WebkitClipPath: topClip,
          transform: open ? 'translateY(-101%)' : 'translateY(0)',
          transition: 'transform 1200ms cubic-bezier(0.7, 0, 0.2, 1)',
        }}
      />
      {/* Bottom door half */}
      <div
        className="absolute inset-x-0 bottom-0 h-[52%] bg-black will-change-transform"
        style={{
          clipPath: bottomClip,
          WebkitClipPath: bottomClip,
          transform: open ? 'translateY(101%)' : 'translateY(0)',
          transition: 'transform 1200ms cubic-bezier(0.7, 0, 0.2, 1)',
        }}
      />

      {/* Centered play button + circling text, spanning the seam */}
      <button
        type="button"
        onClick={handleEnter}
        aria-label="Play and enter the press kit"
        className="absolute left-1/2 top-1/2 flex h-72 w-72 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-transparent transition-opacity duration-500 focus:outline-none sm:h-80 sm:w-80"
        style={{
          opacity: open ? 0 : 1,
          pointerEvents: open ? 'none' : 'auto',
        }}
      >
        {/* Circling text */}
        <svg
          viewBox="0 0 200 200"
          className="animate-spin-slow absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <path
              id="epk-gate-textcircle"
              d="M 100,100 m -80,0 a 80,80 0 1,1 160,0 a 80,80 0 1,1 -160,0"
              fill="none"
            />
          </defs>
          <text
            className="font-aboreto"
            fill="white"
            style={{ fontSize: '16px', letterSpacing: '0.14em' }}
          >
            <textPath href="#epk-gate-textcircle" startOffset="0">
              {CIRCLE_TEXT}
            </textPath>
          </text>
        </svg>

        {/* Inner circle + play triangle — white with black fill */}
        <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white sm:h-36 sm:w-36">
          <span
            className="ml-1 block h-0 w-0 border-y-[30px] border-l-[50px] border-y-transparent border-l-black"
            aria-hidden
          />
        </span>
      </button>

      {/* Subtitle below the button, fades in after 1s */}
      <div
        className="font-aboreto pointer-events-none absolute left-1/2 top-1/2 text-4xl tracking-[0.35em] text-white/80 transition-opacity duration-1000 pt-8"
        style={{
          transform: 'translate(-50%, 175px)',
          opacity: showSub && !open ? 1 : 0,
        }}
      >
        CLICK FOR EPK
      </div>
    </div>
  )
}
