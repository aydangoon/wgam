'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  muted: boolean
  debug: boolean
  onBack: () => void
  onMap: () => void
  onMute: () => void
  onExit: () => void
  onDebug: () => void
  onResetFlags: () => void
}

export default function WorldHud({
  muted,
  debug,
  onBack,
  onMap,
  onMute,
  onExit,
  onDebug,
  onResetFlags,
}: Props) {
  const [menu, setMenu] = useState(false)
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between px-5 pt-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="pointer-events-auto font-aboreto text-2xl leading-none text-[#c41e1e] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] hover:text-white"
        >
          ←
        </button>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onDebug}
            className={cn(
              'pointer-events-auto font-aboreto text-[10px] tracking-[0.25em]',
              debug
                ? 'text-[#c41e1e] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]'
                : 'text-white/55 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] hover:text-white',
            )}
          >
            {debug ? 'DEBUG ON' : 'DEBUG'}
          </button>
          {debug && (
            <button
              type="button"
              onClick={onResetFlags}
              className="pointer-events-auto font-aboreto text-[10px] tracking-[0.25em] text-white/55 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] hover:text-[#c41e1e]"
            >
              RESET FLAGS
            </button>
          )}
          <button
            type="button"
            onClick={() => setMenu(v => !v)}
            aria-label="Menu"
            className="pointer-events-auto font-aboreto text-lg tracking-[0.2em] text-[#c41e1e] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] hover:text-white"
          >
            ≡
          </button>
        </div>
      </div>

      {menu && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-5 text-center">
            <p className="font-manufacturing text-4xl text-[#c41e1e] sm:text-5xl">
              THE WASTED CITY
            </p>
            <MenuBtn
              onClick={() => {
                setMenu(false)
                onMap()
              }}
            >
              MAP
            </MenuBtn>
            <MenuBtn onClick={onMute}>{muted ? 'SOUND OFF' : 'SOUND ON'}</MenuBtn>
            <MenuBtn onClick={onExit}>EXIT TO SITE</MenuBtn>
            <button
              type="button"
              onClick={() => setMenu(false)}
              className="font-aboreto mt-4 text-xs tracking-[0.3em] text-white/40 hover:text-white"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function MenuBtn({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'font-aboreto text-sm tracking-[0.35em] text-white/80 transition-colors hover:text-[hsl(var(--accent))]',
      )}
    >
      {children}
    </button>
  )
}
