'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { worldAudio } from '@/lib/world/audio'

/** 500ms per word — slower than average silent reading for tracked UI type. */
const MS_PER_WORD = 500
const INSPECT_MIN_MS = 2000
const INSPECT_FADE_MS = 800
const MS_PER_CHAR = 32

type Props = {
  text: string
  onDone: () => void
  muted?: boolean
  reducedMotion?: boolean
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function inspectDurationMs(text: string) {
  return Math.max(INSPECT_MIN_MS, Math.round(wordCount(text) * MS_PER_WORD))
}

export default function InspectBanner({
  text,
  onDone,
  muted = false,
  reducedMotion = false,
}: Props) {
  const [shown, setShown] = useState(reducedMotion ? text.length : 0)
  const [fading, setFading] = useState(false)
  const complete = shown >= text.length

  useEffect(() => {
    if (reducedMotion) return
    if (shown >= text.length) return
    const timer = window.setTimeout(() => {
      const ch = text[shown]
      setShown(shown + 1)
      if (ch && !/\s/.test(ch) && !muted) {
        worldAudio().playTypeTick()
      }
    }, MS_PER_CHAR)
    return () => window.clearTimeout(timer)
  }, [shown, text, reducedMotion, muted])

  useEffect(() => {
    if (shown < text.length) return
    const totalMs = inspectDurationMs(text)
    const fadeMs = INSPECT_FADE_MS
    const holdMs = Math.max(0, totalMs - fadeMs)
    const fadeTimer = window.setTimeout(() => setFading(true), holdMs)
    const doneTimer = window.setTimeout(onDone, totalMs)
    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(doneTimer)
    }
  }, [shown, text, onDone])

  return (
    <button
      type="button"
      className={cn(
        'absolute bottom-8 left-1/2 z-[60] max-w-3xl -translate-x-1/2 bg-black px-8 py-4 text-left transition-opacity ease-out',
        fading ? 'opacity-0' : 'opacity-100',
      )}
      style={{ transitionDuration: `${INSPECT_FADE_MS}ms` }}
      onClick={() => {
        if (!complete) setShown(text.length)
        else onDone()
      }}
    >
      <p className="font-aboreto relative text-left text-xs leading-relaxed tracking-[0.14em] text-white sm:text-sm">
        <span className="invisible" aria-hidden>
          {text}
        </span>
        <span className="absolute inset-0">{text.slice(0, shown)}</span>
      </p>
    </button>
  )
}
