import { authFetch } from '@/lib/auth-fetch';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock fetch
global.fetch = jest.fn();

// Mock Headers
const mockHeadersInstance = {
  append: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  has: jest.fn(),
  delete: jest.fn(),
  forEach: jest.fn()
};

global.Headers = jest.fn().mockImplementation(() => mockHeadersInstance);

describe('authFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true })
    });
  });

  it('should make fetch request without token when no token in localStorage', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const url = 'https://api.example.com/data';
    const options = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    await authFetch(url, options);

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth-token');
    expect(fetch).toHaveBeenCalledWith(url, {
      ...options,
      headers: mockHeadersInstance
    });
    expect(Headers).toHaveBeenCalledWith(options.headers);
  });

  it('should make fetch request with token when token exists in localStorage', async () => {
    const mockToken = 'test-jwt-token';
    mockLocalStorage.getItem.mockReturnValue(mockToken);

    const mockHeaders = {
      append: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      forEach: jest.fn()
    };
    (Headers as jest.Mock).mockReturnValue(mockHeaders);

    const url = 'https://api.example.com/protected';
    const options = {
      method: 'POST',
      body: JSON.stringify({ data: 'test' })
    };

    await authFetch(url, options);

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth-token');
    expect(mockHeaders.append).toHaveBeenCalledWith('Authorization', `Bearer ${mockToken}`);
    expect(fetch).toHaveBeenCalledWith(url, {
      ...options,
      headers: mockHeaders
    });
  });

  it('should handle empty options parameter', async () => {
    mockLocalStorage.getItem.mockReturnValue('test-token');

    const url = 'https://api.example.com/data';

    await authFetch(url);

    expect(fetch).toHaveBeenCalledWith(url, {
      headers: mockHeadersInstance
    });
  });

  it('should preserve existing headers when adding authorization', async () => {
    const mockToken = 'test-jwt-token';
    mockLocalStorage.getItem.mockReturnValue(mockToken);

    const mockHeaders = {
      append: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      forEach: jest.fn()
    };
    (Headers as jest.Mock).mockReturnValue(mockHeaders);

    const url = 'https://api.example.com/data';
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Header': 'custom-value'
      }
    };

    await authFetch(url, options);

    expect(Headers).toHaveBeenCalledWith(options.headers);
    expect(mockHeaders.append).toHaveBeenCalledWith('Authorization', `Bearer ${mockToken}`);
  });

  it('should return the response from fetch', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: 'test' })
    };
    (fetch as jest.Mock).mockResolvedValue(mockResponse);
    mockLocalStorage.getItem.mockReturnValue('test-token');

    const url = 'https://api.example.com/data';
    const result = await authFetch(url);

    expect(result).toBe(mockResponse);
  });

  it('should handle fetch errors', async () => {
    const mockError = new Error('Network error');
    (fetch as jest.Mock).mockRejectedValue(mockError);
    mockLocalStorage.getItem.mockReturnValue('test-token');

    const url = 'https://api.example.com/data';

    await expect(authFetch(url)).rejects.toThrow('Network error');
  });

  it('should handle empty string token', async () => {
    mockLocalStorage.getItem.mockReturnValue('');

    const mockHeaders = {
      append: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      forEach: jest.fn()
    };
    (Headers as jest.Mock).mockReturnValue(mockHeaders);

    const url = 'https://api.example.com/data';
    await authFetch(url);

    expect(mockHeaders.append).not.toHaveBeenCalled();
  });

  it('should handle null headers in options', async () => {
    mockLocalStorage.getItem.mockReturnValue('test-token');

    const url = 'https://api.example.com/data';
    const options: RequestInit = {
      method: 'GET',
      headers: null as any
    };

    await authFetch(url, options);

    expect(Headers).toHaveBeenCalledWith(null);
    expect(fetch).toHaveBeenCalled();
  });

  it('should handle undefined headers in options', async () => {
    mockLocalStorage.getItem.mockReturnValue('test-token');

    const url = 'https://api.example.com/data';
    const options = {
      method: 'GET',
      headers: undefined
    };

    await authFetch(url, options);

    expect(Headers).toHaveBeenCalledWith(undefined);
    expect(fetch).toHaveBeenCalled();
  });
});
