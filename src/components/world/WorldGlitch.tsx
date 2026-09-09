'use client'

import { useEffect, useRef } from 'react'

type Props = {
  active?: boolean
  reducedMotion?: boolean
  children: React.ReactNode
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function nextWaitMs() {
  return rand(10000, 20000)
}

function sliceVars(i: number) {
  const top = rand(8, 76)
  const height = Math.random() < 0.3 ? rand(2.2, 5) : rand(6, 16)
  const bot = Math.max(0, 100 - top - height)
  const dir = Math.random() < 0.5 ? -1 : 1
  return {
    [`--g${i}-top` as const]: `${top}%`,
    [`--g${i}-bot` as const]: `${bot}%`,
    [`--g${i}-dx` as const]: `${dir * rand(18, 64)}px`,
    [`--g${i}-dy` as const]: `${rand(-10, 10)}px`,
    [`--g${i}-skew` as const]: `${dir * rand(7, 18)}deg`,
  }
}

export default function WorldGlitch({ active = true, reducedMotion = false, children }: Props) {
  const baseRef = useRef<HTMLDivElement>(null)
  const shardsRef = useRef<HTMLDivElement>(null)
  const waitTimer = useRef<number | undefined>(undefined)
  const burstTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const clear = () => {
      if (waitTimer.current) window.clearTimeout(waitTimer.current)
      if (burstTimer.current) window.clearTimeout(burstTimer.current)
      const shards = shardsRef.current
      if (shards) shards.replaceChildren()
      baseRef.current?.classList.remove('world-glitch-jitter')
    }

    if (!active || reducedMotion) {
      clear()
      return
    }

    const burst = () => {
      const base = baseRef.current
      const shards = shardsRef.current
      if (!base || !shards) return

      shards.replaceChildren()
      shards.classList.add('is-on')
      const count = Math.random() < 0.45 ? 2 : 1
      const vars: Record<string, string> = {
        '--g-jdx': `${rand(-10, 10)}px`,
        '--g-jsk': `${rand(-5, 5)}deg`,
      }
      for (let i = 0; i < count; i++) {
        Object.assign(vars, sliceVars(i))
        const clone = base.cloneNode(true) as HTMLElement
        clone.removeAttribute('data-glitch-base')
        clone.classList.add('world-glitch-echo')
        shards.appendChild(clone)
      }
      Object.entries(vars).forEach(([k, v]) => {
        shards.style.setProperty(k, v)
        base.style.setProperty(k, v)
      })
      base.classList.add('world-glitch-jitter')

      burstTimer.current = window.setTimeout(() => {
        shards.classList.remove('is-on')
        shards.replaceChildren()
        base.classList.remove('world-glitch-jitter')
      }, rand(110, 240))
    }

    const schedule = () => {
      waitTimer.current = window.setTimeout(() => {
        burst()
        schedule()
      }, nextWaitMs())
    }
    schedule()
    return clear
  }, [active, reducedMotion])

  return (
    <div className="world-tear absolute inset-0 overflow-hidden">
      <div ref={baseRef} data-glitch-base className="world-glitch-base absolute inset-0">
        {children}
      </div>
      <div
        ref={shardsRef}
        className="world-glitch-shards pointer-events-none absolute inset-0 z-[8]"
        aria-hidden
        inert
      />
    </div>
  )
}
