'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  onSolved: () => void
  reducedMotion: boolean
}

function spiralPoints(cx: number, cy: number, n = 14) {
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < n; i++) {
    const t = 0.4 + (i / (n - 1)) * Math.PI * 2.4
    const r = 4 + i * 2.1
    pts.push({
      x: cx + r * Math.cos(t),
      y: cy + r * Math.sin(t),
    })
  }
  return pts
}

export default function SpiralTrace({ onSolved, reducedMotion }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hit, setHit] = useState<boolean[]>(() => spiralPoints(68, 16).map(() => false))
  const pts = spiralPoints(68, 16)

  useEffect(() => {
    if (reducedMotion) return
    const done = hit.filter(Boolean).length / hit.length >= 0.7
    if (done) onSolved()
  }, [hit, onSolved, reducedMotion])

  const toPct = (e: React.PointerEvent) => {
    const svg = svgRef.current
    if (!svg) return null
    const r = svg.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    }
  }

  const sample = (e: React.PointerEvent) => {
    const p = toPct(e)
    if (!p) return
    setHit(prev =>
      prev.map((v, i) => {
        if (v) return v
        const d = Math.hypot(pts[i].x - p.x, pts[i].y - p.y)
        return d < 5.5
      }),
    )
  }

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 z-[8] h-full w-full touch-none"
      style={{ pointerEvents: 'none' }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <path
        d={pts
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
          .join(' ')}
        fill="none"
        stroke="rgba(196,30,30,0.22)"
        strokeWidth="2.4"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{ pointerEvents: 'stroke', cursor: 'none' }}
        onPointerDown={e => {
          if (reducedMotion) {
            onSolved()
            return
          }
          e.stopPropagation()
          e.currentTarget.setPointerCapture(e.pointerId)
          setDrawing(true)
          sample(e)
        }}
        onPointerMove={e => drawing && sample(e)}
        onPointerUp={() => setDrawing(false)}
        onPointerCancel={() => setDrawing(false)}
      />
    </svg>
  )
}
