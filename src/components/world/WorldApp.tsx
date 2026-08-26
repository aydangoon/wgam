'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { DOCTRINE_TEXT, SCENES, sceneHotspots } from '@/lib/world/graph'
import {
  PROC,
  describeHotspot,
  type Hotspot,
  type LocationId,
  type PuzzleId,
} from '@/lib/world/types'
import { useWorldState } from '@/lib/world/useWorldState'
import WorldHud from './WorldHud'
import SceneStage from './SceneStage'
import CrtTune from './puzzles/CrtTune'
import PasswordDoor from './puzzles/PasswordDoor'
import FoundFootage from './puzzles/FoundFootage'
import MatchStrike from './puzzles/MatchStrike'

const DESKTOP_MIN = 1100
const STATIC_MS = 320
const DEBUG_KEY = 'wgam-world-debug'

type Props = { initialLocation: string }

export default function WorldApp({ initialLocation }: Props) {
  const world = useWorldState(initialLocation)
  const [wide, setWide] = useState(true)
  const [muted, setMuted] = useState(false)
  const [inspect, setInspect] = useState<string | null>(null)
  const [puzzle, setPuzzle] = useState<PuzzleId | null>(null)
  const [footage, setFootage] = useState<number | null>(null)
  const [staticOn, setStaticOn] = useState(false)
  const [inverted, setInverted] = useState(false)
  const [idleTv, setIdleTv] = useState(false)
  const [rabbitClicks, setRabbitClicks] = useState(0)
  const [alleySeq, setAlleySeq] = useState<number[]>([])
  const [debug, setDebug] = useState(false)
  const [hoverHotspot, setHoverHotspot] = useState<Hotspot | null>(null)
  const [hoverIdleTv, setHoverIdleTv] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const staticTimer = useRef<number | undefined>(undefined)

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const mq = () => setWide(window.innerWidth >= DESKTOP_MIN)
    mq()
    window.addEventListener('resize', mq)
    return () => window.removeEventListener('resize', mq)
  }, [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const prevBg = document.body.style.background
    document.body.style.background = '#000'
    return () => {
      document.body.style.overflow = ''
      document.body.style.background = prevBg
    }
  }, [])

  useEffect(() => {
    try {
      setDebug(window.sessionStorage.getItem(DEBUG_KEY) === '1')
    } catch {
      /* ignore */
    }
  }, [])

  const toggleDebug = useCallback(() => {
    setDebug(prev => {
      const next = !prev
      try {
        window.sessionStorage.setItem(DEBUG_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        if ((e.target as HTMLElement | null)?.closest?.('input, textarea')) return
        toggleDebug()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleDebug])

  const flashStatic = useCallback(() => {
    setStaticOn(true)
    if (staticTimer.current) window.clearTimeout(staticTimer.current)
    staticTimer.current = window.setTimeout(() => setStaticOn(false), STATIC_MS)
    burstNoise()
  }, [])

  const travel = useCallback(
    (id: LocationId) => {
      if (id === 'alley' && !world.flags.tuned2071) {
        setInspect('the sunday channel is still snow.')
        return
      }
      if (id === 'chapel' && !world.flags.readDoctrine && !world.flags.chapelFound) {
        setInspect('the margin wants to be followed first.')
        return
      }
      if ((id === 'venue' || id === 'fire') && !world.flags.venueUnlocked) {
        setInspect('chained from the inside. the place is somewhere in the static.')
        return
      }
      if (id === 'fire' && world.location !== 'venue') {
        world.go('venue')
        flashStatic()
        return
      }
      if (id === 'chapel') world.setFlag('chapelFound')
      flashStatic()
      world.go(id)
      setPuzzle(null)
      setFootage(null)
      setInspect(null)
      setInverted(false)
      setHoverHotspot(null)
    },
    [flashStatic, world],
  )

  useEffect(() => {
    if (!world.ready) return
    const loc = world.location
    const f = world.flags
    if ((loc === 'alley' || loc === 'library' || loc === 'chapel') && !f.tuned2071) {
      world.go('screen')
      return
    }
    if (loc === 'chapel' && !f.readDoctrine && !f.chapelFound) {
      world.go('library')
      return
    }
    if ((loc === 'venue' || loc === 'fire') && !f.venueUnlocked) {
      world.go(f.tuned2071 ? 'alley' : 'map')
      setInspect('chained from the inside. the place is somewhere in the static.')
    }
  }, [world.ready, world.location, world.flags, world.go])

  useEffect(() => {
    setHoverHotspot(null)
    setHoverIdleTv(false)
  }, [world.location])

  useEffect(() => {
    if (world.location !== 'map') {
      setIdleTv(false)
      return
    }
    const t = window.setTimeout(() => setIdleTv(true), 30000)
    return () => window.clearTimeout(t)
  }, [world.location])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const loc = world.location
    if (muted) {
      audio.pause()
      return
    }
    if (loc === 'venue') {
      audio.volume = 0.22
      audio.play().catch(() => {})
    } else if (loc === 'fire') {
      audio.volume = 0.8
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [world.location, muted])

  const onActivate = (hotspot: Hotspot) => {
    const action = hotspot.action
    if (!action) return
    switch (action.type) {
      case 'go':
        travel(action.to)
        break
      case 'inspect':
        setInspect(action.text)
        break
      case 'flag':
        world.setFlag(action.flag)
        if (action.flag === 'readDoctrine') {
          world.setFlag('chapelFound')
          setInspect(DOCTRINE_TEXT)
        } else {
          setInspect(action.text ?? '')
        }
        break
      case 'puzzle':
        setPuzzle(action.puzzle)
        break
      case 'rabbit': {
        const n = rabbitClicks + 1
        setRabbitClicks(n)
        if (n >= 3) {
          world.setFlag('rabbitBlink')
          setInspect('something under the canvas blinked.')
        } else {
          setInspect('the flap twitches.')
        }
        break
      }
      case 'footage': {
        setFootage(action.n)
        if (action.n >= 3 && action.n <= 5) {
          const index = (action.n - 3) as 0 | 1 | 2
          const next = [...alleySeq, index].slice(-3)
          setAlleySeq(next)
          if (next[0] === 0 && next[1] === 1 && next[2] === 2) {
            world.setFlag('glyphUnlocked')
          }
        }
        break
      }
      case 'invert':
        if (!reducedMotion) setInverted(v => !v)
        setInspect('the spiral looks back.')
        break
    }
  }

  const hotspots = sceneHotspots(world.location, world.flags)

  const hoverHint = hoverIdleTv
    ? 'idle TV\ngo → THE SCREEN'
    : hoverHotspot
      ? describeHotspot(hoverHotspot)
      : null

  if (!wide) {
    return (
      <div className="world-app relative flex h-screen w-screen items-center justify-center overflow-hidden bg-white">
        <div className="relative z-10 max-w-sm px-8 text-center">
          <p className="font-manufacturing text-3xl text-[#c41e1e]">THE WASTED CITY</p>
          <p className="font-aboreto mt-6 text-xs tracking-[0.25em] text-black/70">
            this frequency is desktop only
          </p>
          <Link
            href="/"
            className="font-aboreto mt-8 inline-block text-[10px] tracking-[0.35em] text-black/50 hover:text-black"
          >
            RETURN
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="world-app relative h-screen w-screen overflow-hidden bg-black">
      <audio ref={audioRef} src="/audio/sample-song.mp3" loop preload="auto" />

      <SceneStage
        hotspots={hotspots}
        bg={SCENES[world.location].bg}
        inverted={inverted}
        debug={debug}
        onActivate={onActivate}
        onHover={setHoverHotspot}
      >
        {world.location === 'map' && idleTv && (
          <button
            type="button"
            className="absolute right-[4%] bottom-[8%] z-20 w-[9%] bg-transparent p-0"
            style={debug ? { outline: '2px solid #c026d3' } : undefined}
            onClick={() => travel('screen')}
            onMouseEnter={() => setHoverIdleTv(true)}
            onMouseLeave={() => setHoverIdleTv(false)}
          >
            <img
              src="/images/world/cut/old-tv-transparent-screen.webp"
              alt=""
              className="world-glitch w-full"
            />
          </button>
        )}
        {world.location === 'screen' && (
          <div
            className="world-scanlines pointer-events-none absolute left-[36%] top-[22%] z-[3] h-[28%] w-[28%] bg-[#031]
            opacity-70"
          />
        )}
        {world.location === 'venue' && (
          <div className="pointer-events-none absolute bottom-[18%] left-1/2 z-[7] w-[44%] -translate-x-1/2">
            <div
              className="h-8 w-full bg-[#1a120c]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, #2a2018 0 6px, #3a2a1c 6px 8px)',
              }}
            />
            <p className="font-aboreto mt-1 text-center text-[9px] tracking-[0.3em] text-black/40">
              striker
            </p>
          </div>
        )}
        {world.location === 'fire' && <FireTitle />}
      </SceneStage>

      <WorldHud
        muted={muted}
        debug={debug}
        onDebug={toggleDebug}
        onBack={() => {
          if (puzzle) {
            setPuzzle(null)
            return
          }
          if (footage !== null) {
            setFootage(null)
            return
          }
          setInspect(null)
          world.back()
        }}
        onMap={() => travel('map')}
        onMute={() => setMuted(m => !m)}
        onExit={() => {
          window.location.href = '/'
        }}
      />

      {inspect && (
        <button
          type="button"
          className="absolute bottom-8 left-1/2 z-30 max-w-3xl -translate-x-1/2 bg-black px-8 py-4 text-left"
          onClick={() => setInspect(null)}
        >
          <p className="font-aboreto text-center text-xs leading-relaxed tracking-[0.14em] text-white sm:text-sm">
            {inspect}
          </p>
        </button>
      )}

      {debug && hoverHint && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-40 max-w-xs whitespace-pre-wrap bg-black px-3 py-2 font-aboreto text-[10px] leading-relaxed tracking-[0.12em] text-white">
          {hoverHint}
        </div>
      )}

      {footage !== null && (
        <FoundFootage n={footage} onClose={() => setFootage(null)} />
      )}

      {puzzle === 'crt' && (
        <CrtTune
          already={world.flags.tuned2071}
          onSolved={() => {
            world.setFlag('tuned2071')
            setInspect('a rabbit face in the snow. MATCH. a stack answers behind the glass.')
          }}
          onClose={() => setPuzzle(null)}
          onStatic={flashStatic}
        />
      )}
      {puzzle === 'password' && (
        <PasswordDoor
          onSolved={() => {
            world.setFlag('knowsMatch')
            world.setFlag('venueUnlocked')
            setPuzzle(null)
            setInspect('the chain sloughs off like dead skin.')
            flashStatic()
          }}
          onClose={() => setPuzzle(null)}
          onStatic={flashStatic}
        />
      )}
      {puzzle === 'strike' && (
        <MatchStrike
          hasMatchbook={world.flags.hasMatchbook}
          onSolved={() => travel('fire')}
          onNeedMatch={() => {
            setPuzzle(null)
            setInspect("you're going to need a match. try the wreck.")
          }}
          onClose={() => setPuzzle(null)}
        />
      )}

      {staticOn && <div className="world-static pointer-events-none absolute inset-0 z-[80]" />}
    </div>
  )
}

function FireTitle() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-end px-6 pb-16">
      <img
        src={`${PROC}/animated-black-splotch.webp`}
        alt=""
        className="pointer-events-none absolute inset-0 m-auto h-[70%] w-[70%] object-contain opacity-50"
      />
      <p className="font-manufacturing relative text-5xl text-black sm:text-7xl">
        Who&apos;s got a match?
      </p>
      <p className="font-aboreto relative mt-4 max-w-lg text-center text-xs tracking-[0.2em] text-black/70">
        do you want to dream with me? or drift into infinity.
      </p>
      <Link
        href="/music"
        className="font-aboreto relative mt-8 bg-[hsl(var(--accent))] px-6 py-3 text-[11px] tracking-[0.35em] text-white"
      >
        LISTEN NOW
      </Link>
    </div>
  )
}

function burstNoise() {
  try {
    const ctx = new AudioContext()
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.22
    const src = ctx.createBufferSource()
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1800
    src.buffer = buffer
    src.connect(filter)
    filter.connect(ctx.destination)
    src.start()
    window.setTimeout(() => ctx.close(), 400)
  } catch {
    /* ignore */
  }
}
