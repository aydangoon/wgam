'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const FADE_MS = 900

type Props = {
  onUnlock: () => void
  onReady: () => void
}

export default function WorldStart({ onUnlock, onReady }: Props) {
  const [fading, setFading] = useState(false)
  const readyTimer = useRef<number | undefined>(undefined)

  return (
    <div
      className={cn(
        'absolute inset-0 z-[100] flex items-center justify-center bg-black transition-opacity ease-out',
        fading ? 'opacity-0' : 'opacity-100',
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="world-start-title"
    >
      <div
        className={cn(
          'flex flex-col items-center px-8 text-center transition-opacity ease-out',
          fading && 'opacity-0',
        )}
        style={{ transitionDuration: `${Math.round(FADE_MS * 0.55)}ms` }}
      >
        <h1
          id="world-start-title"
          className="font-manufacturing text-5xl text-[#c41e1e] sm:text-7xl"
        >
          The Wasted City
        </h1>

        <p className="font-aboreto mt-10 text-xs tracking-[0.35em] text-white/75 sm:text-sm">
          full screen
        </p>
        <p className="font-aboreto mt-2 text-[10px] tracking-[0.28em] text-white/45 sm:text-xs">
          chrome · ctrl + cmd + F
        </p>

        <p className="font-aboreto mt-10 text-xs tracking-[0.35em] text-white/75 sm:text-sm">
          sound on
        </p>
        <SoundOnMark />

        <button
          type="button"
          disabled={fading}
          onClick={() => {
            if (fading) return
            setFading(true)
            onUnlock()
            if (readyTimer.current) window.clearTimeout(readyTimer.current)
            const ms = window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 0
              : FADE_MS
            readyTimer.current = window.setTimeout(onReady, ms)
          }}
          className="font-aboreto mt-12 border border-[#c41e1e] px-14 py-3 text-sm tracking-[0.45em] text-[#c41e1e] transition-colors hover:bg-[#c41e1e] hover:text-white disabled:hover:bg-transparent disabled:hover:text-[#c41e1e]"
        >
          START
        </button>
      </div>
    </div>
  )
}

function SoundOnMark() {
  return (
    <span className="mt-3 inline-flex items-center text-[#c41e1e]" aria-hidden>
      <svg viewBox="0 0 28 24" className="h-6 w-7" fill="none">
        <path
          d="M4 9.5h3.2L12 5.8v12.4L7.2 14.5H4V9.5Z"
          fill="currentColor"
        />
        <path
          d="M16.2 8.2c1.35 1.2 1.35 6.4 0 7.6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M19.4 5.6c2.4 2.2 2.4 10.6 0 12.8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
