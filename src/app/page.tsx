import TitleCard from '@/components/TitleCard'
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import SocialBar from '@/components/SocialBar'
import EndSection from '@/components/EndSection'

export default function HomePage() {
  return (
    <>
      <TitleCard />
      <Navbar />
      <main className="relative">
        <Hero />
        <SocialBar />
        <EndSection />
      </main>
    </>
  )
}
