/*
 * Copyright (c) 2025 Ben Henry
 * Licensed under the MIT License
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  suggestions: string[]
  loading?: boolean
  onSearch?: (query: string) => void
}

export default function AutocompleteInput({
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  disabled,
  className = '',
  suggestions,
  loading = false,
  onSearch
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [lastSearchValue, setLastSearchValue] = useState(value)
  const [userHasInteracted, setUserHasInteracted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Memoize the search function to prevent re-runs
  const debouncedSearch = useCallback(
    (searchValue: string) => {
      if (onSearch && searchValue.length >= 2 && searchValue !== lastSearchValue && userHasInteracted) {
        setLastSearchValue(searchValue)
        onSearch(searchValue)
      } else if (searchValue.length < 2 && lastSearchValue !== '') {
        setLastSearchValue('')
      }
    },
    [onSearch, lastSearchValue, userHasInteracted]
  )

  // Search when input changes (but only after user interaction)
  useEffect(() => {
    if (userHasInteracted && (value.length >= 2 || (value.length < 2 && lastSearchValue !== ''))) {
      const timer = setTimeout(() => debouncedSearch(value), 300) // Debounce
      return () => clearTimeout(timer)
    }
  }, [value, debouncedSearch, userHasInteracted])

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setUserHasInteracted(true) // Mark that user has interacted
    onChange(newValue)
    setIsOpen(newValue.length >= 2)
    setHighlightedIndex(-1)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          selectSuggestion(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Select a suggestion
  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion)
    setIsOpen(false)
    setHighlightedIndex(-1)
    inputRef.current?.blur()
  }

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const showDropdown = isOpen && (suggestions.length > 0 || loading)

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onBlur={() => {
            // Delay blur to allow click on suggestions
            setTimeout(() => {
              setIsOpen(false)
              onBlur?.()
            }, 200)
          }}
          onFocus={() => {
            setUserHasInteracted(true)
            if (value.length >= 2) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full pr-8 ${className}`}
          autoComplete="off"
        />
        {showDropdown && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        )}
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              Loading suggestions...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No suggestions found
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                  index === highlightedIndex ? 'bg-blue-50' : ''
                }`}
                onClick={() => selectSuggestion(suggestion)}
              >
                {suggestion}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}