import type { Metadata } from 'next'
import { Providers } from '@/components/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Alameda Sidewalk Map',
  description: 'Historical mapping of sidewalk contractors and installation years in Alameda, CA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en-US">
      <head>
        <meta name="google" content="notranslate" />
        <meta httpEquiv="Content-Language" content="en-US" />
      </head>
      <body className="notranslate">
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}