const IMG = '/images/processed'

// Harsh, irregular jagged top edge.
// Deterministic (seeded) so server and client render the same string.
function buildJaggedTop(steps = 160, maxAmp = 4): string {
  let seed = 1337
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  const pts: string[] = []
  for (let i = 0; i <= steps; i++) {
    const x = ((i / steps) * 100).toFixed(3)
    const y = (rand() * maxAmp).toFixed(3)
    pts.push(`${x}% ${y}%`)
  }
  pts.push('100% 100%', '0% 100%')
  return `polygon(${pts.join(', ')})`
}

const JAGGED_TOP = buildJaggedTop()

// Only feather the very tips of the teeth so they read as a torn edge
// instead of dissolving into a flat line. Must stay well below maxAmp.
const TOP_FADE = 'linear-gradient(to bottom, transparent 0%, black 2.5%)'

export default function EndSection() {
  return (
    <section
      id="tour"
      className="relative z-30 -mt-16 flex h-screen w-full items-center justify-center overflow-hidden bg-black"
      style={{
        clipPath: JAGGED_TOP,
        maskImage: TOP_FADE,
        WebkitMaskImage: TOP_FADE,
      }}
    >
      {/* dusty grain texture, repeating, opacity reduced via filter */}
      <div
        className="pointer-events-none absolute inset-0 bg-repeat opacity-50 [filter:grayscale(1)_brightness(0.7)_contrast(1.1)]"
        style={{
          backgroundImage: `url(${IMG}/dusty-black-grain-texture.webp)`,
          backgroundSize: '320px',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black via-transparent to-black/80" />

      <div className="relative z-10 flex flex-col items-center px-6">
        <button
          type="button"
          aria-label="Enter the end"
          className="relative flex cursor-pointer items-center justify-center bg-transparent focus:outline-none"
        >
          {/* spiral icon sits behind the splotch, cropped to a circle */}
          <img
            src={`${IMG}/wgam-spiral-icon.webp`}
            alt=""
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 max-w-none -translate-x-1/2 -translate-y-1/2 select-none rounded-full object-cover opacity-90 sm:h-96 sm:w-96"
          />
          <img
            src={`${IMG}/animated-black-splotch.webp`}
            alt="Black splotch"
            className="relative z-10 h-56 w-56 select-none object-contain sm:h-72 sm:w-72"
          />
        </button>

        <h2 className="font-manufacturing mt-6 text-center text-3xl text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] sm:text-5xl">
          are you ready for the end?
        </h2>
      </div>
    </section>
  )
}
