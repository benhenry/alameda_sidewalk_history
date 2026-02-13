'use client'

import { SessionProvider } from 'next-auth/react'
import { AuthProvider } from '@/lib/auth-context'
import { SidewalkProvider } from '@/lib/sidewalk-context'
import { ToastProvider } from '@/components/Toast'

export function Providers({ children }: { children: React.ReactNode }) {
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
