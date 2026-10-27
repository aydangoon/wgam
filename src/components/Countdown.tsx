'use client'

import { useEffect, useState } from 'react'

/**
 * Midnight at the start of the next local Monday, i.e. the instant the
 * current week "ends" (Sunday 23:59:59.999 local). If we're already past it
 * (can't happen except at the exact boundary) roll forward a week.
 */
function nextWeekEnd(now: Date) {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay() // 0 = Sunday
  const daysUntilMonday = ((8 - dow) % 7) || 7
  d.setDate(d.getDate() + daysUntilMonday)
  return d
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return [pad(days), pad(hours), pad(mins), pad(secs)]
}

const PLACEHOLDER = ['00', '00', '00', '00']
const LABELS = ['DAYS', 'HRS', 'MIN', 'SEC']

type Props = {
  className?: string
}

export default function Countdown({ className }: Props) {
  // Start with a stable placeholder so SSR and the first client render match.
  const [groups, setGroups] = useState<string[]>(PLACEHOLDER)

  useEffect(() => {
    let target = nextWeekEnd(new Date())
    const tick = () => {
      const now = new Date()
      if (now >= target) target = nextWeekEnd(now) // weekly reset
      setGroups(parts(target.getTime() - now.getTime()))
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  const label = groups.map((g, i) => `${g} ${LABELS[i].toLowerCase()}`).join(', ')

  return (
    <div
      role="timer"
      aria-label={label}
      className={`font-aboreto flex items-start justify-center text-white ${className ?? ''}`}
    >
      {groups.map((g, gi) => (
        <div key={gi} className="flex items-start" aria-hidden>
          {gi > 0 && <div className="mx-3 mt-2 h-8 w-px bg-white/25 sm:mx-5 sm:h-10" />}
          <div className="flex flex-col items-center">
            <div className="flex text-3xl leading-none tabular-nums sm:text-5xl">
              {g.split('').map((ch, ci) => (
                <span key={ci} className="inline-block text-center" style={{ width: '0.72em' }}>
                  {ch}
                </span>
              ))}
            </div>
            <div className="mt-2 text-[0.6rem] tracking-[0.3em] text-white/50 sm:text-[0.65rem]">
              {LABELS[gi]}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
