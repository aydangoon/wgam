import { NAV_TABS } from '@/lib/links'
import { jaggedBottomClip } from '@/lib/jagged'

const JAGGED_BOTTOM = jaggedBottomClip()

export default function Navbar() {
  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 bg-black/80 backdrop-blur-md pb-2"
      style={{ clipPath: JAGGED_BOTTOM, WebkitClipPath: JAGGED_BOTTOM }}
    >
      <ul className="mx-auto flex h-16 max-w-3xl items-center justify-between px-8 sm:px-12">
        {NAV_TABS.map(tab => (
          <li key={tab.label}>
            <a
              href={tab.href}
              className="font-aboreto text-sm tracking-[0.2em] text-white/80 transition-colors hover:text-[hsl(var(--accent))] sm:text-base"
            >
              {tab.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
