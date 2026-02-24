'use client'

import { useEffect, useRef } from 'react'

interface GoogleAdProps {
  slot: string
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal'
  style?: React.CSSProperties
  className?: string
}

/**
 * Google AdSense ad component
 *
 * Usage:
 *   <GoogleAd slot="1234567890" format="auto" />
 *
 * You need to:
 * 1. Sign up for Google AdSense at https://www.google.com/adsense
 * 2. Get your publisher ID (ca-pub-XXXXXXXXXXXXXXXX)
 * 3. Create ad units and get slot IDs
 * 4. Set NEXT_PUBLIC_ADSENSE_ID in environment variables
 */
export default function GoogleAd({
  slot,
  format = 'auto',
  style,
  className = ''
}: GoogleAdProps) {
  const adRef = useRef<HTMLDivElement>(null)
  const isAdLoaded = useRef(false)

  useEffect(() => {
    // Only load ads in production and if AdSense ID is configured
    const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID
    if (!adsenseId || process.env.NODE_ENV === 'development') {
      return
    }

    // Prevent double-loading
    if (isAdLoaded.current) return
    isAdLoaded.current = true

    try {
      // Push ad to AdSense
      ;((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
    } catch (error) {
      console.error('AdSense error:', error)
    }
  }, [])

  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID

  // Don't render anything if no AdSense ID configured
  if (!adsenseId) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div
          className={`bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-500 text-sm ${className}`}
          style={{ minHeight: '90px', ...style }}
        >
          Ad Placeholder (slot: {slot})
        </div>
      )
    }
    return null
  }

  return (
    <div ref={adRef} className={className} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client={adsenseId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}

/**
 * Minimal footer ad - horizontal banner
 */
export function FooterAd() {
  return (
    <div className="w-full bg-gray-50 border-t border-gray-200 py-2">
      <div className="max-w-4xl mx-auto px-4">
        <GoogleAd
          slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER || 'FOOTER_SLOT'}
          format="horizontal"
          style={{ minHeight: '50px', maxHeight: '90px' }}
        />
      </div>
    </div>
  )
}

/**
 * Sidebar ad - vertical/rectangle format
 */
export function SidebarAd() {
  return (
    <div className="bg-gray-50 rounded-lg p-2 mt-4">
      <p className="text-xs text-gray-400 mb-1">Advertisement</p>
      <GoogleAd
        slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR || 'SIDEBAR_SLOT'}
        format="rectangle"
        style={{ minHeight: '250px' }}
      />
    </div>
  )
}
