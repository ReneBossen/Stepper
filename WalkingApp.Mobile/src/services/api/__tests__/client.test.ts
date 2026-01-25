import { apiClient } from '../client';
import { ApiError } from '../types';
import { API_CONFIG } from '@config/api';

// Mock the supabase client
jest.mock('@services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

// Mock the API config
jest.mock('@config/api', () => ({
  API_CONFIG: {
    API_URL: 'https://api.example.com/api/v1',
    TIMEOUT: 30000,
  },
}));

// Import after mocking
import { supabase } from '@services/supabase';

const mockGetSession = supabase.auth.getSession as jest.Mock;

// Store original fetch
const originalFetch = global.fetch;

describe('apiClient', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create a mock fetch function
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Default: no session
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  describe('Auth token injection', () => {
    it('should add Authorization header when session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'test-jwt-token-12345',
          },
        },
        error: null,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: { id: '123' }, errors: [] }),
      });

      await apiClient.get('/users/me');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/users/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-jwt-token-12345',
          }),
        })
      );
    });

    it('should not add Authorization header when no session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: null, errors: [] }),
      });

      await apiClient.get('/public/health');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/public/health',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      );
    });

    it('should not add Authorization header when session access_token is null', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: null,
          },
        },
        error: null,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: null, errors: [] }),
      });

      await apiClient.get('/public/endpoint');

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1].headers;
      expect(headers['Authorization']).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should throw ApiError for non-2xx responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            data: null,
            errors: ['Validation failed: email is required'],
          }),
      });

      await expect(apiClient.post('/users', { name: 'Test' })).rejects.toThrow(ApiError);

      try {
        await apiClient.post('/users', { name: 'Test' });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(400);
        expect((error as ApiError).message).toBe('Validation failed: email is required');
      }
    });

    it('should extract all error messages from response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        json: () =>
          Promise.resolve({
            success: false,
            data: null,
            errors: ['Email is invalid', 'Password must be at least 8 characters', 'Name is required'],
          }),
      });

      try {
        await apiClient.post('/users', {});
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.errors).toHaveLength(3);
        expect(apiError.errors).toContain('Email is invalid');
        expect(apiError.errors).toContain('Password must be at least 8 characters');
        expect(apiError.errors).toContain('Name is required');
        // First error becomes the message
        expect(apiError.message).toBe('Email is invalid');
      }
    });

    it('should use default message when errors array is empty', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            success: false,
            data: null,
            errors: [],
          }),
      });

      try {
        await apiClient.get('/fail');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('An error occurred');
      }
    });

    it('should throw ApiError for network errors', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      try {
        await apiClient.get('/users');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(0);
        expect((error as ApiError).message).toBe('Failed to fetch');
        expect((error as ApiError).isNetworkError).toBe(true);
      }
    });

    it('should throw ApiError with generic message for unknown errors', async () => {
      mockFetch.mockRejectedValue('something weird happened');

      try {
        await apiClient.get('/users');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Network error');
        expect((error as ApiError).statusCode).toBe(0);
      }
    });

    it('should throw ApiError when success is false even with ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: false,
            data: null,
            errors: ['Business rule violation'],
          }),
      });

      await expect(apiClient.get('/endpoint')).rejects.toThrow(ApiError);

      try {
        await apiClient.get('/endpoint');
      } catch (error) {
        expect((error as ApiError).message).toBe('Business rule violation');
        expect((error as ApiError).statusCode).toBe(200);
      }
    });
  });

  describe('Timeout handling', () => {
    beforeEach(() => {
      // Use real timers for timeout tests as they involve AbortController
      jest.useRealTimers();
    });

    afterEach(() => {
      // Restore fake timers for other tests
      jest.useFakeTimers();
    });

    it('should abort request after timeout', async () => {
      // Mock fetch to simulate a slow request by listening to abort signal
      mockFetch.mockImplementation((url: string, options: RequestInit) => {
        return new Promise((resolve, reject) => {
          const signal = options.signal as AbortSignal;
          if (signal) {
            if (signal.aborted) {
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
              return;
            }
            signal.addEventListener('abort', () => {
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
            });
          }
          // Never resolve - simulating a hanging request
        });
      });

      // Use a very short timeout to make the test fast
      await expect(apiClient.get('/slow-endpoint', { timeout: 50 })).rejects.toThrow(ApiError);

      try {
        await apiClient.get('/slow-endpoint', { timeout: 50 });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Request timeout');
        expect((error as ApiError).statusCode).toBe(408);
        expect((error as ApiError).isTimeout).toBe(true);
      }
    }, 10000);

    it('should complete successfully before timeout', async () => {
      mockFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          // Resolve quickly, before timeout would occur
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ success: true, data: { id: '123' }, errors: [] }),
            });
          }, 10);
        });
      });

      // Request with 1 second timeout should succeed since fetch resolves in 10ms
      const result = await apiClient.get<{ id: string }>('/users/me', { timeout: 1000 });
      expect(result.id).toBe('123');
    });

    it('should clear timeout when request completes successfully', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: { id: '123' }, errors: [] }),
      });

      await apiClient.get('/users/me');

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should pass AbortSignal to fetch', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: null, errors: [] }),
      });

      await apiClient.get('/endpoint');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should use custom timeout when provided', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: null, errors: [] }),
      });

      await apiClient.get('/endpoint', { timeout: 5000 });

      // Find the setTimeout call with the timeout value
      const timeoutCalls = setTimeoutSpy.mock.calls.filter(call => call[1] === 5000);
      expect(timeoutCalls.length).toBeGreaterThan(0);

      setTimeoutSpy.mockRestore();
    });
  });

  describe('Request/response formatting', () => {
    describe('GET requests', () => {
      it('should make GET requests correctly', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: { name: 'John' }, errors: [] }),
        });

        const result = await apiClient.get<{ name: string }>('/users/123');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/api/v1/users/123',
          expect.objectContaining({
            method: 'GET',
            body: undefined,
          })
        );
        expect(result).toEqual({ name: 'John' });
      });

      it('should include Content-Type header for GET requests', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: null, errors: [] }),
        });

        await apiClient.get('/endpoint');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });

    describe('POST requests', () => {
      it('should make POST requests with body correctly', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ success: true, data: { id: 'new-123' }, errors: [] }),
        });

        const body = { name: 'Test User', email: 'test@example.com' };
        const result = await apiClient.post<{ id: string }>('/users', body);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/api/v1/users',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(body),
          })
        );
        expect(result).toEqual({ id: 'new-123' });
      });

      it('should handle POST without body', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: { triggered: true }, errors: [] }),
        });

        await apiClient.post('/actions/trigger');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'POST',
            body: undefined,
          })
        );
      });
    });

    describe('PUT requests', () => {
      it('should make PUT requests with body correctly', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: { updated: true }, errors: [] }),
        });

        const body = { display_name: 'New Name' };
        await apiClient.put('/users/profile', body);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/api/v1/users/profile',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify(body),
          })
        );
      });
    });

    describe('PATCH requests', () => {
      it('should make PATCH requests with body correctly', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: { patched: true }, errors: [] }),
        });

        const body = { active: false };
        await apiClient.patch('/users/settings', body);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/api/v1/users/settings',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify(body),
          })
        );
      });
    });

    describe('DELETE requests', () => {
      it('should make DELETE requests correctly', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: null, errors: [] }),
        });

        await apiClient.delete('/friends/456');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/api/v1/friends/456',
          expect.objectContaining({
            method: 'DELETE',
            body: undefined,
          })
        );
      });
    });

    describe('Response data extraction', () => {
      it('should correctly extract data from ApiResponse wrapper', async () => {
        const expectedData = {
          id: '123',
          name: 'Test User',
          steps: 10000,
          groups: ['group-1', 'group-2'],
        };

        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: expectedData,
              errors: [],
            }),
        });

        const result = await apiClient.get<typeof expectedData>('/users/123');

        expect(result).toEqual(expectedData);
        expect(result.id).toBe('123');
        expect(result.steps).toBe(10000);
        expect(result.groups).toHaveLength(2);
      });

      it('should handle 204 No Content responses', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 204,
          json: () => Promise.reject(new Error('No JSON body')),
        });

        const result = await apiClient.delete('/items/123');

        expect(result).toBeUndefined();
      });
    });

    describe('Custom headers', () => {
      it('should merge custom headers with default headers', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: null, errors: [] }),
        });

        await apiClient.get('/endpoint', {
          headers: {
            'X-Custom-Header': 'custom-value',
            'X-Request-Id': '12345',
          },
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'X-Custom-Header': 'custom-value',
              'X-Request-Id': '12345',
            }),
          })
        );
      });

      it('should allow custom headers to override default headers', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: null, errors: [] }),
        });

        await apiClient.post('/endpoint', { data: 'test' }, {
          headers: {
            'Content-Type': 'text/plain',
          },
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'text/plain',
            }),
          })
        );
      });
    });
  });

  describe('File upload', () => {
    it('should send FormData correctly', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'upload-token',
          },
        },
        error: null,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: { url: 'https://storage.example.com/avatar.jpg' },
            errors: [],
          }),
      });

      const formData = new FormData();
      formData.append('file', 'mock-file-data');
      formData.append('type', 'avatar');

      const result = await apiClient.upload<{ url: string }>('/users/avatar', formData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/users/avatar',
        expect.objectContaining({
          method: 'POST',
          body: formData,
        })
      );
      expect(result.url).toBe('https://storage.example.com/avatar.jpg');
    });

    it('should NOT set Content-Type header for FormData uploads', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: { uploaded: true },
            errors: [],
          }),
      });

      const formData = new FormData();
      formData.append('file', 'data');

      await apiClient.upload('/upload', formData);

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1].headers;

      // Content-Type should NOT be set for FormData
      // Browser/runtime sets it automatically with the boundary
      expect(headers['Content-Type']).toBeUndefined();
    });

    it('should include Authorization header for FormData uploads when authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'form-data-token',
          },
        },
        error: null,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: null, errors: [] }),
      });

      const formData = new FormData();
      await apiClient.upload('/upload', formData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer form-data-token',
          }),
        })
      );
    });

    it('should handle upload errors correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 413,
        json: () =>
          Promise.resolve({
            success: false,
            data: null,
            errors: ['File too large. Maximum size is 5MB'],
          }),
      });

      const formData = new FormData();
      formData.append('file', 'large-file-data');

      try {
        await apiClient.upload('/upload', formData);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(413);
        expect((error as ApiError).message).toBe('File too large. Maximum size is 5MB');
      }
    });

    it('should handle network errors during upload', async () => {
      mockFetch.mockRejectedValue(new Error('Network connection lost'));

      const formData = new FormData();

      try {
        await apiClient.upload('/upload', formData);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).isNetworkError).toBe(true);
        expect((error as ApiError).message).toBe('Network connection lost');
      }
    });

    it('should handle 204 No Content for uploads', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: () => Promise.reject(new Error('No JSON')),
      });

      const formData = new FormData();
      const result = await apiClient.upload('/upload', formData);

      expect(result).toBeUndefined();
    });
  });

  describe('ApiError helper methods', () => {
    it('should correctly identify unauthorized errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            success: false,
            data: null,
            errors: ['Authentication required'],
          }),
      });

      try {
        await apiClient.get('/protected');
      } catch (error) {
        expect((error as ApiError).isUnauthorized).toBe(true);
        expect((error as ApiError).isForbidden).toBe(false);
      }
    });

    it('should correctly identify forbidden errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () =>
          Promise.resolve({
            success: false,
            data: null,
            errors: ['Access denied'],
          }),
      });

      try {
        await apiClient.get('/admin');
      } catch (error) {
        expect((error as ApiError).isForbidden).toBe(true);
        expect((error as ApiError).isUnauthorized).toBe(false);
      }
    });

    it('should correctly identify not found errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            success: false,
            data: null,
            errors: ['User not found'],
          }),
      });

      try {
        await apiClient.get('/users/nonexistent');
      } catch (error) {
        expect((error as ApiError).isNotFound).toBe(true);
      }
    });

    it('should correctly identify server errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            success: false,
            data: null,
            errors: ['Internal server error'],
          }),
      });

      try {
        await apiClient.get('/fail');
      } catch (error) {
        expect((error as ApiError).isServerError).toBe(true);
      }
    });

    it('should identify 503 as server error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: () =>
          Promise.resolve({
            success: false,
            data: null,
            errors: ['Service unavailable'],
          }),
      });

      try {
        await apiClient.get('/service');
      } catch (error) {
        expect((error as ApiError).isServerError).toBe(true);
        expect((error as ApiError).statusCode).toBe(503);
      }
    });
  });
});
