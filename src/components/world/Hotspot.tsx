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
  const transform = [
    hotspot.tiltX ? `rotateX(${hotspot.tiltX}deg)` : '',
    hotspot.rotate ? `rotate(${hotspot.rotate}deg)` : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button
      type="button"
      disabled={!clickable}
      aria-label={hotspot.label || hotspot.id}
      className={cn(
        'absolute bg-transparent p-0 text-left',
        !clickable && 'pointer-events-none',
        hotspot.className,
      )}
      style={{
        left: `${hotspot.x}%`,
        top: `${hotspot.y}%`,
        width: `${hotspot.w}%`,
        height: `${hotspot.h}%`,
        zIndex: hotspot.z ?? 1,
        opacity: hotspot.opacity ?? 1,
        transform: transform || undefined,
        transformOrigin: hotspot.tiltX ? 'center bottom' : undefined,
        filter: hotspot.filter,
        outline: debug && clickable ? '2px solid #c026d3' : undefined,
        outlineOffset: debug && clickable ? '-1px' : undefined,
      }}
      onPointerEnter={() => clickable && onHover(hotspot)}
      onPointerLeave={() => onHover(null)}
      onClick={() => clickable && onActivate(hotspot)}
    >
      {hotspot.src && hotspot.screen ? (
        <span className="absolute inset-0 flex items-end justify-center">
          <span
            className="relative h-full max-w-full"
            style={{ aspectRatio: '396 / 417', width: 'auto' }}
          >
            <img
              src={hotspot.screen.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute select-none"
              style={{
                left: `${hotspot.screen.x}%`,
                top: `${hotspot.screen.y}%`,
                width: `${hotspot.screen.w}%`,
                height: `${hotspot.screen.h}%`,
                objectFit: 'cover',
                objectPosition: 'center',
              }}
            />
            <img
              src={hotspot.src}
              alt=""
              draggable={false}
              className={cn(
                'pointer-events-none relative z-10 h-full w-full select-none object-contain',
                hotspot.spin && 'animate-spin-slow',
              )}
              style={{
                transform: hotspot.flipX ? 'scaleX(-1)' : undefined,
              }}
            />
          </span>
        </span>
      ) : hotspot.src ? (
        <img
          src={hotspot.src}
          alt=""
          draggable={false}
          className={cn(
            'pointer-events-none h-full w-full select-none',
            hotspot.spin && 'animate-spin-slow',
          )}
          style={{
            objectFit: hotspot.fit ?? 'contain',
            objectPosition: 'center bottom',
            transform: hotspot.flipX ? 'scaleX(-1)' : undefined,
          }}
        />
      ) : null}
      {hotspot.label && (
        <span
          className={cn(
            'font-manufacturing pointer-events-none absolute z-10 w-max text-center text-[15px] tracking-wide text-[#c41e1e] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)] sm:text-lg',
            (hotspot.labelAt ?? 'bottom') === 'bottom' &&
              'left-1/2 top-full mt-1 -translate-x-1/2',
            hotspot.labelAt === 'top' &&
              'bottom-full left-1/2 mb-1 -translate-x-1/2',
            hotspot.labelAt === 'left' &&
              'right-full top-1/2 mr-2 -translate-y-1/2',
            hotspot.labelAt === 'right' &&
              'left-full top-1/2 ml-2 -translate-y-1/2',
          )}
        >
          {hotspot.label}
        </span>
      )}
    </button>
  )
}
