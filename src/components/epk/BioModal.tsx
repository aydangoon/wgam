'use client'

import { ArrowRight, X } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { BIO_PARAGRAPHS, BIO_SIGNOFF } from '@/lib/epk/content'

export default function BioModal() {
  return (
    <Dialog>
      <DialogTrigger className="font-aboreto group inline-flex items-center gap-3 self-start bg-[hsl(var(--accent))] px-7 py-3.5 text-base font-bold tracking-[0.25em] text-white transition-transform duration-200 hover:scale-[1.02] sm:text-lg">
        READ FULL BIO
        <ArrowRight
          className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
          strokeWidth={2.5}
        />
      </DialogTrigger>

      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-0 overflow-hidden border-0 bg-[hsl(var(--accent))] p-0 text-black [&>button]:hidden"
      >
        <DialogHeader className="flex flex-row items-center justify-between gap-4 space-y-0 border-b border-black/20 px-8 py-6 text-left">
          <DialogTitle className="font-manufacturing text-5xl font-normal leading-none tracking-normal text-black sm:text-6xl">
            Bio
          </DialogTitle>
          <DialogClose
            aria-label="Close biography"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-[hsl(var(--accent))]"
          >
            <X className="h-5 w-5" strokeWidth={2.2} />
          </DialogClose>
        </DialogHeader>

        <div className="overflow-y-auto px-8 py-6">
          <div className="space-y-5">
            {BIO_PARAGRAPHS.map((p, i) => (
              <p
                key={i}
                className="font-aboreto text-base leading-relaxed text-black sm:text-lg"
              >
                {p}
              </p>
            ))}
            <div className="font-aboreto pt-2 text-right text-base leading-relaxed text-black sm:text-lg">
              {BIO_SIGNOFF.map(line => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
