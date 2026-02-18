import React from 'react'

export const MapContainer = ({ children, ...props }) =>
  React.createElement('div', { 'data-testid': 'map-container', ...props }, children)

export const TileLayer = (props) =>
  React.createElement('div', { 'data-testid': 'tile-layer', ...props })

export const Polyline = (props) =>
  React.createElement('div', { 'data-testid': 'polyline', ...props })

export const Popup = ({ children, ...props }) =>
  React.createElement('div', { 'data-testid': 'popup', ...props }, children)

export const CircleMarker = (props) =>
  React.createElement('div', { 'data-testid': 'circle-marker', ...props })

// Mock Marker with ref support for draggable markers
export const Marker = React.forwardRef((props, ref) => {
  // Simulate ref methods for draggable markers
  React.useImperativeHandle(ref, () => ({
    getLatLng: () => ({ lat: props.position[0], lng: props.position[1] }),
  }))
  return React.createElement('div', { 'data-testid': 'marker', ...props })
})

export const useMapEvents = (eventHandlers) => {
  // Store event handlers for tests to access if needed, but don't auto-fire
  // Tests can manually trigger events through mock implementations
  return null
}

// Create a stable mock map object to prevent infinite re-renders
const mockBounds = {
  contains: jest.fn(() => true),
  getNorth: jest.fn(() => 37.77),
  getSouth: jest.fn(() => 37.76),
  getEast: jest.fn(() => -122.23),
  getWest: jest.fn(() => -122.25),
}

// Create a mock container element
const mockContainer = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  focus: jest.fn(),
  setAttribute: jest.fn(),
  getAttribute: jest.fn(() => null),
}

const mockMapInstance = {
  on: jest.fn(),
  off: jest.fn(),
  getZoom: jest.fn(() => 14),
  getCenter: jest.fn(() => ({ lat: 37.7652, lng: -122.2416 })),
  getBounds: jest.fn(() => mockBounds),
  setView: jest.fn(),
  fitBounds: jest.fn(),
  removeLayer: jest.fn(),
  addLayer: jest.fn(),
  getContainer: jest.fn(() => mockContainer),
  panBy: jest.fn(),
  zoomIn: jest.fn(),
  zoomOut: jest.fn(),
}

export const useMap = () => mockMapInstance