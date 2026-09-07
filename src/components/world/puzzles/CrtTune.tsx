'use client'

import { useEffect, useRef, useState } from 'react'
import { cut } from '@/lib/world/types'
import { cn } from '@/lib/utils'

const HOLD_MS = 3000
const FADE_MS = 800

type Props = {
  already: boolean
  onSolved: () => void
  onClose: () => void
  onStatic: () => void
}

export default function CrtTune({ already, onSolved, onClose, onStatic }: Props) {
  const [value, setValue] = useState('')
  const [flash, setFlash] = useState(already)
  const [error, setError] = useState('')
  const [fading, setFading] = useState(false)
  const solvedNow = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!flash || !solvedNow.current) return
    const fadeTimer = window.setTimeout(() => setFading(true), HOLD_MS)
    const closeTimer = window.setTimeout(() => onCloseRef.current(), HOLD_MS + FADE_MS)
    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(closeTimer)
    }
  }, [flash])

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault()
    const n = value.replace(/\D/g, '')
    if (n === '2071') {
      solvedNow.current = true
      setFlash(true)
      setError('')
      onSolved()
      return
    }
    setError('NO SIGNAL')
    onStatic()
  }

  return (
    <div
      className={cn(
        'absolute inset-0 z-40 flex items-center justify-center bg-black/70 transition-opacity ease-out',
        fading ? 'opacity-0' : 'opacity-100',
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="relative w-[min(640px,86vw)]">
        <div
          className="absolute z-20 overflow-hidden bg-black"
          style={{
            left: '12.63%',
            top: '10.31%',
            width: '76.52%',
            height: '57.07%',
            borderRadius: '6% / 8%',
          }}
        >
          {flash ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <img
                src={cut('white-rabbit-mask')}
                alt=""
                className="world-glitch-fast h-24 w-24 object-contain opacity-90"
              />
              <p className="font-aboreto text-2xl font-bold tracking-[0.4em] text-[#7fff6a]">MATCH</p>
            </div>
          ) : (
            <div className="world-scanlines flex h-full flex-col items-center justify-center px-4 text-center">
              <p className="font-aboreto mb-3 text-xs font-bold tracking-[0.28em] text-[#7fff6a]/80 sm:text-sm">
                THE ONE — SUNDAY TRANSMISSION
              </p>
              <form onSubmit={submit} className="flex w-full items-center justify-center gap-2">
                <span className="font-aboreto text-lg font-bold text-[#7fff6a] sm:text-xl">CH</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  maxLength={4}
                  value={value}
                  onChange={e => setValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="font-aboreto w-28 border-b-2 border-[#7fff6a] bg-transparent text-center text-3xl font-bold tracking-[0.28em] text-[#7fff6a] outline-none"
                  placeholder="0000"
                  aria-label="Channel number"
                />
              </form>
              <p className="font-aboreto mt-4 h-5 text-xs font-bold tracking-[0.3em] text-red-500">
                {error}
              </p>
            </div>
          )}
        </div>
        <img
          src={cut('crt-transparent-screen')}
          alt=""
          className="pointer-events-none relative z-10 w-full select-none"
          draggable={false}
        />
        <div className="mt-4 flex justify-center gap-10">
          <button
            type="button"
            onClick={() => submit()}
            className="font-aboreto text-sm font-bold tracking-[0.28em] text-white/85 hover:text-white sm:text-base"
          >
            TUNE
          </button>
          <button
            type="button"
            onClick={onClose}
            className="font-aboreto text-sm font-bold tracking-[0.28em] text-white/85 hover:text-white sm:text-base"
          >
            OFF
          </button>
        </div>
      </div>
    </div>
  )
}
