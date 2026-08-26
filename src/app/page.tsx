import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import SocialBar from '@/components/SocialBar'
import EndSection from '@/components/EndSection'

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="relative">
        <Hero />
        <SocialBar />
        <EndSection />
      </main>
    </>
  )
}
