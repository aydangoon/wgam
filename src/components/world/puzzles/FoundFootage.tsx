'use client'

import { FOOTAGE_CAPTIONS } from '@/lib/world/graph'

type Props = {
  n: number
  onClose: () => void
}

export default function FoundFootage({ n, onClose }: Props) {
  const caption = FOOTAGE_CAPTIONS[n]
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80">
      <div className="relative w-[min(560px,88vw)]">
        <div className="relative overflow-hidden border border-[#7fff6a]/30 bg-black">
          <div className="world-scanlines relative flex aspect-video flex-col items-center justify-center gap-4 px-6">
            <p className="font-aboreto text-[10px] tracking-[0.45em] text-[#7fff6a]/50">
              NO SIGNAL
            </p>
            <p className="font-manufacturing text-3xl text-[#7fff6a] sm:text-4xl">
              found footage {n}
            </p>
            {caption && (
              <p className="font-aboreto max-w-sm text-center text-xs tracking-[0.2em] text-[#7fff6a]/80">
                {caption}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-aboreto mt-4 w-full text-[10px] tracking-[0.35em] text-white/50 hover:text-white"
        >
          EJECT
        </button>
      </div>
    </div>
  )
}
