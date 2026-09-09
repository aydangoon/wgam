'use client'

import { useEffect } from 'react'
import { worldAudio } from '@/lib/world/audio'

type Props = {
  n: number
  onClose: () => void
}

export default function FoundFootage({ n, onClose }: Props) {
  useEffect(() => {
    worldAudio().setTvStatic(true, 0.021)
    return () => worldAudio().setTvStatic(false)
  }, [])

  return (
    <button
      type="button"
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/80"
      onClick={onClose}
      aria-label="Close found footage"
    >
      <div className="flex aspect-[9/16] h-[min(72vh,640px)] max-w-[42vw] items-center justify-center border border-white/20 bg-black">
        <p className="font-aboreto px-6 text-center text-xs tracking-[0.18em] text-white sm:text-sm">
          found footage video #{n}
        </p>
      </div>
    </button>
  )
}
