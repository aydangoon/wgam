'use client'

import { useRef, useState } from 'react'

type Props = {
  hasMatchbook: boolean
  onSolved: () => void
  onNeedMatch: () => void
  onClose: () => void
}

export default function MatchStrike({
  hasMatchbook,
  onSolved,
  onNeedMatch,
  onClose,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const dragging = useRef(false)

  const at = (e: React.PointerEvent) => {
    const el = trackRef.current
    if (!el) return 0
    const r = el.getBoundingClientRect()
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70">
      <div className="w-[min(560px,86vw)] px-4 text-center">
        <p className="font-manufacturing mb-6 text-3xl text-[#c41e1e] sm:text-4xl">
          strike it
        </p>
        <div
          ref={trackRef}
          className="relative h-16 w-full cursor-none overflow-hidden bg-[#1a120c]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, #2a2018 0 6px, #3a2a1c 6px 8px)',
          }}
          onPointerDown={e => {
            if (!hasMatchbook) {
              onNeedMatch()
              return
            }
            dragging.current = true
            ;(e.target as Element).setPointerCapture?.(e.pointerId)
            setProgress(at(e))
          }}
          onPointerMove={e => {
            if (!dragging.current || !hasMatchbook) return
            const p = at(e)
            setProgress(p)
            if (p >= 0.92) {
              dragging.current = false
              onSolved()
            }
          }}
          onPointerUp={() => {
            dragging.current = false
          }}
        >
          <div
            className="absolute inset-y-0 left-0 bg-[hsl(var(--accent))]/70"
            style={{ width: `${progress * 100}%` }}
          />
          <img
            src="/images/world/cut/match.webp"
            alt=""
            className="pointer-events-none absolute top-1/2 h-12 w-12 -translate-y-1/2 select-none object-contain"
            style={{ left: `calc(${progress * 100}% - 24px)` }}
            draggable={false}
          />
        </div>
        <p className="font-aboreto mt-4 text-[10px] tracking-[0.3em] text-white/50">
          drag along the striker
        </p>
        <button
          type="button"
          onClick={onClose}
          className="font-aboreto mt-6 text-[10px] tracking-[0.3em] text-white/40 hover:text-white"
        >
          NOT YET
        </button>
      </div>
    </div>
  )
}
