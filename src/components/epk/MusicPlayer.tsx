'use client'

import { Pause, Play } from 'lucide-react'
import { formatDuration } from '@/lib/epk/content'
import { useEpkAudio } from './EpkAudioProvider'

/** Three independently bouncing bars shown on the row that is currently playing. */
function Equalizer() {
  return (
    <span className="flex h-4 w-4 items-end justify-center gap-[2px]" aria-hidden>
      <span className="epk-eq-bar w-[3px] rounded-t-[1px] bg-[hsl(var(--accent))]" />
      <span className="epk-eq-bar w-[3px] rounded-t-[1px] bg-[hsl(var(--accent))]" />
      <span className="epk-eq-bar w-[3px] rounded-t-[1px] bg-[hsl(var(--accent))]" />
    </span>
  )
}

export default function MusicPlayer() {
  const audio = useEpkAudio()
  const progress = audio.duration > 0 ? audio.currentTime / audio.duration : 0

  return (
    <div className="flex h-full min-h-[240px] flex-col gap-4 rounded-xl bg-[#121212] p-5 text-white">
      {/* Header: cover, now playing, big toggle */}
      <div className="flex items-center gap-4">
        <img
          src="/images/processed/wgam-front-cover.webp"
          alt=""
          className="h-16 w-16 shrink-0 rounded-sm object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold tracking-[0.3em] text-white/40">
            {audio.playing ? 'NOW PLAYING' : 'PAUSED'}
          </div>
          <div className="truncate text-lg font-bold leading-tight">
            {audio.current.title}
          </div>
          <div className="text-sm text-white/60">Who&apos;s Got a Match? · Demos</div>
        </div>
        <button
          type="button"
          onClick={() => audio.toggle()}
          aria-label={audio.playing ? 'Pause' : 'Play'}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-black transition-transform hover:scale-105"
        >
          {audio.playing ? (
            <Pause className="h-6 w-6" fill="black" />
          ) : (
            <Play className="ml-0.5 h-6 w-6" fill="black" />
          )}
        </button>
      </div>

      {/* Scrubber */}
      <div className="flex items-center gap-3 text-xs tabular-nums text-white/50">
        <span className="w-9 text-right">{formatDuration(audio.currentTime)}</span>
        <input
          type="range"
          min={0}
          max={audio.duration || 0}
          step={0.1}
          value={Math.min(audio.currentTime, audio.duration || 0)}
          onChange={e => audio.seek(Number(e.target.value))}
          aria-label="Seek"
          className="epk-scrubber flex-1"
          style={{ ['--progress' as string]: `${progress * 100}%` }}
        />
        <span className="w-9">{formatDuration(audio.duration)}</span>
      </div>

      {/* Track list */}
      <ul className="flex flex-1 flex-col justify-center divide-y divide-white/10 text-sm">
        {audio.tracks.map((t, i) => {
          const isCurrent = t.id === audio.current.id
          const isPlaying = isCurrent && audio.playing
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => audio.toggle(t.id)}
                aria-label={isPlaying ? `Pause ${t.title}` : `Play ${t.title}`}
                aria-current={isCurrent ? 'true' : undefined}
                className={`group flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:text-white ${
                  isCurrent ? 'text-white' : 'text-white/80'
                }`}
              >
                <span className="flex w-5 shrink-0 items-center justify-center">
                  {isPlaying ? (
                    <>
                      <span className="group-hover:hidden">
                        <Equalizer />
                      </span>
                      <Pause
                        className="hidden h-4 w-4 group-hover:block"
                        fill="currentColor"
                      />
                    </>
                  ) : (
                    <>
                      <span className="w-4 text-right tabular-nums text-white/40 group-hover:hidden">
                        {i + 1}
                      </span>
                      <Play
                        className="hidden h-4 w-4 group-hover:block"
                        fill="currentColor"
                      />
                    </>
                  )}
                </span>
                <span
                  className={`flex-1 truncate ${
                    isCurrent ? 'text-[hsl(var(--accent))]' : ''
                  }`}
                >
                  {t.title}
                </span>
                <span className="tabular-nums text-white/30">
                  {formatDuration(t.duration)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="text-[10px] font-bold tracking-[0.3em] text-white/30">
        UNRELEASED DEMOS · DEBUT EP JANUARY 2027
      </div>
    </div>
  )
}
