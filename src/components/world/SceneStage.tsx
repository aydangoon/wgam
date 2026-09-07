'use client'

import { cn } from '@/lib/utils'
import type { Hotspot } from '@/lib/world/types'
import HotspotView from './Hotspot'

type Props = {
  hotspots: Hotspot[]
  bg?: string
  inverted?: boolean
  club?: boolean
  debug?: boolean
  onActivate: (hotspot: Hotspot) => void
  onHover: (hotspot: Hotspot | null) => void
  children?: React.ReactNode
}

export default function SceneStage({
  hotspots,
  bg,
  inverted,
  club,
  debug,
  onActivate,
  onHover,
  children,
}: Props) {
  const behind = hotspots.filter(h => h.behind)
  const front = hotspots.filter(h => !h.behind)
  return (
    <div
      className={cn('absolute inset-0 overflow-hidden bg-black', club && 'world-club')}
      style={{
        perspective: '800px',
        perspectiveOrigin: '50% 75%',
        filter: club ? undefined : inverted ? 'invert(1) hue-rotate(180deg)' : undefined,
        transition: club ? undefined : 'filter 900ms ease',
      }}
    >
      {bg && (
        <img
          src={bg}
          alt=""
          draggable={false}
          className="world-bg pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
        />
      )}
      {behind.map(h => (
        <HotspotView
          key={`${h.id}-${h.remountKey ?? ''}`}
          hotspot={h}
          debug={debug}
          onActivate={onActivate}
          onHover={onHover}
        />
      ))}
      {children}
      {front.map(h => (
        <HotspotView
          key={`${h.id}-${h.remountKey ?? ''}`}
          hotspot={h}
          debug={debug}
          onActivate={onActivate}
          onHover={onHover}
        />
      ))}
      {club && <ClubLights />}
    </div>
  )
}

function ClubLights() {
  return (
    <div className="world-club-lights" aria-hidden>
      <div className="world-club-spot world-club-spot-red" />
      <div className="world-club-spot world-club-spot-cyan" />
      <div className="world-club-spot world-club-spot-magenta" />
      <div className="world-club-floor" />
    </div>
  )
}
