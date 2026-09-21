'use client'

import { useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { MUSIC_VIDEO } from '@/lib/epk/content'
import { useEpkAudio } from './EpkAudioProvider'

/**
 * The one music video, streamed from Vercel Blob. Tied into the global EPK
 * audio: starting the video pauses the demo player, and starting a demo pauses
 * the video, so the two never play over each other.
 */
export default function MusicVideo() {
  const audio = useEpkAudio()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)

  // A demo track starting elsewhere pauses the video.
  useEffect(() => {
    const video = videoRef.current
    if (audio.playing && video && !video.paused) video.pause()
  }, [audio.playing])

  const start = () => {
    const video = videoRef.current
    if (!video) return
    setStarted(true)
    video.play().catch(() => {})
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          src={MUSIC_VIDEO.mp4.url}
          poster={MUSIC_VIDEO.poster.url}
          preload="metadata"
          playsInline
          controls={started}
          onPlay={() => audio.pause()}
          className="absolute inset-0 h-full w-full"
        />
        {/* Poster overlay with our own play button until the first play. */}
        {!started && (
          <button
            type="button"
            onClick={start}
            aria-label={`Play ${MUSIC_VIDEO.title} music video`}
            className="group absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/25 transition-colors hover:bg-black/10"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--accent))] transition-transform group-hover:scale-110">
              <Play className="ml-1 h-7 w-7 text-black" fill="black" />
            </span>
          </button>
        )}
      </div>
      <div className="font-aboreto text-center text-base font-bold tracking-[0.2em] text-black">
        {MUSIC_VIDEO.title.toUpperCase()}
      </div>
    </div>
  )
}
