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
import { sfxForHotspot, worldAudio } from '@/lib/world/audio'
import { cn } from '@/lib/utils'
import { useWorldState } from '@/lib/world/useWorldState'
import WorldHud from './WorldHud'
import WorldStart from './WorldStart'
import WorldGlitch from './WorldGlitch'
import SceneStage from './SceneStage'
import InspectBanner from './InspectBanner'
import CrtTune from './puzzles/CrtTune'
import PasswordDoor from './puzzles/PasswordDoor'
import FoundFootage from './puzzles/FoundFootage'
import MatchStrike from './puzzles/MatchStrike'

const DESKTOP_MIN = 1100
const IS_DEV = process.env.NODE_ENV === 'development'
const STATIC_MS = 320
const DEBUG_KEY = 'wgam-world-debug'
const CHAPEL_SPIRAL_HOLD_MS = 3000
const CHAPEL_SPIRAL_OUT_MS = 950
const HEAVENLY_MS = 15570
const IGNITE_COVER_MS = 700
const IGNITE_HOLD_MS = 850
const IGNITE_FADE_MS = 1000

type Props = { initialLocation: string }

export default function WorldApp({ initialLocation }: Props) {
  const world = useWorldState(initialLocation)
  const [wide, setWide] = useState(true)
  const [muted, setMuted] = useState(false)
  const [inspect, setInspect] = useState<string | null>(null)
  const [inspectGen, setInspectGen] = useState(0)
  const [puzzle, setPuzzle] = useState<PuzzleId | null>(null)
  const [footage, setFootage] = useState<number | null>(null)
  const [staticOn, setStaticOn] = useState(false)
  const [inverted, setInverted] = useState(false)
  const [rabbitClicks, setRabbitClicks] = useState(0)
  const [alleySeq, setAlleySeq] = useState<number[]>([])
  const [debug, setDebug] = useState(false)
  const [hoverHotspot, setHoverHotspot] = useState<Hotspot | null>(null)
  const [chapelSpiralPhase, setChapelSpiralPhase] = useState<'off' | 'in' | 'out'>('off')
  const [chapelSpiralGen, setChapelSpiralGen] = useState(0)
  const [ignite, setIgnite] = useState<'off' | 'in' | 'hold' | 'out'>('off')
  const [started, setStarted] = useState(false)
  const [intro, setIntro] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const staticTimer = useRef<number | undefined>(undefined)
  const chapelSpiralTimer = useRef<number | undefined>(undefined)
  const chapelSpiralOutTimer = useRef<number | undefined>(undefined)
  const invertTimer = useRef<number | undefined>(undefined)
  const invertGen = useRef(0)
  const igniteTimer = useRef<number | undefined>(undefined)
  const igniteHoldTimer = useRef<number | undefined>(undefined)
  const igniteFadeTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const mq = () => setWide(window.innerWidth >= DESKTOP_MIN)
    mq()
    window.addEventListener('resize', mq)
    return () => window.removeEventListener('resize', mq)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReducedMotion(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
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
    if (!IS_DEV) return
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
    if (!IS_DEV) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        if ((e.target as HTMLElement | null)?.closest?.('input, textarea')) return
        toggleDebug()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleDebug])

  const showInspect = useCallback((text: string) => {
    if (!text) {
      setInspect(null)
      return
    }
    setInspect(text)
    setInspectGen(g => g + 1)
  }, [])

  const clearInspect = useCallback(() => setInspect(null), [])

  const flashStatic = useCallback(() => {
    setStaticOn(true)
    if (staticTimer.current) window.clearTimeout(staticTimer.current)
    staticTimer.current = window.setTimeout(() => setStaticOn(false), STATIC_MS)
    burstNoise()
  }, [])

  const clearIgniteTimers = useCallback(() => {
    if (igniteTimer.current) window.clearTimeout(igniteTimer.current)
    if (igniteHoldTimer.current) window.clearTimeout(igniteHoldTimer.current)
    if (igniteFadeTimer.current) window.clearTimeout(igniteFadeTimer.current)
  }, [])

  const igniteToFire = useCallback(() => {
    setInspect(null)
    setHoverHotspot(null)
    setInverted(false)
    if (reducedMotion) {
      setPuzzle(null)
      world.go('fire')
      setIgnite('off')
      return
    }
    clearIgniteTimers()
    setIgnite('in')
    igniteTimer.current = window.setTimeout(() => {
      world.go('fire')
      setPuzzle(null)
      setIgnite('hold')
      igniteHoldTimer.current = window.setTimeout(() => {
        setIgnite('out')
        igniteFadeTimer.current = window.setTimeout(() => {
          setIgnite('off')
        }, IGNITE_FADE_MS)
      }, IGNITE_HOLD_MS)
    }, IGNITE_COVER_MS)
  }, [clearIgniteTimers, reducedMotion, world])

  const travel = useCallback(
    (id: LocationId) => {
      if (id === 'alley' && !world.flags.tuned2071) {
        showInspect('the sunday channel is still snow.')
        return
      }
      if (id === 'chapel' && !world.flags.readDoctrine && !world.flags.chapelFound) {
        showInspect('the margin wants to be followed first.')
        return
      }
      if ((id === 'venue' || id === 'fire') && !world.flags.venueUnlocked) {
        showInspect('chained from the inside. the place is somewhere in the static.')
        return
      }
      if (id === 'fire' && world.location !== 'venue') {
        world.go('venue')
        flashStatic()
        return
      }
      if (id === 'fire' && world.location === 'venue') {
        igniteToFire()
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
    [flashStatic, igniteToFire, showInspect, world],
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
      showInspect('chained from the inside. the place is somewhere in the static.')
    }
  }, [world.ready, world.location, world.flags, world.go, showInspect])

  const clearChapelSpiralTimers = useCallback(() => {
    if (chapelSpiralTimer.current) window.clearTimeout(chapelSpiralTimer.current)
    if (chapelSpiralOutTimer.current) window.clearTimeout(chapelSpiralOutTimer.current)
  }, [])

  const clearInvertVision = useCallback(() => {
    invertGen.current += 1
    if (invertTimer.current) {
      window.clearTimeout(invertTimer.current)
      invertTimer.current = undefined
    }
  }, [])

  const startInvertVision = useCallback(() => {
    if (invertTimer.current) return
    const gen = invertGen.current + 1
    invertGen.current = gen
    if (!reducedMotion) setInverted(true)
    worldAudio().pauseAmbient()
    const armEnd = (ms: number) => {
      if (invertGen.current !== gen) return
      if (invertTimer.current) window.clearTimeout(invertTimer.current)
      invertTimer.current = window.setTimeout(() => {
        if (invertGen.current !== gen) return
        invertTimer.current = undefined
        setInverted(false)
        worldAudio().resumeAmbient()
      }, ms)
    }
    armEnd(HEAVENLY_MS)
    worldAudio().playSting('heavenly', { gain: 0.85, onReady: armEnd })
  }, [reducedMotion])

  const showChapelSpiral = useCallback(() => {
    clearChapelSpiralTimers()
    setChapelSpiralPhase('in')
    setChapelSpiralGen(g => g + 1)
    worldAudio().playSfx('portal-opens', { gain: 0.9 })
    chapelSpiralTimer.current = window.setTimeout(() => {
      setChapelSpiralPhase('out')
      chapelSpiralOutTimer.current = window.setTimeout(() => {
        setChapelSpiralPhase('off')
      }, CHAPEL_SPIRAL_OUT_MS)
    }, CHAPEL_SPIRAL_HOLD_MS)
  }, [clearChapelSpiralTimers])

  useEffect(() => {
    return () => {
      clearChapelSpiralTimers()
      clearIgniteTimers()
      clearInvertVision()
    }
  }, [clearChapelSpiralTimers, clearIgniteTimers, clearInvertVision])

  useEffect(() => {
    setHoverHotspot(null)
    setInverted(false)
    setChapelSpiralPhase('off')
    clearChapelSpiralTimers()
    clearInvertVision()
  }, [world.location, clearChapelSpiralTimers, clearInvertVision])

  useEffect(() => {
    if (!world.ready) return
    worldAudio().preloadIntro(world.location)
  }, [world.ready, world.location])

  useEffect(() => {
    if (!started) return
    const audio = worldAudio()
    audio.unlock()
    audio.setMuted(muted)
    audio.setAmbient(world.location)
  }, [world.location, muted, started])

  useEffect(() => {
    if (!started) return
    if (world.flags.venueUnlocked) {
      worldAudio().preloadLate()
      return
    }
    const timer = window.setTimeout(() => worldAudio().preloadLate(), 4000)
    return () => window.clearTimeout(timer)
  }, [started, world.flags.venueUnlocked])

  useEffect(() => {
    return () => worldAudio().stop()
  }, [])

  const onActivate = (hotspot: Hotspot) => {
    const action = hotspot.action
    if (!action) return
    if (action.type !== 'invert' && !(action.type === 'flag' && action.flag === 'readDoctrine')) {
      worldAudio().playSfx(sfxForHotspot(hotspot))
    }
    switch (action.type) {
      case 'go':
        travel(action.to)
        break
      case 'inspect':
        showInspect(action.text)
        break
      case 'flag':
        world.setFlag(action.flag)
        if (action.flag === 'readDoctrine') {
          world.setFlag('chapelFound')
          showInspect(DOCTRINE_TEXT)
          showChapelSpiral()
        } else {
          showInspect(action.text ?? '')
        }
        break
      case 'puzzle':
        if (action.puzzle === 'strike' && !world.flags.hasMatchbook) {
          showInspect("a giant match striker, you'll need a match to light it")
          break
        }
        setInspect(null)
        setPuzzle(action.puzzle)
        break
      case 'rabbit': {
        const n = rabbitClicks + 1
        setRabbitClicks(n)
        if (n >= 3) {
          world.setFlag('rabbitBlink')
          showInspect('something under the canvas blinked.')
        } else {
          showInspect('the flap twitches.')
        }
        break
      }
      case 'footage': {
        setInspect(null)
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
        startInvertVision()
        showInspect(
          'the spiral looks back. "who\'s got a match... you seek who\'s got a match" it whispers',
        )
        break
    }
  }

  const hotspots = sceneHotspots(world.location, world.flags)
    .filter(h => h.id !== 'lib-spiral' || chapelSpiralPhase !== 'off')
    .map(h =>
      h.id !== 'lib-spiral'
        ? h
        : {
            ...h,
            remountKey: chapelSpiralGen,
            className:
              chapelSpiralPhase === 'out' ? 'world-lib-spiral-out' : 'world-lib-spiral-in',
          },
    )

  const hoverHint = hoverHotspot ? describeHotspot(hoverHotspot) : null

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
    <div
      className={cn(
        'world-app relative h-screen w-screen overflow-hidden bg-black',
      )}
      onPointerDown={() => worldAudio().unlock()}
    >
      <div className="absolute inset-0 grayscale">
      <div inert={!started}>
        <WorldGlitch active={started} reducedMotion={reducedMotion}>
          <SceneStage
            hotspots={hotspots}
            bg={SCENES[world.location].bg}
            inverted={inverted}
            club={world.location === 'venue'}
            debug={debug}
            onActivate={onActivate}
            onHover={setHoverHotspot}
          >
            {world.location === 'venue' && (
              <div className="pointer-events-none absolute bottom-[calc(14%-50px)] left-1/2 z-[7] w-[48%] -translate-x-1/2">
                <div
                  className="h-20 w-full border border-[#8a6a48]/80 bg-[#4a3224] shadow-[inset_0_2px_0_rgba(255,210,160,0.22),0_0_18px_rgba(196,80,30,0.28)]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, #6a4a32 0 10px, #8a6244 10px 14px)',
                  }}
                />
              </div>
            )}
            {world.location === 'fire' && <FireTitle />}
          </SceneStage>
        </WorldGlitch>
      </div>

      {started && (
        <WorldHud
          dev={IS_DEV}
          muted={muted}
          debug={debug}
          onDebug={toggleDebug}
          onResetFlags={() => {
            world.reset()
            setPuzzle(null)
            setFootage(null)
            setInspect(null)
            setInverted(false)
            setChapelSpiralPhase('off')
            clearChapelSpiralTimers()
            clearInvertVision()
            worldAudio().stopSting()
            worldAudio().resumeAmbient()
            setIgnite('off')
            clearIgniteTimers()
            setRabbitClicks(0)
            setAlleySeq([])
            setHoverHotspot(null)
          }}
          onBack={() => {
            if (puzzle) {
              setPuzzle(null)
              return
            }
            if (footage !== null) {
              setFootage(null)
              return
            }
            clearInspect()
            world.back()
          }}
          onMap={() => travel('map')}
          onMute={() => setMuted(m => !m)}
          onMenuOpen={clearInspect}
          onExit={() => {
            window.location.href = '/'
          }}
        />
      )}

      {started && inspect && puzzle == null && footage == null && (
        <InspectBanner
          key={inspectGen}
          text={inspect}
          onDone={clearInspect}
          muted={muted}
          reducedMotion={reducedMotion}
        />
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
            showInspect(
              'the static stops and a white mask appears. the stack of tvs slowly moves to reveal an entrance',
            )
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
            showInspect(
              'the chain falls away. you hear a muffled pulsing noise from inside',
            )
            flashStatic()
          }}
          onClose={() => setPuzzle(null)}
          onStatic={flashStatic}
        />
      )}
      {puzzle === 'strike' && (
        <MatchStrike
          onSolved={() => travel('fire')}
          onClose={() => setPuzzle(null)}
        />
      )}

      {ignite !== 'off' && (
        <div
          className={cn(
            'world-ignite pointer-events-none absolute inset-0 z-[75]',
            ignite === 'in' && 'world-ignite-in',
            ignite === 'hold' && 'world-ignite-hold',
            ignite === 'out' && 'world-ignite-out',
          )}
        >
          <div className="world-ignite-wash" />
          <div className="world-ignite-bulb world-ignite-bulb-a" />
          <div className="world-ignite-bulb world-ignite-bulb-b" />
          <div className="world-ignite-bulb world-ignite-bulb-c" />
          <div className="world-ignite-bulb world-ignite-bulb-d" />
          <div className="world-ignite-bulb world-ignite-bulb-e" />
          <div className="world-ignite-bulb world-ignite-bulb-f" />
        </div>
      )}

      {staticOn && <div className="world-static pointer-events-none absolute inset-0 z-[80]" />}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[90] bg-repeat opacity-[0.08] mix-blend-overlay"
        style={{ backgroundImage: `url(${PROC}/film-grain-overlay.webp)` }}
      />
      </div>

      {intro && (
        <WorldStart
          onUnlock={() => {
            worldAudio().unlock()
            setMuted(false)
            setStarted(true)
          }}
          onReady={() => setIntro(false)}
        />
      )}
    </div>
  )
}

function FireTitle() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
      <p className="font-manufacturing relative text-center text-5xl text-white sm:text-7xl">
        Who&apos;s got a match?
      </p>
      <p className="font-aboreto relative mt-4 max-w-2xl text-center text-xl font-bold tracking-[0.2em] text-white sm:text-2xl">
        do you want to dream with me? or drift into infinity.
      </p>
      <Link
        href="/music"
        className="font-aboreto relative mt-8 bg-[hsl(var(--accent))] px-12 py-6 text-[22px] tracking-[0.35em] text-white"
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
