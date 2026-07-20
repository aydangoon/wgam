import type { Metadata } from 'next'
import { Play } from 'lucide-react'
import { MediaShell, MediaRow } from '@/components/media/MediaPage'
import { LINKS } from '@/lib/links'

export const metadata: Metadata = {
  title: "Videos — Who's Got a Match?",
  description:
    "Music videos and live sessions from Who's Got a Match? — watch now.",
}

const IMG = '/images/processed'

// Placeholder video frame in the same style as the EPK thumbs; swap the
// wrapper href / contents for a real embed when the videos go live.
function VideoFrame({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      aria-label={`Watch ${label}`}
      className="group relative flex aspect-video w-[17rem] items-center justify-center bg-black shadow-sm shadow-black/30 sm:w-[23rem]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-repeat opacity-30 [filter:grayscale(1)]"
        style={{
          backgroundImage: `url(${IMG}/dusty-black-grain-texture.webp)`,
          backgroundSize: '220px',
        }}
      />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--accent))] transition-transform duration-200 group-hover:scale-110">
        <Play className="ml-1 h-6 w-6 text-black" fill="black" />
      </span>
    </a>
  )
}

export default function VideosPage() {
  return (
    <MediaShell title="Videos">
      <MediaRow
        splotch={2}
        eyebrow="OFFICIAL MUSIC VIDEO"
        title="Take"
        description="The official music video."
        media={<VideoFrame label="Take" href={LINKS.listenNow} />}
      />

      <MediaRow
        reverse
        splotch={1}
        eyebrow="LIVE SESSION"
        title="Little White Pills"
        description="Recorded live."
        media={
          <VideoFrame
            label="Little White Pills (live)"
            href={LINKS.listenNow}
          />
        }
      />

      <MediaRow
        splotch={2}
        eyebrow="VISUALIZER"
        title="Plug Me In"
        description="The official visualizer."
        media={<VideoFrame label="Plug Me In" href={LINKS.listenNow} />}
      />
    </MediaShell>
  )
}
