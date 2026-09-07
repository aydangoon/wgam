'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  onSolved: () => void
  onClose: () => void
}

const CATCH_MS = 420

export default function MatchStrike({ onSolved, onClose }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [lit, setLit] = useState(false)
  const dragging = useRef(false)
  const solved = useRef(false)

  const at = (e: React.PointerEvent) => {
    const el = trackRef.current
    if (!el) return 0
    const r = el.getBoundingClientRect()
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
  }

  const catchFire = () => {
    if (solved.current) return
    solved.current = true
    dragging.current = false
    setLit(true)
    setProgress(1)
    window.setTimeout(onSolved, CATCH_MS)
  }

  return (
    <div
      className={cn(
        'absolute inset-0 z-40 flex items-center justify-center transition-colors duration-500',
        lit ? 'bg-[#2a0800]' : 'bg-black',
      )}
    >
      <div
        className={cn(
          'w-[min(560px,86vw)] px-4 text-center transition-opacity duration-500',
          lit && 'opacity-0',
        )}
      >
        <p className="font-manufacturing mb-8 text-5xl font-bold text-[#c41e1e] sm:text-6xl">
          strike it
        </p>
        <div className="relative overflow-visible py-10">
          <div
            ref={trackRef}
            className="relative h-16 w-full overflow-hidden bg-[#1a120c]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, #2a2018 0 6px, #3a2a1c 6px 8px)',
            }}
            onPointerDown={e => {
              if (solved.current) return
              dragging.current = true
              ;(e.target as Element).setPointerCapture?.(e.pointerId)
              setProgress(at(e))
            }}
            onPointerMove={e => {
              if (!dragging.current || solved.current) return
              const p = at(e)
              setProgress(p)
              if (p >= 0.92) catchFire()
            }}
            onPointerUp={() => {
              dragging.current = false
            }}
          >
            <div
              className="absolute inset-y-0 left-0 bg-[hsl(var(--accent))]/70"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <img
            src="/images/world/cut/match.webp"
            alt=""
            className={cn(
              'pointer-events-none absolute top-1/2 h-28 w-28 -translate-y-[calc(50%-35px)] select-none object-contain',
              lit && 'world-match-lit',
            )}
            style={{ left: `calc(${progress * 100}% - 8px)` }}
            draggable={false}
          />
        </div>
        <p className="font-aboreto mt-2 text-xl font-bold tracking-[0.28em] text-white/70">
          drag along the striker
        </p>
        <button
          type="button"
          onClick={onClose}
          disabled={lit}
          className="font-aboreto mt-6 text-xl font-bold tracking-[0.28em] text-white/50 hover:text-white"
        >
          NOT YET
        </button>
      </div>
      {lit && <div className="world-match-catch pointer-events-none absolute inset-0" />}
    </div>
  )
}
