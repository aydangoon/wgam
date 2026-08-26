import type { Metadata } from 'next'
import WorldApp from '@/components/world/WorldApp'

export const metadata: Metadata = {
  title: "The Wasted City — Who's Got a Match?",
  description: 'They are the haves. We are the nots. Music is illegal here.',
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}) {
  const { slug } = await params
  const initial = slug?.[0] ?? 'map'
  return <WorldApp initialLocation={initial} />
}
