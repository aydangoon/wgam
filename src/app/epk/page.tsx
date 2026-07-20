import type { Metadata } from 'next'
import EpkPage from '@/components/epk/EpkPage'

export const metadata: Metadata = {
  title: "EPK — Who's Got a Match?",
  description:
    "Electronic press kit for Who's Got a Match? — bio, promo photos, music videos, press, stage plot, tech rider, and booking contact.",
}

export default function Page() {
  return <EpkPage />
}
