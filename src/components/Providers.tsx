'use client'

import { SessionProvider } from 'next-auth/react'
import { AuthProvider } from '@/lib/auth-context'
import { SidewalkProvider } from '@/lib/sidewalk-context'
import { ToastProvider } from '@/components/Toast'
import { DevAuthProvider, DevLoginBar } from '@/lib/dev-auth'

const isDev = process.env.NODE_ENV === 'development'

export function Providers({ children }: { children: React.ReactNode }) {
  // In development, use DevAuthProvider for easy testing without OAuth
  if (isDev) {
    return (
      <DevAuthProvider>
        <SidewalkProvider>
          <ToastProvider>
            <DevLoginBar />
            <div className="pt-10"> {/* Offset for dev bar */}
              {children}
            </div>
          </ToastProvider>
        </SidewalkProvider>
      </DevAuthProvider>
    )
  }

  // Production: use real Auth.js
  return (
    <SessionProvider>
      <AuthProvider>
        <SidewalkProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SidewalkProvider>
      </AuthProvider>
    </SessionProvider>
  )
}
