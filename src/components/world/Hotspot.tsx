'use client'

import { cn } from '@/lib/utils'
import type { Hotspot } from '@/lib/world/types'

type Props = {
  hotspot: Hotspot
  debug?: boolean
  onActivate: (hotspot: Hotspot) => void
  onHover: (hotspot: Hotspot | null) => void
}

export default function HotspotView({ hotspot, debug, onActivate, onHover }: Props) {
  const clickable = Boolean(hotspot.action)
  return (
    <button
      type="button"
      disabled={!clickable}
      aria-label={hotspot.label || hotspot.id}
      className={cn(
        'absolute bg-transparent p-0 text-left',
        !clickable && 'pointer-events-none',
      )}
      style={{
        left: `${hotspot.x}%`,
        top: `${hotspot.y}%`,
        width: `${hotspot.w}%`,
        height: `${hotspot.h}%`,
        zIndex: hotspot.z ?? 1,
        opacity: hotspot.opacity ?? 1,
        transform: hotspot.rotate ? `rotate(${hotspot.rotate}deg)` : undefined,
        filter: hotspot.filter,
        outline: debug && clickable ? '2px solid #c026d3' : undefined,
        outlineOffset: debug && clickable ? '-1px' : undefined,
      }}
      onPointerEnter={() => clickable && onHover(hotspot)}
      onPointerLeave={() => onHover(null)}
      onClick={() => clickable && onActivate(hotspot)}
    >
      {hotspot.src && (
        <img
          src={hotspot.src}
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full select-none"
          style={{
            objectFit: hotspot.fit ?? 'contain',
            objectPosition: 'center bottom',
          }}
        />
      )}
      {hotspot.label && (
        <span className="font-manufacturing pointer-events-none absolute left-1/2 top-full z-10 mt-1 w-max -translate-x-1/2 text-center text-[15px] tracking-wide text-[#c41e1e] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)] sm:text-lg">
          {hotspot.label}
        </span>
      )}
    </button>
  )
}
