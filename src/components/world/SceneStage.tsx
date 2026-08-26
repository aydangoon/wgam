'use client'

import type { Hotspot } from '@/lib/world/types'
import HotspotView from './Hotspot'

type Props = {
  hotspots: Hotspot[]
  bg?: string
  inverted?: boolean
  debug?: boolean
  onActivate: (hotspot: Hotspot) => void
  onHover: (hotspot: Hotspot | null) => void
  children?: React.ReactNode
}

export default function SceneStage({
  hotspots,
  bg,
  inverted,
  debug,
  onActivate,
  onHover,
  children,
}: Props) {
  const behind = hotspots.filter(h => h.behind)
  const front = hotspots.filter(h => !h.behind)
  return (
    <div
      className="absolute inset-0 overflow-hidden bg-black"
      style={{
        filter: inverted ? 'invert(1) hue-rotate(180deg)' : undefined,
        transition: 'filter 900ms ease',
      }}
    >
      {bg && (
        <img
          src={bg}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
        />
      )}
      {behind.map(h => (
        <HotspotView
          key={h.id}
          hotspot={h}
          debug={debug}
          onActivate={onActivate}
          onHover={onHover}
        />
      ))}
      {children}
      {front.map(h => (
        <HotspotView
          key={h.id}
          hotspot={h}
          debug={debug}
          onActivate={onActivate}
          onHover={onHover}
        />
      ))}
    </div>
  )
}
