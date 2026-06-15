import { LINKS } from '@/lib/links'

const IMG = '/images/processed'

export default function Hero() {
  return (
    <section
      id="music"
      className="relative h-screen w-full overflow-hidden bg-cover bg-center"
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

      {/* centered content sitting on a black splotch */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
        <div className="relative flex flex-col items-center">
          {/* black splotch backdrop */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[140%] w-[150%] -translate-x-1/2 -translate-y-1/2 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${IMG}/black-splotch-1.webp)` }}
          />

          {/* 3D flip cover */}
          <div className="group perspective-1200">
            <div className="preserve-3d relative h-72 w-72 transition-transform duration-700 ease-in-out [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] sm:h-80 sm:w-80">
              <img
                src={`${IMG}/wgam-front-cover.webp`}
                alt="Who's Got a Match? cover art"
                className="backface-hidden absolute inset-0 h-full w-full rounded-sm object-cover shadow-md shadow-black/30"
              />
              <img
                src={`${IMG}/wgam-back-cover.webp`}
                alt="Who's Got a Match? back cover"
                className="backface-hidden absolute inset-0 h-full w-full rounded-sm object-cover shadow-md shadow-black/30 [transform:rotateY(180deg)]"
              />
            </div>
          </div>

          <h2 className="font-manufacturing mt-8 text-center text-4xl text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] sm:text-5xl">
            Who&apos;s Got a Match
          </h2>

          <a
            href={LINKS.listenNow}
            className="font-aboreto mt-6 inline-block rounded-sm bg-[hsl(var(--accent))] px-8 py-3 text-sm tracking-[0.25em] text-white transition-transform duration-200 hover:scale-[1.02]"
          >
            LISTEN NOW
          </a>
        </div>
      </div>
    </section>
  )
}
