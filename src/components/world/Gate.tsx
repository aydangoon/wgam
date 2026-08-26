'use client'

import { jaggedGateClips } from '@/lib/jagged'

const { topClip, bottomClip } = jaggedGateClips(2071, 16)

const CIRCLE_TEXT = "THEY ARE THE HAVES  ·  WE ARE THE NOTS  ·  "

type Props = {
  onEnter: () => void
  open: boolean
}

export default function WorldGate({ onEnter, open }: Props) {
  if (open) {
    // Keep mounted until the doors finish retracting — parent unmounts after timeout.
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-[52%] bg-black will-change-transform"
        style={{
          clipPath: topClip,
          WebkitClipPath: topClip,
          transform: open ? 'translateY(-101%)' : 'translateY(0)',
          transition: 'transform 1200ms cubic-bezier(0.7, 0, 0.2, 1)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[52%] bg-black will-change-transform"
        style={{
          clipPath: bottomClip,
          WebkitClipPath: bottomClip,
          transform: open ? 'translateY(101%)' : 'translateY(0)',
          transition: 'transform 1200ms cubic-bezier(0.7, 0, 0.2, 1)',
        }}
      />

      <button
        type="button"
        onClick={onEnter}
        aria-label="Enter the wasted city"
        className="absolute left-1/2 top-1/2 flex h-72 w-72 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-transparent focus:outline-none sm:h-80 sm:w-80"
        style={{
          opacity: open ? 0 : 1,
          pointerEvents: open ? 'none' : 'auto',
          transition: 'opacity 400ms ease',
        }}
      >
        <svg
          viewBox="0 0 200 200"
          className="animate-spin-slow absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <path
              id="world-gate-textcircle"
              d="M 100,100 m -80,0 a 80,80 0 1,1 160,0 a 80,80 0 1,1 -160,0"
              fill="none"
            />
          </defs>
          <text
            className="font-aboreto"
            fill="white"
            style={{ fontSize: '13px', letterSpacing: '0.12em' }}
          >
            <textPath href="#world-gate-textcircle" startOffset="0">
              {CIRCLE_TEXT}
            </textPath>
          </text>
        </svg>
        <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[hsl(var(--accent))] sm:h-32 sm:w-32">
          <span
            className="ml-1 block h-0 w-0 border-y-[26px] border-l-[44px] border-y-transparent border-l-white"
            aria-hidden
          />
        </span>
      </button>

      <div
        className="font-aboreto pointer-events-none absolute left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 text-center text-xs tracking-[0.35em] text-white/70 sm:text-sm"
        style={{
          transform: 'translate(-50%, 168px)',
          opacity: open ? 0 : 1,
          transition: 'opacity 400ms ease',
        }}
      >
        MUSIC IS ILLEGAL HERE
      </div>
    </div>
  )
}
