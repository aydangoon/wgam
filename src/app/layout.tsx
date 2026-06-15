import type { Metadata } from 'next'
import { Aboreto } from 'next/font/google'
import '@/styles/globals.css'

const aboreto = Aboreto({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-aboreto',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Who's Got a Match?",
  description: "Official site of Who's Got a Match? — are you ready for the end?",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Manufacturing+Consent&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${aboreto.variable} bg-background text-foreground antialiased`}>
        {children}
      </body>
    </html>
  )
}
