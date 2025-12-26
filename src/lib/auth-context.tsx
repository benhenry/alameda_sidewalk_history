'use client'

import React, { createContext, useContext } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Session } from 'next-auth'

interface AuthUser {
  id: string
  email: string
  username?: string
  role: 'admin' | 'user'
  image?: string | null
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  logout: () => void
  isAdmin: () => boolean
  session: Session | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const loading = status === 'loading'

  // Convert NextAuth session to our AuthUser format
  const user: AuthUser | null = session?.user ? {
    id: session.user.id,
    email: session.user.email || '',
    username: session.user.name || session.user.email?.split('@')[0] || 'User',
    role: session.user.role || 'user',
    image: session.user.image
  } : null

  const logout = async () => {
    await signOut({ callbackUrl: '/' })
  }

  const isAdmin = () => {
    return user?.role === 'admin'
  }

  const value = {
    user,
    loading,
    logout,
    isAdmin,
    session
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
