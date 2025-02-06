import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import './globals.css'

import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Annuity Portfolio Tracker',
  description:
    'Track and analyze your annuity portfolio performance with interactive charts and real-time market data.',
  metadataBase: new URL('https://bitcoin-annuities.vercel.app'),
  openGraph: {
    title: 'Annuity Portfolio Tracker',
    description:
      'Track and analyze your annuity portfolio performance with interactive charts and real-time market data.',
    type: 'website',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'Annuity Portfolio Tracker',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Annuity Portfolio Tracker',
    description:
      'Track and analyze your annuity portfolio performance with interactive charts and real-time market data.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  )
}
