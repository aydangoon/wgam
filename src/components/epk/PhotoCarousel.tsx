'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Download, Loader2, X } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PHOTOS, downloadUrl, formatBytes, type Photo } from '@/lib/epk/content'

/**
 * Full-screen lightbox over the high-res press photos. Shows a blurred thumb +
 * shimmer + spinner until the ~2000px preview arrives, and offers the original
 * (16-46 MB) as a download. Assets are served from Vercel Blob.
 */
export default function PhotoCarousel({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState<Set<string>>(() => new Set())
  const touchStartX = useRef<number | null>(null)

  const count = PHOTOS.length
  const photo = PHOTOS[index]

  const go = useCallback(
    (delta: number) => setIndex(i => (i + delta + count) % count),
    [count],
  )

  const markLoaded = useCallback((url: string) => {
    setLoaded(prev => {
      if (prev.has(url)) return prev
      const next = new Set(prev)
      next.add(url)
      return next
    })
  }, [])

  // Warm the neighbours so arrowing through feels instant.
  useEffect(() => {
    if (!open) return
    const neighbours = [PHOTOS[(index + 1) % count], PHOTOS[(index - 1 + count) % count]]
    const imgs = neighbours.map(p => {
      const img = new Image()
      img.onload = () => markLoaded(p.preview.url)
      img.src = p.preview.url
      return img
    })
    return () => {
      for (const img of imgs) img.onload = null
    }
  }, [open, index, count, markLoaded])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(-1)
    }
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current
    touchStartX.current = null
    if (start === null) return
    const dx = (e.changedTouches[0]?.clientX ?? start) - start
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
  }

  const isLoaded = loaded.has(photo.preview.url)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        aria-describedby={undefined}
        onKeyDown={onKeyDown}
        // z-[100] keeps the lightbox above the fixed EPK audio toggle (z-[80]).
        className="left-0 top-0 z-[100] flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 border-0 bg-black p-0 text-white sm:rounded-none [&>button]:hidden"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-baseline gap-3">
            <DialogTitle className="font-aboreto text-sm font-bold tracking-[0.3em] text-white">
              PRESS PHOTOS
            </DialogTitle>
            <span className="font-aboreto text-xs tabular-nums tracking-[0.2em] text-white/50">
              {index + 1} / {count}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={downloadUrl(photo.original)}
              className="font-aboreto flex h-10 items-center gap-2 rounded-full bg-[hsl(var(--accent))] px-4 text-xs font-bold tracking-[0.2em] text-black transition-transform hover:scale-[1.03]"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">DOWNLOAD ORIGINAL</span>
              <span className="tabular-nums opacity-70">
                {formatBytes(photo.original.bytes)}
              </span>
            </a>
            <DialogClose
              aria-label="Close photos"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" strokeWidth={2.2} />
            </DialogClose>
          </div>
        </div>

        {/* Stage */}
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center px-14 py-2 sm:px-20"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <Slide key={photo.id} photo={photo} loaded={isLoaded} onLoad={markLoaded} />

          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-6"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        {/* Meta + thumbnails */}
        <div className="flex flex-col gap-3 px-4 pb-4 pt-2 sm:px-6">
          <div className="flex items-center justify-between font-aboreto text-[11px] tracking-[0.2em] text-white/40">
            <span>{photo.id}.JPG</span>
            <span className="tabular-nums">
              {photo.original.width} × {photo.original.height}
            </span>
          </div>
          <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {PHOTOS.map((p, i) => (
              <li key={p.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === index ? 'true' : undefined}
                  className={`block h-14 w-20 overflow-hidden rounded-sm ring-2 transition-all ${
                    i === index
                      ? 'ring-[hsl(var(--accent))] opacity-100'
                      : 'ring-transparent opacity-50 hover:opacity-90'
                  }`}
                >
                  <img
                    src={p.thumb.url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Slide({
  photo,
  loaded,
  onLoad,
}: {
  photo: Photo
  loaded: boolean
  onLoad: (url: string) => void
}) {
  const aspect = photo.preview.width / photo.preview.height
  return (
    <div
      className="relative max-h-full max-w-full overflow-hidden bg-[#0a0a0a]"
      style={{ aspectRatio: aspect, width: 'min(100%, calc((100dvh - 15rem) * ' + aspect + '))' }}
    >
      {/* Blurred thumb + shimmer while the preview streams in */}
      <img
        src={photo.thumb.url}
        alt=""
        aria-hidden
        className={`absolute inset-0 h-full w-full scale-105 object-cover blur-xl transition-opacity duration-500 ${
          loaded ? 'opacity-0' : 'opacity-70'
        }`}
      />
      {!loaded && (
        <>
          <div className="epk-shimmer absolute inset-0" aria-hidden />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-white/80" />
            <span className="font-aboreto text-[11px] tracking-[0.3em] text-white/60">
              LOADING
            </span>
          </div>
        </>
      )}
      <img
        src={photo.preview.url}
        alt={`Who's Got a Match? press photo ${photo.id}`}
        onLoad={() => onLoad(photo.preview.url)}
        decoding="async"
        className={`relative h-full w-full object-contain transition-opacity duration-500 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}
