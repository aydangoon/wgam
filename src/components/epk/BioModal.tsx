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

const PARAGRAPHS = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  'Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida.',
  'Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula eu tempor congue, eros est euismod turpis, id tincidunt sapien risus a quam. Maecenas fermentum consequat mi.',
  'Donec fermentum. Pellentesque malesuada nulla a mi. Duis sapien sem, aliquet nec, commodo eget, consequat quis, neque. Aliquam faucibus, elit ut dictum aliquet, felis nisl adipiscing sapien, sed malesuada diam lacus eget erat.',
  'Cras mollis scelerisque nunc. Nullam arcu. Aliquam consequat. Curabitur augue lorem, dapibus quis, laoreet et, pretium ac, nisi. Aenean magna nisl, mollis quis, molestie eu, feugiat in, orci. In hac habitasse platea dictumst.',
  'Fusce convallis, mauris imperdiet gravida bibendum, nisl turpis suscipit mauris, sed placerat ipsum urna sed risus. In convallis tellus a mauris. Curabitur non elit ut libero tristique sodales. Mauris a lacus. Donec mattis semper leo.',
  'In hac habitasse platea dictumst. Vivamus adipiscing fermentum quam. Volutpat maecenas ornare tortor. Phasellus nec mauris. Curabitur vitae diam non enim vestibulum interdum. Nulla facilisi. Aliquam erat volutpat.',
  'Nam dui mi, tincidunt quis, accumsan porttitor, facilisis luctus, metus. Phasellus ultrices nulla quis nibh. Quisque a lectus. Donec consectetuer ligula vulputate sem tristique cursus. Nam nulla quam, gravida non commodo a, sodales sit amet nisi.',
  'Pellentesque fermentum dolor. Aliquam quam lectus, facilisis auctor, ultrices ut, elementum vulputate, nunc. Sed adipiscing ornare risus. Morbi est est, blandit sit amet, sagittis vel, euismod vel, velit. Pellentesque egestas sem.',
]

export default function BioModal() {
  return (
    <Dialog>
      <DialogTrigger className="font-aboreto inline-flex items-center gap-2 self-start text-base font-bold tracking-[0.25em] text-[hsl(var(--accent))]">
        READ FULL BIO <ArrowRight className="h-5 w-5" />
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
            {PARAGRAPHS.map((p, i) => (
              <p
                key={i}
                className="font-aboreto text-base leading-relaxed text-black sm:text-lg"
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
