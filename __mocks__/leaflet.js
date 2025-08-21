const L = {
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: jest.fn(),
    },
  },
  polyline: jest.fn(() => ({
    addTo: jest.fn(),
    remove: jest.fn(),
  })),
  map: jest.fn(() => ({
    setView: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
  })),
}

module.exports = L