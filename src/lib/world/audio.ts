import type { Hotspot, LocationId } from './types'

const AUDIO_ROOT = '/audio/world'
const SONG_FALLBACK = '/audio/sample-song.mp3'

const AREA_FADE_S = 1.2
const LOOP_CROSSFADE_S = 1.5
const MUTE_FADE_S = 0.08

const SFX_FILES = [
  'click',
  'type',
  'fabric',
  'static',
  'paper',
  'metal',
  'door',
  'bone',
  'match',
  'success',
  'portal-opens',
  'heavenly',
] as const

export type SfxId = (typeof SFX_FILES)[number]

const DEFAULT_AMB_GAIN = 0.32
const FIRE_MUSIC_GAIN = 0.5
const FIRE_CRACKLE_GAIN = 0.22
const FIRE_CRACKLE_URL = `${AUDIO_ROOT}/amb/fire.mp3`

function sfxUrl(id: string) {
  return `${AUDIO_ROOT}/sfx/${id}.mp3`
}

function ambUrl(id: LocationId) {
  if (id === 'fire') return `${AUDIO_ROOT}/amb/fire-music.mp3`
  if (id === 'tents' || id === 'screen') return `${AUDIO_ROOT}/amb/map.mp3`
  if (id === 'library') return `${AUDIO_ROOT}/amb/alley.mp3`
  return `${AUDIO_ROOT}/amb/${id}.mp3`
}

const PRIORITY_SFX: SfxId[] = ['click', 'type', 'paper', 'door', 'portal-opens']
const REST_SFX: SfxId[] = ['metal', 'match', 'success', 'heavenly']
const EARLY_AMB: LocationId[] = ['map', 'alley', 'scrapyard', 'chapel']
const LATE_URLS = [
  `${AUDIO_ROOT}/amb/venue.mp3`,
  `${AUDIO_ROOT}/amb/fire-music.mp3`,
  FIRE_CRACKLE_URL,
]

function ambientGain(id: LocationId, usedSongFallback: boolean) {
  if (usedSongFallback && id === 'fire') return 0.8
  if (usedSongFallback && id === 'venue') return 0.22
  if (id === 'fire') return FIRE_MUSIC_GAIN
  if (id === 'venue') return 0.4
  return DEFAULT_AMB_GAIN
}

type Bed = {
  out: GainNode
  sources: AudioBufferSourceNode[]
  timer: number | undefined
}

function sfxFromId(id: string): SfxId {
  const s = id.toLowerCase()
  if (s.includes('spiral')) return 'click'
  if (
    s.includes('flyer') ||
    s.includes('book') ||
    s.includes('shelf') ||
    s.includes('worn') ||
    s.includes('cover') ||
    s.startsWith('lib')
  ) {
    return 'paper'
  }
  if (s.includes('tv') || s.includes('screen') || s.includes('crt') || s.includes('footage')) {
    return 'static'
  }
  if (s.includes('match') || s.includes('striker')) return 'match'
  if (s.includes('door')) return 'door'
  if (s.includes('bone') || s.includes('angel')) return 'bone'
  if (s.includes('tent') || s.includes('rabbit')) return 'fabric'
  if (s.includes('car') || s.includes('scrap') || s.includes('barrel') || s.includes('wreck')) {
    return 'metal'
  }
  return 'click'
}

export function sfxForHotspot(hotspot: Hotspot): SfxId {
  if (hotspot.sfx && (SFX_FILES as readonly string[]).includes(hotspot.sfx)) {
    return hotspot.sfx as SfxId
  }
  if (hotspot.sfx) return 'click'
  return sfxFromId(hotspot.id)
}

class WorldAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfxGain: GainNode | null = null
  private beds: [Bed, Bed] | null = null
  private crackleBed: Bed | null = null
  private crackleOn = false
  private activeBed = 0
  private buffers = new Map<string, AudioBuffer | null>()
  private loads = new Map<string, Promise<AudioBuffer | null>>()
  private raws = new Map<string, ArrayBuffer>()
  private rawLoads = new Map<string, Promise<ArrayBuffer | null>>()
  private muted = false
  private location: LocationId | null = null
  private ambientGen = 0
  private pending: { id: LocationId; buffer: AudioBuffer; gain: number } | null = null
  private tvStatic: { src: AudioBufferSourceNode; gain: GainNode } | null = null
  private sting: AudioBufferSourceNode | null = null
  private ambientPaused = false
  private heldAmbientGain = 0

  unlock() {
    const ctx = this.ensureCtx()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => this.flushPending()).catch(() => {})
    } else {
      this.flushPending()
    }
    for (const id of PRIORITY_SFX) void this.loadBuffer(sfxUrl(id))
  }

  setMuted(muted: boolean) {
    this.muted = muted
    const ctx = this.ensureCtx()
    const master = this.master
    if (!ctx || !master) return
    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(muted ? 0 : 1, now + MUTE_FADE_S)
  }

  isMuted() {
    return this.muted
  }

  preloadIntro(location: LocationId) {
    void this.preloadIntroAsync(location)
  }

  preloadLate() {
    void Promise.all(LATE_URLS.map(url => this.prefetch(url)))
  }

  setAmbient(id: LocationId) {
    this.unlock()
    if (this.location === id) return
    this.ambientPaused = false
    this.stopSting()
    this.location = id
    const gen = ++this.ambientGen
    void this.startAmbient(id, gen)
  }

  playSfx(id: SfxId | string, opts?: { rate?: number; gain?: number }) {
    this.unlock()
    if (this.muted) return
    void this.playSfxAsync(id, opts)
  }

  playTypeTick() {
    this.unlock()
    if (this.muted) return
    this.playTypeTickNow()
  }

  setTvStatic(on: boolean, gain = 0.03) {
    this.unlock()
    if (on) this.startTvStatic(gain)
    else this.stopTvStatic()
  }

  pauseAmbient() {
    this.unlock()
    if (this.ambientPaused) return
    this.ambientPaused = true
    this.heldAmbientGain = this.location
      ? ambientGain(this.location, false)
      : DEFAULT_AMB_GAIN
    const beds = this.beds
    if (!beds) return
    this.fadeBed(beds[this.activeBed], 0, 0.45)
    if (this.crackleOn && this.crackleBed) this.fadeBed(this.crackleBed, 0, 0.45)
  }

  resumeAmbient() {
    this.unlock()
    if (!this.ambientPaused) return
    this.ambientPaused = false
    const beds = this.beds
    if (!beds || !this.location) return
    const g =
      this.heldAmbientGain > 0.001
        ? this.heldAmbientGain
        : ambientGain(this.location, false)
    this.fadeBed(beds[this.activeBed], g, 0.9)
    if (this.location === 'fire' && this.crackleBed) {
      this.fadeBed(this.crackleBed, FIRE_CRACKLE_GAIN, 0.9)
    }
  }

  playSting(id: string, opts?: { gain?: number; onReady?: (durationMs: number) => void }) {
    this.unlock()
    if (this.muted) return
    void this.playStingAsync(id, opts)
  }

  stopSting() {
    if (!this.sting) return
    try {
      this.sting.stop()
    } catch {
      /* already stopped */
    }
    this.sting = null
  }

  stop() {
    this.ambientGen++
    this.location = null
    this.pending = null
    this.stopTvStatic()
    this.stopSting()
    this.ambientPaused = false
    this.stopCrackle()
    if (this.beds) {
      this.stopBed(this.beds[0], 0.05)
      this.stopBed(this.beds[1], 0.05)
    }
  }

  private ensureCtx() {
    if (typeof window === 'undefined') return null
    if (this.ctx) return this.ctx
    try {
      const ctx = new AudioContext()
      const master = ctx.createGain()
      master.gain.value = this.muted ? 0 : 1
      master.connect(ctx.destination)
      const sfxGain = ctx.createGain()
      sfxGain.gain.value = 1
      sfxGain.connect(master)
      const makeBed = (): Bed => {
        const out = ctx.createGain()
        out.gain.value = 0
        out.connect(master)
        return { out, sources: [], timer: undefined }
      }
      this.ctx = ctx
      this.master = master
      this.sfxGain = sfxGain
      this.beds = [makeBed(), makeBed()]
      this.crackleBed = makeBed()
      ctx.onstatechange = () => {
        if (ctx.state === 'running') this.flushPending()
      }
      return ctx
    } catch {
      return null
    }
  }

  private prefetch(url: string) {
    if (this.buffers.has(url) || this.raws.has(url)) return Promise.resolve(this.raws.get(url) ?? null)
    const inflight = this.rawLoads.get(url)
    if (inflight) return inflight
    const job = (async () => {
      try {
        const res = await fetch(url)
        if (!res.ok) return null
        const buf = await res.arrayBuffer()
        this.raws.set(url, buf)
        return buf
      } catch {
        return null
      } finally {
        this.rawLoads.delete(url)
      }
    })()
    this.rawLoads.set(url, job)
    return job
  }

  private async preloadIntroAsync(location: LocationId) {
    const firstAmb = ambUrl(location)
    const wave1 = [firstAmb, ...PRIORITY_SFX.map(sfxUrl)]
    await Promise.all(wave1.map(url => this.prefetch(url)))
    const wave2 = [
      ...EARLY_AMB.map(ambUrl),
      ...REST_SFX.map(sfxUrl),
    ].filter(url => !wave1.includes(url))
    await Promise.all(wave2.map(url => this.prefetch(url)))
  }

  private loadBuffer(url: string) {
    const cached = this.buffers.get(url)
    if (cached !== undefined) return Promise.resolve(cached)
    const inflight = this.loads.get(url)
    if (inflight) return inflight
    const ctx = this.ensureCtx()
    if (!ctx) return Promise.resolve(null)
    const job = (async () => {
      try {
        let raw = this.raws.get(url) ?? null
        if (!raw) raw = await this.prefetch(url)
        if (!raw) return null
        const buf = await ctx.decodeAudioData(raw.slice(0))
        this.buffers.set(url, buf)
        return buf
      } catch {
        return null
      } finally {
        this.loads.delete(url)
      }
    })()
    this.loads.set(url, job)
    return job
  }

  private async startAmbient(id: LocationId, gen: number) {
    const ctx = this.ensureCtx()
    const beds = this.beds
    if (!ctx || !beds) return

    let usedSongFallback = false
    let buffer = await this.loadBuffer(ambUrl(id))
    if (!buffer && (id === 'venue' || id === 'fire')) {
      buffer = await this.loadBuffer(SONG_FALLBACK)
      usedSongFallback = Boolean(buffer)
    }
    if (gen !== this.ambientGen) return

    if (!buffer) {
      this.pending = null
      this.stopCrackle()
      this.fadeBed(beds[this.activeBed], 0, AREA_FADE_S)
      const outBed = beds[this.activeBed]
      window.setTimeout(() => {
        if (gen !== this.ambientGen) return
        this.stopBed(outBed, 0)
      }, AREA_FADE_S * 1000 + 40)
      return
    }

    const gain = ambientGain(id, usedSongFallback)
    if (id === 'fire') void this.startCrackle()
    else this.stopCrackle()
    if (ctx.state !== 'running') {
      this.pending = { id, buffer, gain }
      return
    }
    this.swapToBuffer(buffer, gain)
  }

  private async startCrackle() {
    if (this.crackleOn) return
    const ctx = this.ensureCtx()
    const bed = this.crackleBed
    if (!ctx || !bed) return
    const buffer = await this.loadBuffer(FIRE_CRACKLE_URL)
    if (!buffer || this.location !== 'fire') return
    this.stopBed(bed, 0)
    bed.out.gain.value = 0
    this.spawnLoop(bed, buffer)
    this.fadeBed(bed, this.ambientPaused ? 0 : FIRE_CRACKLE_GAIN, AREA_FADE_S)
    this.crackleOn = true
  }

  private stopCrackle() {
    if (!this.crackleOn || !this.crackleBed) return
    this.crackleOn = false
    const bed = this.crackleBed
    this.fadeBed(bed, 0, AREA_FADE_S)
    window.setTimeout(() => {
      if (this.crackleOn) return
      this.stopBed(bed, 0)
    }, AREA_FADE_S * 1000 + 40)
  }

  private flushPending() {
    const pending = this.pending
    if (!pending) return
    if (this.location !== pending.id) return
    if (this.ctx?.state !== 'running') return
    this.pending = null
    this.swapToBuffer(pending.buffer, pending.gain)
  }

  private swapToBuffer(buffer: AudioBuffer, gain: number) {
    const beds = this.beds
    const ctx = this.ctx
    if (!beds || !ctx) return
    const gen = this.ambientGen
    const incoming = 1 - this.activeBed
    const outgoing = this.activeBed

    this.stopBed(beds[incoming], 0)
    beds[incoming].out.gain.value = 0
    this.spawnLoop(beds[incoming], buffer)
    if (this.ambientPaused) this.heldAmbientGain = gain
    this.fadeBed(beds[incoming], this.ambientPaused ? 0 : gain, AREA_FADE_S)
    this.fadeBed(beds[outgoing], 0, AREA_FADE_S)
    const outBed = beds[outgoing]
    window.setTimeout(() => {
      if (gen !== this.ambientGen) return
      this.stopBed(outBed, 0)
    }, AREA_FADE_S * 1000 + 40)
    this.activeBed = incoming as 0 | 1
  }

  private fadeBed(bed: Bed, target: number, seconds: number) {
    const ctx = this.ctx
    if (!ctx) return
    const now = ctx.currentTime
    bed.out.gain.cancelScheduledValues(now)
    bed.out.gain.setValueAtTime(bed.out.gain.value, now)
    bed.out.gain.linearRampToValueAtTime(target, now + Math.max(0.01, seconds))
  }

  private stopBed(bed: Bed, fadeS: number) {
    if (bed.timer !== undefined) {
      window.clearTimeout(bed.timer)
      bed.timer = undefined
    }
    if (fadeS > 0) this.fadeBed(bed, 0, fadeS)
    else bed.out.gain.value = 0
    for (const src of bed.sources) {
      try {
        src.stop()
      } catch {
        /* already stopped */
      }
    }
    bed.sources = []
  }

  private spawnLoop(bed: Bed, buffer: AudioBuffer) {
    const ctx = this.ctx
    if (!ctx) return
    const overlap = Math.min(LOOP_CROSSFADE_S, buffer.duration / 3)
    if (buffer.duration <= overlap * 2 + 0.05) {
      this.spawnNativeLoop(bed, buffer)
      return
    }

    const playChunk = (when: number) => {
      if (!this.ctx) return
      const src = this.ctx.createBufferSource()
      const g = this.ctx.createGain()
      src.buffer = buffer
      src.connect(g)
      g.connect(bed.out)

      const start = Math.max(when, this.ctx.currentTime)
      const end = start + buffer.duration
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(1, start + overlap)
      g.gain.setValueAtTime(1, end - overlap)
      g.gain.linearRampToValueAtTime(0, end)
      src.start(start)
      src.stop(end)
      bed.sources.push(src)
      src.onended = () => {
        bed.sources = bed.sources.filter(s => s !== src)
      }

      const nextAt = end - overlap
      const delay = Math.max(20, (nextAt - this.ctx.currentTime - 0.08) * 1000)
      bed.timer = window.setTimeout(() => {
        bed.timer = undefined
        playChunk(nextAt)
      }, delay)
    }

    playChunk(ctx.currentTime)
  }

  private spawnNativeLoop(bed: Bed, buffer: AudioBuffer) {
    const ctx = this.ctx
    if (!ctx) return
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    src.connect(bed.out)
    src.start()
    bed.sources.push(src)
  }

  private async playSfxAsync(id: string, opts?: { rate?: number; gain?: number }) {
    const ctx = this.ensureCtx()
    const dest = this.sfxGain
    if (!ctx || !dest || this.muted) return
    let buffer = await this.loadBuffer(sfxUrl(id))
    if (!buffer && id !== 'click') buffer = await this.loadBuffer(sfxUrl('click'))
    if (!buffer) {
      this.proceduralClick()
      return
    }
    this.startBuffer(buffer, dest, opts?.rate ?? 1, opts?.gain ?? 0.7)
  }

  private async playStingAsync(
    id: string,
    opts?: { gain?: number; onReady?: (durationMs: number) => void },
  ) {
    const ctx = this.ensureCtx()
    const dest = this.sfxGain
    if (!ctx || !dest || this.muted) return
    const buffer = await this.loadBuffer(sfxUrl(id))
    if (!buffer) return
    this.stopSting()
    opts?.onReady?.(buffer.duration * 1000)
    const src = ctx.createBufferSource()
    const g = ctx.createGain()
    src.buffer = buffer
    g.gain.value = opts?.gain ?? 0.8
    src.connect(g)
    g.connect(dest)
    this.sting = src
    src.onended = () => {
      if (this.sting === src) this.sting = null
    }
    src.start()
  }

  private playTypeTickNow() {
    const ctx = this.ensureCtx()
    const dest = this.sfxGain
    if (!ctx || !dest || this.muted) return
    const rate = 0.92 + Math.random() * 0.16
    const url = sfxUrl('type')
    const cached = this.buffers.get(url)
    if (cached) {
      this.startBuffer(cached, dest, rate, 0.9)
      return
    }
    if (cached === undefined) void this.loadBuffer(url)
    this.proceduralTick(rate)
  }

  private startBuffer(buffer: AudioBuffer, dest: AudioNode, rate: number, gain: number) {
    const ctx = this.ctx
    if (!ctx) return
    const src = ctx.createBufferSource()
    const g = ctx.createGain()
    src.buffer = buffer
    src.playbackRate.value = rate
    g.gain.value = gain
    src.connect(g)
    g.connect(dest)
    src.start()
  }

  private startTvStatic(target = 0.03) {
    if (this.tvStatic) return
    const ctx = this.ensureCtx()
    const master = this.master
    if (!ctx || !master) return

    const seconds = 1.6
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true

    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 800
    hp.Q.value = 0.7

    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 2600
    bp.Q.value = 0.4

    const gain = ctx.createGain()
    const now = ctx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(target, now + 0.14)

    src.connect(hp)
    hp.connect(bp)
    bp.connect(gain)
    gain.connect(master)
    src.start()
    this.tvStatic = { src, gain }
  }

  private stopTvStatic() {
    const nodes = this.tvStatic
    const ctx = this.ctx
    if (!nodes || !ctx) return
    this.tvStatic = null
    const now = ctx.currentTime
    nodes.gain.gain.cancelScheduledValues(now)
    nodes.gain.gain.setValueAtTime(Math.max(0.0001, nodes.gain.gain.value), now)
    nodes.gain.gain.linearRampToValueAtTime(0.0001, now + 0.2)
    window.setTimeout(() => {
      try {
        nodes.src.stop()
      } catch {
        /* already stopped */
      }
    }, 240)
  }

  private proceduralTick(rate: number) {
    const ctx = this.ctx
    const dest = this.sfxGain
    if (!ctx || !dest) return
    const dur = 0.045
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 620 * rate
    const now = ctx.currentTime
    g.gain.setValueAtTime(0.16, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + dur)
    osc.connect(g)
    g.connect(dest)
    osc.start(now)
    osc.stop(now + dur)
  }

  private proceduralClick() {
    const ctx = this.ctx
    const dest = this.sfxGain
    if (!ctx || !dest) return
    const dur = 0.09
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
    }
    const src = ctx.createBufferSource()
    const filter = ctx.createBiquadFilter()
    const g = ctx.createGain()
    filter.type = 'bandpass'
    filter.frequency.value = 900
    filter.Q.value = 0.8
    g.gain.value = 0.28
    src.buffer = buffer
    src.connect(filter)
    filter.connect(g)
    g.connect(dest)
    src.start()
  }
}

let singleton: WorldAudio | null = null

export function worldAudio() {
  if (!singleton) singleton = new WorldAudio()
  return singleton
}
