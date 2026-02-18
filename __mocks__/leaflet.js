const L = {
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: jest.fn(),
    },
  },
  divIcon: jest.fn(() => ({
    options: {},
    createIcon: jest.fn(),
  })),
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
module.exports.default = L