'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { jaggedCellClip } from '@/lib/jagged'

const CLIP = jaggedCellClip(4242, 6, 6)
const DEFAULT_MS = 2200

/**
 * Tiny self-contained transient toast. Call `show(message)` and it appears
 * bottom-center, then fades out on its own. Repeated calls restart the timer.
 */
export function useTransientToast(durationMs = DEFAULT_MS) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback(
    (msg: string) => {
      setMessage(msg)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setMessage(null), durationMs)
    },
    [durationMs],
  )

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return { message, show }
}

export function Toast({ message }: { message: string | null }) {
  // Keep the last message mounted while fading out so the text doesn't vanish
  // before the opacity transition finishes.
  const [shown, setShown] = useState<string | null>(message)
  useEffect(() => {
    if (message) setShown(message)
  }, [message])

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex justify-center px-6"
    >
      <div
        className="bg-black px-7 py-3.5 transition-all duration-300 ease-out"
        style={{
          clipPath: CLIP,
          WebkitClipPath: CLIP,
          opacity: message ? 1 : 0,
          transform: message ? 'translateY(0)' : 'translateY(10px)',
        }}
      >
        <span className="font-aboreto flex items-center gap-3 text-sm tracking-[0.3em] text-white">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />
          {shown}
        </span>
      </div>
    </div>
  )
}
