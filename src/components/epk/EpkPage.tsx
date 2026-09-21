'use client'

import { useEffect, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import EpkGate from './EpkGate'
import EpkGrid from './EpkGrid'
import { EpkAudioProvider, useEpkAudio } from './EpkAudioProvider'

export default function EpkPage() {
  return (
    <EpkAudioProvider>
      <EpkShell />
    </EpkAudioProvider>
  )
}

function EpkShell() {
  const audio = useEpkAudio()
  // 'checking' while we probe autoplay; 'gate' if it's blocked; done once entered.
  const [checking, setChecking] = useState(true)
  const [showGate, setShowGate] = useState(false)
  const [entered, setEntered] = useState(false)

  // Probe autoplay on mount. If the browser lets sound play without a gesture
  // (prior interaction / media engagement), skip the gate. Otherwise show it.
  useEffect(() => {
    let cancelled = false
    audio
      .play()
      .then(() => {
        if (cancelled) return
        setEntered(true)
        setChecking(false)
      })
      .catch(() => {
        if (cancelled) return
        setShowGate(true)
        setChecking(false)
      })
    return () => {
      cancelled = true
    }
    // Run once: the probe should not re-fire when the audio context updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lock scroll until entered (during the probe and while the gate is closed).
  useEffect(() => {
    if (entered) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [entered])

  const handleEnter = () => {
    audio.play().catch(() => {})
    setEntered(true)
  }

  return (
    <div className="relative min-h-screen bg-white text-black">
      {/* Black cover during the brief autoplay probe to avoid a content flash. */}
      {checking && <div className="fixed inset-0 z-[90] bg-black" />}

      {/* Gate only when autoplay is blocked and a gesture is required. */}
      {showGate && <EpkGate onEnter={handleEnter} />}

      {/* Fixed play/pause toggle for whatever track is current, top-right */}
      <button
        type="button"
        onClick={() => audio.toggle()}
        aria-label={
          audio.playing
            ? `Pause ${audio.current.title}`
            : `Play ${audio.current.title}`
        }
        title={audio.current.title}
        className="fixed right-4 top-4 z-[80] flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-black shadow-sm sm:right-6 sm:top-6"
        style={{
          opacity: entered ? 1 : 0,
          pointerEvents: entered ? 'auto' : 'none',
        }}
      >
        {audio.playing ? (
          <Pause className="h-5 w-5" strokeWidth={1.8} />
        ) : (
          <Play className="ml-0.5 h-5 w-5" strokeWidth={1.8} />
        )}
      </button>

      <EpkGrid />
    </div>
  )
}
