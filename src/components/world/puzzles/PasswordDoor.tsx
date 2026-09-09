'use client'

import { useState } from 'react'
import { cut } from '@/lib/world/types'
import { worldAudio } from '@/lib/world/audio'

type Props = {
  onSolved: () => void
  onClose: () => void
  onStatic: () => void
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z]/g, '')
}

export default function PasswordDoor({ onSolved, onClose, onStatic }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const n = normalize(value)
    if (n === 'underthespiral' || n === 'match' || n === 'whosgotamatch') {
      onSolved()
      return
    }
    setError('WRONG PLACE')
    onStatic()
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75">
      <div className="relative flex w-[min(520px,88vw)] flex-col items-center">
        <img
          src={cut('moldy-closed-door')}
          alt=""
          className="max-h-[58vh] w-auto select-none object-contain"
          draggable={false}
        />
        <form
          onSubmit={submit}
          className="absolute bottom-[14%] left-1/2 w-[78%] -translate-x-1/2 bg-black/80 px-4 py-4"
        >
          <p className="font-aboreto mb-3 text-center text-lg font-bold tracking-[0.28em] text-[#7fff6a]/80">
            NAME THE PLACE
          </p>
          <input
            autoFocus
            value={value}
            onChange={e => {
              const next = e.target.value
              if (next !== value) worldAudio().playTypeTick()
              setValue(next)
            }}
            className="font-aboreto w-full border border-[#7fff6a]/40 bg-black px-2 py-2 text-center text-xl font-bold tracking-[0.2em] text-[#7fff6a] outline-none sm:text-2xl"
            aria-label="Password"
            autoComplete="off"
          />
          <button
            type="submit"
            className="font-aboreto mt-3 w-full text-xl font-bold tracking-[0.28em] text-[#7fff6a]/80 hover:text-[#7fff6a]"
          >
            NAME IT
          </button>
          <p className="font-aboreto mt-2 min-h-6 text-center text-xl font-bold tracking-[0.25em] text-red-500">
            {error}
          </p>
        </form>
        <button
          type="button"
          onClick={onClose}
          className="font-aboreto mt-4 text-xl font-bold tracking-[0.25em] text-white/50 hover:text-white"
        >
          STEP BACK
        </button>
      </div>
    </div>
  )
}
