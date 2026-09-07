'use client'

import { FOOTAGE_CAPTIONS } from '@/lib/world/graph'
import { cut } from '@/lib/world/types'

type Props = {
  n: number
  onClose: () => void
}

export default function FoundFootage({ n, onClose }: Props) {
  const caption = FOOTAGE_CAPTIONS[n]
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80">
      <div className="relative w-[min(520px,78vw)]">
        <div className="relative">
          <img
            src={cut('old-tv-transparent-screen')}
            alt=""
            className="relative z-10 w-full select-none"
            draggable={false}
          />
          <div
            className="pointer-events-none absolute z-20 flex flex-col items-center justify-end px-4 pb-5 text-center"
            style={{ left: '8%', top: '10%', width: '65%', height: '72%' }}
          >
            <p className="font-aboreto text-[10px] tracking-[0.45em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              found footage {n}
            </p>
            {caption && (
              <p className="font-manufacturing mt-2 text-2xl text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] sm:text-3xl">
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
