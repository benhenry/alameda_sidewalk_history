'use client'

import { useState, useRef, useEffect } from 'react'
import { User, LogOut, Settings, Shield } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { user, logout, isAdmin } = useAuth()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [])

  if (!user) return null

  const handleLogout = () => {
    logout()
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <span className="hidden md:block text-gray-700 font-medium">
          {user.username}
        </span>
        {isAdmin() && (
          <Shield className="h-4 w-4 text-blue-600" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[1200]">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{user.username}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
            {isAdmin() && (
              <p className="text-xs text-blue-600 font-medium mt-1">Administrator</p>
            )}
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false)
                if (typeof window !== 'undefined') {
                  window.location.href = '/api/auth/me'
                }
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>

            {isAdmin() && (
              <button
                onClick={() => {
                  setIsOpen(false)
                  if (typeof window !== 'undefined') {
                    window.location.href = '/admin'
                  }
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Shield className="h-4 w-4" />
                Admin Panel
              </button>
            )}

            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}