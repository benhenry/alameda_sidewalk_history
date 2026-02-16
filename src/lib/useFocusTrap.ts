'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UseFocusTrapOptions {
  enabled?: boolean
  onEscape?: () => void
}

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useFocusTrap<T extends HTMLElement>({
  enabled = true,
  onEscape,
}: UseFocusTrapOptions = {}) {
  const containerRef = useRef<T>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return []
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter((el) => el.offsetParent !== null) // Filter out hidden elements
  }, [])

  useEffect(() => {
    if (!enabled) return

    // Save the previously focused element
    previousActiveElementRef.current = document.activeElement as HTMLElement

    // Focus the first focusable element in the container
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      // Small delay to ensure modal is rendered
      requestAnimationFrame(() => {
        focusableElements[0]?.focus()
      })
    }

    // Restore focus when unmounting or disabling
    return () => {
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus()
      }
    }
  }, [enabled, getFocusableElements])

  useEffect(() => {
    if (!enabled || !containerRef.current) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape key
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault()
        onEscape()
        return
      }

      // Handle Tab key for focus trapping
      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements()
        if (focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          // Shift+Tab from first element -> move to last
          e.preventDefault()
          lastElement.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          // Tab from last element -> move to first
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, getFocusableElements, onEscape])

  return containerRef
}
