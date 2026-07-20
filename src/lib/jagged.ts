// Shared deterministic jagged edge so the navbar bottom and the end-section top
// use the exact same teeth (same seed, same x-positions, same amplitude) and
// interlock like a puzzle: one keeps the area below the cut, the other above.

const SEED = 1337
const STEPS = 120

// Tooth height in pixels. Kept in px (not %) so both edges share the same
// absolute amplitude regardless of their very different element heights.
export const JAGGED_AMP_PX = 12

function buildOffsets(): number[] {
  let seed = SEED
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  const offsets: number[] = []
  for (let i = 0; i <= STEPS; i++) offsets.push(rand())
  return offsets
}

const OFFSETS = buildOffsets()

// Jagged TOP edge, solid region BELOW the cut (used by the end section).
export function jaggedTopClip(amp = JAGGED_AMP_PX): string {
  const pts = OFFSETS.map((o, i) => {
    const x = ((i / STEPS) * 100).toFixed(3)
    const y = (o * amp).toFixed(2)
    return `${x}% ${y}px`
  })
  pts.push('100% 100%', '0% 100%')
  return `polygon(${pts.join(', ')})`
}

// Inverse jagged BOTTOM edge, solid region ABOVE the cut (used by the navbar).
// Protrudes down exactly where the top edge recesses, so they tessellate.
export function jaggedBottomClip(amp = JAGGED_AMP_PX): string {
  const pts: string[] = ['0% 0%', '100% 0%']
  for (let i = STEPS; i >= 0; i--) {
    const x = ((i / STEPS) * 100).toFixed(3)
    const up = ((1 - OFFSETS[i]) * amp).toFixed(2)
    pts.push(`${x}% calc(100% - ${up}px)`)
  }
  return `polygon(${pts.join(', ')})`
}

// ---------- Seeded variants (unique edges per element) ----------

// Build STEPS+1 pseudo-random offsets in [0,1) from an arbitrary seed, reusing
// the same LCG as the shared edges above.
export function makeJaggedOffsets(seed: number, steps = STEPS): number[] {
  let s = (seed | 0) || 1
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  const offsets: number[] = []
  for (let i = 0; i <= steps; i++) offsets.push(rand())
  return offsets
}

// A pair of interlocking edges for the split-door gate. The top half keeps the
// area ABOVE a jagged bottom edge; the bottom half keeps the area BELOW the same
// (inverted) jagged top edge, so the two halves tessellate along the seam.
export function jaggedGateClips(seed: number, amp = JAGGED_AMP_PX) {
  const offs = makeJaggedOffsets(seed)

  // Top half: solid above, jagged bottom edge near 100%.
  const topPts: string[] = ['0% 0%', '100% 0%']
  for (let i = STEPS; i >= 0; i--) {
    const x = ((i / STEPS) * 100).toFixed(3)
    const up = (offs[i] * amp).toFixed(2)
    topPts.push(`${x}% calc(100% - ${up}px)`)
  }
  const topClip = `polygon(${topPts.join(', ')})`

  // Bottom half: solid below, jagged top edge that mirrors the top half's teeth.
  const bottomPts: string[] = []
  for (let i = 0; i <= STEPS; i++) {
    const x = ((i / STEPS) * 100).toFixed(3)
    const down = ((1 - offs[i]) * amp).toFixed(2)
    bottomPts.push(`${x}% ${down}px`)
  }
  bottomPts.push('100% 100%', '0% 100%')
  const bottomClip = `polygon(${bottomPts.join(', ')})`

  return { topClip, bottomClip }
}

// A small-amplitude, all-around torn edge for a grid cell so the black gaps
// between cells read as hand-torn rather than ruled. Amplitude is a percentage
// of each side to stay responsive across very different cell sizes.
export function jaggedCellClip(seed: number, ampPct = 1.4, perSide = 8): string {
  const offs = makeJaggedOffsets(seed, perSide * 4 + 4)
  const a = ampPct
  let k = 0
  const next = () => offs[k++ % offs.length]
  const pts: string[] = []

  // Top edge: left -> right
  for (let i = 0; i <= perSide; i++) {
    const x = (i / perSide) * 100
    const y = next() * a
    pts.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`)
  }
  // Right edge: top -> bottom
  for (let i = 1; i <= perSide; i++) {
    const y = (i / perSide) * 100
    const x = 100 - next() * a
    pts.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`)
  }
  // Bottom edge: right -> left
  for (let i = 1; i <= perSide; i++) {
    const x = 100 - (i / perSide) * 100
    const y = 100 - next() * a
    pts.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`)
  }
  // Left edge: bottom -> top
  for (let i = 1; i < perSide; i++) {
    const y = 100 - (i / perSide) * 100
    const x = next() * a
    pts.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`)
  }

  return `polygon(${pts.join(', ')})`
}
