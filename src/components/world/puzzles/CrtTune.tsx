'use client'

import { useState } from 'react'
import { cut } from '@/lib/world/types'

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

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault()
    const n = value.replace(/\D/g, '')
    if (n === '2071') {
      setFlash(true)
      setError('')
      onSolved()
      return
    }
    setError('NO SIGNAL')
    onStatic()
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70">
      <div className="relative w-[min(640px,86vw)]">
        <div
          className="absolute left-[18%] top-[16%] h-[46%] w-[64%] overflow-hidden bg-black"
          style={{ borderRadius: '6% / 8%' }}
        >
          {flash ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <img
                src={cut('white-rabbit-mask')}
                alt=""
                className="world-glitch h-24 w-24 object-contain opacity-90"
              />
              <p className="font-aboreto text-xl tracking-[0.4em] text-[#7fff6a]">MATCH</p>
            </div>
          ) : (
            <div className="world-scanlines flex h-full flex-col items-center justify-center px-4">
              <p className="font-aboreto mb-3 text-[10px] tracking-[0.4em] text-[#7fff6a]/70">
                THE ONE — SUNDAY TRANSMISSION
              </p>
              <form onSubmit={submit} className="flex items-center gap-2">
                <span className="font-aboreto text-[#7fff6a]">CH</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  maxLength={4}
                  value={value}
                  onChange={e => setValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="font-aboreto w-24 border-b border-[#7fff6a] bg-transparent text-center text-2xl tracking-[0.3em] text-[#7fff6a] outline-none"
                  placeholder="0000"
                  aria-label="Channel number"
                />
              </form>
              <p className="font-aboreto mt-4 h-4 text-[10px] tracking-[0.3em] text-red-500">
                {error}
              </p>
            </div>
          )}
        </div>
        <img
          src={cut('crt-transparent-screen')}
          alt=""
          className="relative z-10 w-full select-none"
          draggable={false}
        />
        <div className="mt-3 flex justify-between">
          <button
            type="button"
            onClick={() => submit()}
            className="font-aboreto text-[10px] tracking-[0.3em] text-white/60 hover:text-white"
          >
            TUNE
          </button>
          <button
            type="button"
            onClick={onClose}
            className="font-aboreto text-[10px] tracking-[0.3em] text-white/60 hover:text-white"
          >
            OFF
          </button>
        </div>
      </div>
    </div>
  )
}
