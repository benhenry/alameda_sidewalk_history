import path from 'path'

// Mock fs - keep reference to mock functions for assertions
const mockMkdirSync = jest.fn()
const mockWriteFileSync = jest.fn()
const mockExistsSync = jest.fn()
const mockUnlinkSync = jest.fn()

jest.mock('fs', () => ({
  mkdirSync: mockMkdirSync,
  writeFileSync: mockWriteFileSync,
  existsSync: mockExistsSync,
  unlinkSync: mockUnlinkSync,
}))

// Clear env vars so we test local storage path
const originalEnv = process.env

describe('storage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    // Reset env to ensure local storage path
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_KEY
    delete process.env.GCS_BUCKET_NAME
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('uploadFile - local storage', () => {
    it('should upload file to local directory', async () => {
      const { uploadFile } = await import('../storage')

      const buffer = Buffer.from('test image data')
      const result = await uploadFile(buffer, 'test-photo.jpg', 'seg-123')

      expect(mockMkdirSync).toHaveBeenCalled()
      expect(mockWriteFileSync).toHaveBeenCalled()
      expect(result.filename).toBeTruthy()
      expect(result.url).toContain('seg-123')
      expect(result.size).toBe(buffer.byteLength)
    })

    it('should sanitize filename', async () => {
      const { uploadFile } = await import('../storage')

      const buffer = Buffer.from('test')
      const result = await uploadFile(buffer, 'test photo@#$.jpg', 'seg-1')

      // Should have sanitized special chars to underscores
      expect(mockWriteFileSync).toHaveBeenCalled()
      expect(result.url).toContain('test_photo___')
    })
  })

  describe('deleteFile - local storage', () => {
    it('should delete file when it exists', async () => {
      const { deleteFile } = await import('../storage')
      mockExistsSync.mockReturnValue(true)

      const result = await deleteFile('uploads/test.jpg')

      expect(result).toBe(true)
      expect(mockUnlinkSync).toHaveBeenCalled()
    })

    it('should return false when file does not exist', async () => {
      const { deleteFile } = await import('../storage')
      mockExistsSync.mockReturnValue(false)

      const result = await deleteFile('uploads/nonexistent.jpg')

      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      const { deleteFile } = await import('../storage')
      mockExistsSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const result = await deleteFile('uploads/error.jpg')
      expect(result).toBe(false)
    })
  })

  describe('getFileUrl - local storage', () => {
    it('should return local path', async () => {
      const { getFileUrl } = await import('../storage')

      const result = await getFileUrl('uploads/test.jpg')
      expect(result).toBe('/uploads/test.jpg')
    })
  })

  describe('storage backend detection', () => {
    it('should default to local storage when no cloud env vars', async () => {
      const storage = await import('../storage')
      expect(storage.useSupabase).toBe(false)
      expect(storage.useGCS).toBe(false)
    })
  })
})
