import type { Metadata } from 'next'
import { MediaShell, MediaRow } from '@/components/media/MediaPage'
import { LINKS } from '@/lib/links'

export const metadata: Metadata = {
  title: "Music — Who's Got a Match?",
  description:
    "Albums and singles from Who's Got a Match? — listen everywhere now.",
}

const IMG = '/images/processed'

function Cover({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="h-56 w-56 rounded-sm object-cover shadow-sm shadow-black/30 sm:h-64 sm:w-64"
    />
  )
}

export default function MusicPage() {
  return (
    <MediaShell title="Music" tagline="ALBUMS & SINGLES">
      <MediaRow
        splotch={1}
        eyebrow="ALBUM"
        title="Who's Got a Match?"
        description="The debut album. Out everywhere."
        cta={{ label: 'LISTEN NOW', href: LINKS.listenNow }}
        media={
          <Cover
            src={`${IMG}/wgam-front-cover.webp`}
            alt="Who's Got a Match? album cover"
          />
        }
      />

      <MediaRow
        reverse
        splotch={2}
        eyebrow="SINGLE"
        title="Take"
        description="The lead single."
        cta={{ label: 'LISTEN NOW', href: LINKS.listenNow }}
        media={
          <Cover src={`${IMG}/wgam-alt-cover.webp`} alt="Take single cover" />
        }
      />

      <MediaRow
        splotch={1}
        eyebrow="SINGLE"
        title="Little White Pills"
        description="The second single."
        cta={{ label: 'LISTEN NOW', href: LINKS.listenNow }}
        media={
          <Cover
            src={`${IMG}/wgam-back-cover.webp`}
            alt="Little White Pills single cover"
          />
        }
      />
    </MediaShell>
  )
}
