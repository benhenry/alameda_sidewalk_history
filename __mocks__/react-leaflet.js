import React from 'react'

export const MapContainer = ({ children, ...props }) => 
  React.createElement('div', { 'data-testid': 'map-container', ...props }, children)

export const TileLayer = (props) => 
  React.createElement('div', { 'data-testid': 'tile-layer', ...props })

export const Polyline = (props) => 
  React.createElement('div', { 'data-testid': 'polyline', ...props })

export const Popup = ({ children, ...props }) => 
  React.createElement('div', { 'data-testid': 'popup', ...props }, children)

export const useMapEvents = (eventHandlers) => {
  React.useEffect(() => {
    if (eventHandlers.click) {
      // Mock click event
      const mockEvent = { latlng: { lat: 37.7652, lng: -122.2416 } }
      eventHandlers.click(mockEvent)
    }
  }, [eventHandlers])
  return null
}

export const useMap = () => ({
  on: jest.fn(),
  off: jest.fn(),
  getZoom: jest.fn(() => 14),
  getCenter: jest.fn(() => ({ lat: 37.7652, lng: -122.2416 })),
  setView: jest.fn(),
  removeLayer: jest.fn(),
  addLayer: jest.fn(),
})