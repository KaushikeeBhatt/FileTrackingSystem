// Mock window object for testing
const windowMock = {
  scrollTo: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  // Add other window properties as needed
  localStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  // Add other browser APIs as needed
};

global.window = windowMock;
global.scrollTo = windowMock.scrollTo;
