'use client'

/**
 * Development-only auth bypass for testing without OAuth.
 * This file should never be used in production.
 */

import React, { createContext, useContext, useState, useEffect } from 'react'

interface DevUser {
  id: string
  email: string
  username: string
  role: 'admin' | 'user'
  image: string | null
}

interface DevAuthContextType {
  user: DevUser | null
  loading: boolean
  logout: () => void
  isAdmin: () => boolean
  session: any
  // Dev-only methods
  loginAsAdmin: () => void
  loginAsUser: () => void
  devMode: boolean
}

const DEV_ADMIN: DevUser = {
  id: 'dev-admin-001',
  email: 'admin@dev.local',
  username: 'DevAdmin',
  role: 'admin',
  image: null,
}

const DEV_USER: DevUser = {
  id: 'dev-user-001',
  email: 'user@dev.local',
  username: 'DevUser',
  role: 'user',
  image: null,
}

const STORAGE_KEY = 'dev-auth-user'

const DevAuthContext = createContext<DevAuthContextType | undefined>(undefined)

export function useDevAuth() {
  const context = useContext(DevAuthContext)
  if (context === undefined) {
    throw new Error('useDevAuth must be used within a DevAuthProvider')
  }
  return context
}

export function DevAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DevUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Load saved user from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setUser(JSON.parse(saved))
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  const loginAsAdmin = () => {
    setUser(DEV_ADMIN)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEV_ADMIN))
  }

  const loginAsUser = () => {
    setUser(DEV_USER)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEV_USER))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const isAdmin = () => user?.role === 'admin'

  // Create a mock session object for compatibility
  const session = user ? {
    user: {
      id: user.id,
      email: user.email,
      name: user.username,
      role: user.role,
      image: user.image,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  } : null

  return (
    <DevAuthContext.Provider value={{
      user,
      loading,
      logout,
      isAdmin,
      session,
      loginAsAdmin,
      loginAsUser,
      devMode: true,
    }}>
      {children}
    </DevAuthContext.Provider>
  )
}

/**
 * Dev login bar component - shows at top of screen in dev mode
 */
export function DevLoginBar() {
  const { user, loginAsAdmin, loginAsUser, logout, devMode } = useDevAuth()

  if (!devMode) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-400 text-yellow-900 px-4 py-2 flex items-center justify-between text-sm font-medium">
      <div className="flex items-center gap-2">
        <span className="font-bold">DEV MODE</span>
        <span className="text-yellow-700">|</span>
        {user ? (
          <span>
            Logged in as <strong>{user.username}</strong> ({user.role})
          </span>
        ) : (
          <span>Not logged in</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={loginAsUser}
          className={`px-3 py-1 rounded ${user?.role === 'user' ? 'bg-yellow-600 text-white' : 'bg-yellow-200 hover:bg-yellow-300'}`}
        >
          Login as User
        </button>
        <button
          onClick={loginAsAdmin}
          className={`px-3 py-1 rounded ${user?.role === 'admin' ? 'bg-yellow-600 text-white' : 'bg-yellow-200 hover:bg-yellow-300'}`}
        >
          Login as Admin
        </button>
        {user && (
          <button
            onClick={logout}
            className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600"
          >
            Logout
          </button>
        )}
      </div>
    </div>
  )
}
