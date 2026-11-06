import EmailCapture from './EmailCapture'

const IMG = '/images/processed'

export default function Hero() {
  return (
    <section
      id="music"
      className="sticky top-0 z-0 h-screen w-full overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${IMG}/vessel.webp)` }}
    >
      {/* darken the photo a touch for contrast */}
      <div className="pointer-events-none absolute inset-0 bg-black/40" />

      {/* drifting, very subtle red radial gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="drift-a absolute -left-1/4 top-0 h-[70vmax] w-[70vmax] rounded-full opacity-[0.18] blur-3xl"
          style={{
            background:
              'radial-gradient(circle, hsl(var(--accent) / 0.7) 0%, transparent 65%)',
          }}
        />
        <div
          className="drift-b absolute -right-1/4 bottom-0 h-[60vmax] w-[60vmax] rounded-full opacity-[0.14] blur-3xl"
          style={{
            background:
              'radial-gradient(circle, hsl(var(--accent) / 0.6) 0%, transparent 65%)',
          }}
        />
        <div
          className="drift-c absolute left-1/3 top-1/4 h-[50vmax] w-[50vmax] rounded-full opacity-[0.10] blur-3xl"
          style={{
            background:
              'radial-gradient(circle, hsl(0 0% 100% / 0.5) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* film grain over everything */}
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-repeat opacity-[0.18] mix-blend-overlay"
        style={{ backgroundImage: `url(${IMG}/film-grain-overlay.webp)` }}
      />

      {/* soft vignette behind the content for legibility (no hard shape) */}
      <div
        className="pointer-events-none absolute inset-0 z-[15]"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 45%, transparent 75%)',
        }}
      />

      {/* centered content */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 pt-12">
        <div className="flex w-[min(92vw,60rem)] flex-col items-center">
          {/* single focal point */}
          <h1 className="font-manufacturing text-center text-6xl leading-[0.95] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] sm:text-8xl md:text-9xl">
            Who&apos;s Got a Match?
          </h1>

          {/* collapses away (with its own top spacing) after a successful signup */}
          <EmailCapture />
        </div>
      </div>
    </section>
  )
}
