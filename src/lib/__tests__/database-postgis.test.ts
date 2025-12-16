// Mock pg module to avoid TextEncoder issues in Jest
jest.mock('pg', () => ({
  Pool: jest.fn()
}))

import { coordinatesToPostGIS } from '../database-postgres'

describe('PostGIS Utilities', () => {
  describe('coordinatesToPostGIS', () => {
    it('should convert coordinates to WKT LINESTRING', () => {
      const coords: [number, number][] = [
        [37.7652, -122.2416],
        [37.7660, -122.2420]
      ]
      const wkt = coordinatesToPostGIS(coords)

      expect(wkt).toContain('SRID=4326;LINESTRING')
      expect(wkt).toContain('-122.2416 37.7652')
      expect(wkt).toContain('-122.242 37.766')
    })

    it('should handle single coordinate pair', () => {
      const coords: [number, number][] = [
        [37.7652, -122.2416]
      ]
      const wkt = coordinatesToPostGIS(coords)

      expect(wkt).toBe('SRID=4326;LINESTRING(-122.2416 37.7652)')
    })

    it('should handle multiple coordinate pairs', () => {
      const coords: [number, number][] = [
        [37.7652, -122.2416],
        [37.7653, -122.2417],
        [37.7654, -122.2418]
      ]
      const wkt = coordinatesToPostGIS(coords)

      expect(wkt).toBe('SRID=4326;LINESTRING(-122.2416 37.7652,-122.2417 37.7653,-122.2418 37.7654)')
    })

    it('should correctly swap lat/lng to lng/lat for PostGIS', () => {
      // Leaflet uses [lat, lng], PostGIS uses [lng, lat]
      const coords: [number, number][] = [
        [37.7652, -122.2416]
      ]
      const wkt = coordinatesToPostGIS(coords)

      // Verify longitude comes first, then latitude
      expect(wkt).toMatch(/-122\.2416 37\.7652/)
    })
  })

  describe('PostGIS spatial query functions', () => {
    // Note: These tests would require a mock database connection
    // For now, we're just testing the conversion utility
    // Integration tests should be written separately for the spatial queries

    it('should be defined', () => {
      // This is a placeholder to ensure the test file is valid
      expect(coordinatesToPostGIS).toBeDefined()
    })
  })
})
