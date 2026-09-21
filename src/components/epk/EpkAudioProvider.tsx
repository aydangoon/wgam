'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { BACKGROUND_TRACK_ID, TRACKS, type Track } from '@/lib/epk/content'

/**
 * Single global audio element for the whole EPK. The background music, the
 * top-right play/pause button and every row in the music player all drive this
 * one element, so starting anything pauses whatever else was playing.
 */
type EpkAudio = {
  tracks: Track[]
  current: Track
  playing: boolean
  currentTime: number
  duration: number
  /** Start (or restart) playback; switches track when an id is given. */
  play: (id?: string) => Promise<void>
  pause: () => void
  /** Toggle the current track, or switch to `id` if it isn't the current one. */
  toggle: (id?: string) => void
  seek: (seconds: number) => void
}

const Ctx = createContext<EpkAudio | null>(null)

function trackById(id: string) {
  return TRACKS.find(t => t.id === id) ?? TRACKS[0]
}

const INITIAL_SRC = trackById(BACKGROUND_TRACK_ID).src

export function EpkAudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentId, setCurrentId] = useState(BACKGROUND_TRACK_ID)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(trackById(BACKGROUND_TRACK_ID).duration)

  const current = useMemo(() => trackById(currentId), [currentId])

  // Keep React state in sync with the element, including OS media keys.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTime = () => setCurrentTime(audio.currentTime)
    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration)
    }
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
    }
  }, [])

  const play = useCallback(
    async (id?: string) => {
      const audio = audioRef.current
      if (!audio) return
      const next = id ? trackById(id) : trackById(currentId)
      const switching = audio.src !== new URL(next.src, window.location.href).href
      if (switching) {
        audio.src = next.src
        setCurrentId(next.id)
        setCurrentTime(0)
        setDuration(next.duration)
      }
      await audio.play()
    },
    [currentId],
  )

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const toggle = useCallback(
    (id?: string) => {
      const audio = audioRef.current
      if (!audio) return
      const isCurrent = !id || id === currentId
      if (isCurrent && !audio.paused) {
        audio.pause()
        return
      }
      play(id).catch(() => {})
    },
    [currentId, play],
  )

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds))
    setCurrentTime(audio.currentTime)
  }, [])

  // When a track finishes, roll into the next one so the music keeps going.
  const onEnded = useCallback(() => {
    const idx = TRACKS.findIndex(t => t.id === currentId)
    const next = TRACKS[(idx + 1) % TRACKS.length]
    play(next.id).catch(() => {})
  }, [currentId, play])

  const value = useMemo<EpkAudio>(
    () => ({
      tracks: TRACKS,
      current,
      playing,
      currentTime,
      duration,
      play,
      pause,
      toggle,
      seek,
    }),
    [current, playing, currentTime, duration, play, pause, toggle, seek],
  )

  return (
    <Ctx.Provider value={value}>
      {/* src is set imperatively in play(); the constant initial prop means
          React never re-sets the attribute (which would reload the media). */}
      <audio ref={audioRef} src={INITIAL_SRC} preload="auto" onEnded={onEnded} />
      {children}
    </Ctx.Provider>
  )
}

export function useEpkAudio() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useEpkAudio must be used inside <EpkAudioProvider>')
  return ctx
}
