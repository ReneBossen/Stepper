import { authApi } from '../authApi';
import { ApiError } from '../types';
import type { AuthResponse, LoginCredentials, RegisterCredentials } from '../../../types/auth';

// Mock the API config
jest.mock('../../../config/api', () => ({
  API_CONFIG: {
    API_URL: 'http://localhost:5000/api/v1',
  },
}));

// Save original fetch
const originalFetch = global.fetch;

describe('authApi', () => {
  const mockAuthResponse: AuthResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
    user: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      displayName: 'Test User',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('register', () => {
    const validCredentials: RegisterCredentials = {
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
    };

    it('should register successfully with valid credentials', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockAuthResponse,
          errors: [],
        }),
      });

      const result = await authApi.register(validCredentials);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/auth/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validCredentials),
        }
      );
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw ApiError when registration fails with 400', async () => {
      const errorMessage = 'Email already exists';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          success: false,
          data: null,
          errors: [errorMessage],
        }),
      });

      await expect(authApi.register(validCredentials)).rejects.toThrow(ApiError);

      try {
        await authApi.register(validCredentials);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe(errorMessage);
        expect((error as ApiError).statusCode).toBe(400);
      }
    });

    it('should throw ApiError when response success is false', async () => {
      const errorMessage = 'Invalid email format';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true, // HTTP 200 but success: false
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: false,
          data: null,
          errors: [errorMessage],
        }),
      });

      await expect(authApi.register(validCredentials)).rejects.toThrow(ApiError);
    });

    it('should throw ApiError with multiple error messages', async () => {
      const errors = ['Email is required', 'Password is too short'];
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          success: false,
          data: null,
          errors,
        }),
      });

      try {
        await authApi.register(validCredentials);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).errors).toEqual(errors);
      }
    });
  });

  describe('login', () => {
    const validCredentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockAuthResponse,
          errors: [],
        }),
      });

      const result = await authApi.login(validCredentials);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validCredentials),
        }
      );
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw ApiError when login fails with 401', async () => {
      const errorMessage = 'Invalid email or password';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({
          success: false,
          data: null,
          errors: [errorMessage],
        }),
      });

      try {
        await authApi.login(validCredentials);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe(errorMessage);
        expect((error as ApiError).statusCode).toBe(401);
        expect((error as ApiError).isUnauthorized).toBe(true);
      }
    });

    it('should throw ApiError when login fails with 400', async () => {
      const errorMessage = 'Email cannot be empty';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          success: false,
          data: null,
          errors: [errorMessage],
        }),
      });

      await expect(authApi.login(validCredentials)).rejects.toThrow(ApiError);
    });
  });

  describe('logout', () => {
    const accessToken = 'valid-access-token';

    it('should call logout endpoint with correct authorization header', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { message: 'Successfully logged out.' },
          errors: [],
        }),
      });

      await authApi.logout(accessToken);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/auth/logout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
    });

    it('should not throw even when logout fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({
          success: false,
          data: null,
          errors: ['Server error'],
        }),
      });

      // Should not throw
      await expect(authApi.logout(accessToken)).resolves.toBeUndefined();
    });

    it('should not throw even when fetch throws network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      // Should not throw - fire and forget
      await expect(authApi.logout(accessToken)).resolves.toBeUndefined();
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';

    it('should refresh token successfully', async () => {
      const newAuthResponse = {
        ...mockAuthResponse,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: newAuthResponse,
          errors: [],
        }),
      });

      const result = await authApi.refreshToken(refreshToken);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/auth/refresh',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }
      );
      expect(result).toEqual(newAuthResponse);
    });

    it('should throw ApiError when refresh token is invalid', async () => {
      const errorMessage = 'Invalid or expired refresh token';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({
          success: false,
          data: null,
          errors: [errorMessage],
        }),
      });

      try {
        await authApi.refreshToken(refreshToken);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe(errorMessage);
        expect((error as ApiError).statusCode).toBe(401);
      }
    });

    it('should throw ApiError when refresh token is expired', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({
          success: false,
          data: null,
          errors: ['Token expired'],
        }),
      });

      await expect(authApi.refreshToken(refreshToken)).rejects.toThrow(ApiError);
    });
  });

  describe('forgotPassword', () => {
    const email = 'test@example.com';

    it('should send forgot password request successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { message: 'If an account with that email exists, a password reset link has been sent.' },
          errors: [],
        }),
      });

      await authApi.forgotPassword(email);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/auth/forgot-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }
      );
    });

    it('should throw ApiError when email format is invalid', async () => {
      const errorMessage = 'Invalid email format';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          success: false,
          data: null,
          errors: [errorMessage],
        }),
      });

      await expect(authApi.forgotPassword('invalid-email')).rejects.toThrow(ApiError);

      try {
        await authApi.forgotPassword('invalid-email');
      } catch (error) {
        expect((error as ApiError).message).toBe(errorMessage);
      }
    });

    it('should throw ApiError when email is empty', async () => {
      const errorMessage = 'Email cannot be empty';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          success: false,
          data: null,
          errors: [errorMessage],
        }),
      });

      await expect(authApi.forgotPassword('')).rejects.toThrow(ApiError);
    });
  });

  describe('resetPassword', () => {
    const token = 'valid-reset-token';
    const newPassword = 'newPassword123';

    it('should reset password successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { message: 'Password has been reset successfully.' },
          errors: [],
        }),
      });

      await authApi.resetPassword(token, newPassword);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/auth/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword }),
        }
      );
    });

    it('should throw ApiError when token is invalid', async () => {
      const errorMessage = 'Invalid or expired reset token';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          success: false,
          data: null,
          errors: [errorMessage],
        }),
      });

      await expect(authApi.resetPassword('invalid-token', newPassword)).rejects.toThrow(ApiError);
    });

    it('should throw ApiError when password is too short', async () => {
      const errorMessage = 'Password must be at least 6 characters long';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          success: false,
          data: null,
          errors: [errorMessage],
        }),
      });

      await expect(authApi.resetPassword(token, '123')).rejects.toThrow(ApiError);

      try {
        await authApi.resetPassword(token, '123');
      } catch (error) {
        expect((error as ApiError).message).toBe(errorMessage);
      }
    });

    it('should throw ApiError when token is expired', async () => {
      const errorMessage = 'Failed to reset password. The link may have expired.';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          success: false,
          data: null,
          errors: [errorMessage],
        }),
      });

      await expect(authApi.resetPassword('expired-token', newPassword)).rejects.toThrow(ApiError);
    });
  });
});
