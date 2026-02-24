import type { Metadata } from 'next'
import Script from 'next/script'
import { Providers } from '@/components/Providers'
import SkipLink from '@/components/SkipLink'
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
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID

  return (
    <html lang="en-US">
      <head>
        <meta name="google" content="notranslate" />
        <meta httpEquiv="Content-Language" content="en-US" />
        {/* Google AdSense - only load if configured */}
        {adsenseId && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
            crossOrigin="anonymous"
            strategy="lazyOnload"
          />
        )}
      </head>
      <body className="notranslate">
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <Providers>
          <SkipLink />
          <main id="main-content" tabIndex={-1} className="outline-none">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}