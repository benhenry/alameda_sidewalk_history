const React = require('react')

const MapContainer = ({ children, ...props }) =>
  React.createElement('div', { 'data-testid': 'map-container', ...props }, children)

const TileLayer = (props) =>
  React.createElement('div', { 'data-testid': 'tile-layer', ...props })

const Polyline = (props) =>
  React.createElement('div', { 'data-testid': 'polyline', ...props })

const Popup = ({ children, ...props }) =>
  React.createElement('div', { 'data-testid': 'popup', ...props }, children)

const useMapEvents = (eventHandlers) => {
  React.useEffect(() => {
    if (eventHandlers && eventHandlers.click) {
      // Mock click event
      const mockEvent = { latlng: { lat: 37.7652, lng: -122.2416 } }
      eventHandlers.click(mockEvent)
    }
  }, [eventHandlers])
  return null
}

const useMap = () => ({
  on: jest.fn(),
  off: jest.fn(),
  getZoom: jest.fn(() => 14),
  getCenter: jest.fn(() => ({ lat: 37.7652, lng: -122.2416 })),
  setView: jest.fn(),
  fitBounds: jest.fn(),
  removeLayer: jest.fn(),
  addLayer: jest.fn(),
})

module.exports = {
  MapContainer,
  TileLayer,
  Polyline,
  Popup,
  useMapEvents,
  useMap,
}