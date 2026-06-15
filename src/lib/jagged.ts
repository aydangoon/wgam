// Shared deterministic jagged edge so the navbar bottom and the end-section top
// use the exact same teeth (same seed, same x-positions, same amplitude) and
// interlock like a puzzle: one keeps the area below the cut, the other above.

const SEED = 1337
const STEPS = 180

// Tooth height in pixels. Kept in px (not %) so both edges share the same
// absolute amplitude regardless of their very different element heights.
export const JAGGED_AMP_PX = 18

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
