/*
 * Copyright (c) 2025 Ben Henry
 * Licensed under the MIT License
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'

interface GooglePlacesInputProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

declare global {
  interface Window {
    google: any
    initGooglePlaces: () => void
  }
}

export default function GooglePlacesInput({
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  disabled,
  className = ''
}: GooglePlacesInputProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [service, setService] = useState<any>(null)
  const [lastSearchQuery, setLastSearchQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load Google Places API
  useEffect(() => {
    if (window.google?.maps?.places) {
      console.log('Google Places API already loaded')
      setIsLoaded(true)
      setService(new window.google.maps.places.AutocompleteService())
      return
    }

    // Load Google Maps API if not already loaded
    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      console.log('Loading Google Places API...')
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      script.onload = () => {
        console.log('Google Places API loaded successfully')
        console.log('Google Maps object:', window.google?.maps)
        console.log('Places service available:', !!window.google?.maps?.places?.AutocompleteService)
        
        if (window.google?.maps?.places?.AutocompleteService) {
          setIsLoaded(true)
          setService(new window.google.maps.places.AutocompleteService())
        } else {
          console.error('AutocompleteService not available')
        }
      }
      script.onerror = () => {
        console.error('Failed to load Google Places API')
      }
      document.head.appendChild(script)
    }
  }, [])

  // Search for places
  const searchPlaces = (query: string) => {
    console.log('searchPlaces called with:', query, 'service:', !!service)
    
    if (!service || !query || query.length < 3) {
      setSuggestions([])
      setLastSearchQuery('')
      return
    }

    // Only search if the query has actually changed
    if (query === lastSearchQuery) {
      console.log('Query unchanged, skipping search')
      return
    }

    console.log('Searching Google Places for:', query)
    setLastSearchQuery(query)

    // Start with a basic request to test API connectivity
    const request = {
      input: query,
      componentRestrictions: { country: 'us' }
    }
    
    // If basic API works, we can add more specific filters later
    // location: new window.google.maps.LatLng(37.7652, -122.2416), // Alameda, CA center
    // radius: 15000, // 15km radius to cover more area  
    // types: ['route'] // Focus on streets/routes
    
    console.log('Places API request:', request)

    service.getPlacePredictions(request, (predictions: any[], status: any) => {
      console.log('Google Places API response:', { predictions, status })
      
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        console.log('All predictions:', predictions)
        
        // Filter for Alameda streets - be more flexible with matching
        const alamedaStreets = predictions.filter(prediction => {
          const desc = prediction.description.toLowerCase()
          return desc.includes('alameda') || desc.includes('ca, usa') || desc.includes('california')
        })
        
        console.log('Filtered Alameda streets:', alamedaStreets)
        
        // If no Alameda-specific results, show all results for broader matching
        const suggestions = alamedaStreets.length > 0 ? alamedaStreets : predictions
        setSuggestions(suggestions.slice(0, 8))
      } else {
        console.error('Places API error or no predictions:', status)
        console.error('Status details:', window.google?.maps?.places?.PlacesServiceStatus)
        setSuggestions([])
      }
    })
  }

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    
    if (newValue.length >= 3) {
      setIsOpen(true)
      searchPlaces(newValue)
    } else {
      setIsOpen(false)
      setSuggestions([])
    }
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
  const selectSuggestion = (suggestion: any) => {
    // Extract just the street name from the description
    const streetName = suggestion.structured_formatting?.main_text || suggestion.description.split(',')[0]
    onChange(streetName)
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

  const showDropdown = isOpen && isLoaded

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onBlur={() => {
            setTimeout(() => {
              setIsOpen(false)
              onBlur?.()
            }, 200)
          }}
          onFocus={() => {
            if (value.length >= 3 && suggestions.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Start typing street name..."}
          required={required}
          disabled={disabled || !isLoaded}
          className={`w-full pr-8 ${className}`}
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400">
          <MapPin className="h-4 w-4" />
        </div>
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              {value.length < 3 ? 'Type at least 3 characters' : 'No Alameda streets found'}
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              <button
                key={suggestion.place_id}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                  index === highlightedIndex ? 'bg-blue-50' : ''
                }`}
                onClick={() => selectSuggestion(suggestion)}
              >
                <div className="font-medium">{suggestion.structured_formatting?.main_text}</div>
                <div className="text-xs text-gray-500">{suggestion.structured_formatting?.secondary_text}</div>
              </button>
            ))
          )}
          <div className="px-3 py-1 text-xs text-gray-400 bg-gray-50 border-t">
            Powered by Google Places
          </div>
        </div>
      )}
    </div>
  )
}