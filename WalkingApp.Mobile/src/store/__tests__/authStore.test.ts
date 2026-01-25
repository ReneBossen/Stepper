import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '../authStore';
import { authApi } from '@services/api/authApi';
import { tokenStorage } from '@services/tokenStorage';
import type { AuthResponse, AuthUser } from '../../types/auth';

// Mock the auth API and token storage
jest.mock('@services/api/authApi');
jest.mock('@services/tokenStorage');

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;
const mockTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;

// Test fixtures
const mockUser: AuthUser = {
  id: '123',
  email: 'test@example.com',
  displayName: 'Test User',
};

const mockAuthResponse: AuthResponse = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3600,
  user: mockUser,
};

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    // Default mock implementations
    mockTokenStorage.setTokens.mockResolvedValue(undefined);
    mockTokenStorage.clearTokens.mockResolvedValue(undefined);
    mockTokenStorage.getAccessToken.mockResolvedValue(null);
    mockTokenStorage.getRefreshToken.mockResolvedValue(null);
    mockTokenStorage.isAccessTokenExpired.mockResolvedValue(true);
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('signIn', () => {
    it('should sign in successfully with valid credentials', async () => {
      mockAuthApi.login.mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockAuthApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockTokenStorage.setTokens).toHaveBeenCalledWith(
        mockAuthResponse.accessToken,
        mockAuthResponse.refreshToken,
        mockAuthResponse.expiresIn
      );
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during sign in', async () => {
      mockAuthApi.login.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockAuthResponse), 100))
      );

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.signIn('test@example.com', 'password123');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle sign in error and set error state', async () => {
      const error = new Error('Invalid credentials');
      mockAuthApi.login.mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.signIn('test@example.com', 'wrongpassword');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid credentials');
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should throw error after setting error state', async () => {
      const error = new Error('Network error');
      mockAuthApi.login.mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      await expect(
        act(async () => {
          await result.current.signIn('test@example.com', 'password123');
        })
      ).rejects.toThrow('Network error');
    });

    it('should clear previous errors on new sign in attempt', async () => {
      const { result } = renderHook(() => useAuthStore());

      // Set initial error
      useAuthStore.setState({ error: 'Previous error' });

      mockAuthApi.login.mockResolvedValue(mockAuthResponse);

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('signUp', () => {
    it('should sign up successfully with valid data', async () => {
      mockAuthApi.register.mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signUp('new@example.com', 'password123', 'New User');
      });

      expect(mockAuthApi.register).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        displayName: 'New User',
      });
      expect(mockTokenStorage.setTokens).toHaveBeenCalledWith(
        mockAuthResponse.accessToken,
        mockAuthResponse.refreshToken,
        mockAuthResponse.expiresIn
      );
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle sign up error', async () => {
      const error = new Error('Email already exists');
      mockAuthApi.register.mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      try {
        await act(async () => {
          await result.current.signUp('existing@example.com', 'password123', 'User');
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('Email already exists');
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during sign up', async () => {
      mockAuthApi.register.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockAuthResponse), 100))
      );

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.signUp('test@example.com', 'password123', 'Test');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('signOut', () => {
    it('should sign out successfully and clear state', async () => {
      mockTokenStorage.getAccessToken.mockResolvedValue('mock-access-token');
      mockAuthApi.logout.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());

      // Set initial authenticated state
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockAuthApi.logout).toHaveBeenCalledWith('mock-access-token');
      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should clear local state even if server logout fails', async () => {
      const error = new Error('Sign out failed');
      mockTokenStorage.getAccessToken.mockResolvedValue('mock-access-token');
      mockAuthApi.logout.mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      // Set initial authenticated state
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
      });

      await act(async () => {
        await result.current.signOut();
      });

      // Should still clear local state
      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      await waitFor(() => {
        expect(result.current.error).toBe('Sign out failed');
      });
    });

    it('should not call logout API if no access token', async () => {
      mockTokenStorage.getAccessToken.mockResolvedValue(null);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockAuthApi.logout).not.toHaveBeenCalled();
      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      mockAuthApi.forgotPassword.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.resetPassword('test@example.com');
      });

      expect(mockAuthApi.forgotPassword).toHaveBeenCalledWith('test@example.com');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle reset password error', async () => {
      const error = new Error('Email not found');
      mockAuthApi.forgotPassword.mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      try {
        await act(async () => {
          await result.current.resetPassword('invalid@example.com');
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('Email not found');
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during password reset', async () => {
      mockAuthApi.forgotPassword.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.resetPassword('test@example.com');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('restoreSession', () => {
    it('should restore session when valid tokens exist', async () => {
      mockTokenStorage.getAccessToken.mockResolvedValue('mock-access-token');
      mockTokenStorage.getRefreshToken.mockResolvedValue('mock-refresh-token');
      mockTokenStorage.isAccessTokenExpired.mockResolvedValue(false);
      mockAuthApi.refreshToken.mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.restoreSession();
      });

      expect(mockAuthApi.refreshToken).toHaveBeenCalledWith('mock-refresh-token');
      expect(mockTokenStorage.setTokens).toHaveBeenCalledWith(
        mockAuthResponse.accessToken,
        mockAuthResponse.refreshToken,
        mockAuthResponse.expiresIn
      );
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should refresh expired token', async () => {
      mockTokenStorage.getAccessToken.mockResolvedValue('expired-access-token');
      mockTokenStorage.getRefreshToken.mockResolvedValue('mock-refresh-token');
      mockTokenStorage.isAccessTokenExpired.mockResolvedValue(true);
      mockAuthApi.refreshToken.mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.restoreSession();
      });

      expect(mockAuthApi.refreshToken).toHaveBeenCalledWith('mock-refresh-token');
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should clear tokens when refresh fails', async () => {
      mockTokenStorage.getAccessToken.mockResolvedValue('mock-access-token');
      mockTokenStorage.getRefreshToken.mockResolvedValue('mock-refresh-token');
      mockTokenStorage.isAccessTokenExpired.mockResolvedValue(true);
      mockAuthApi.refreshToken.mockRejectedValue(new Error('Refresh failed'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.restoreSession();
      });

      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should not authenticate when no tokens exist', async () => {
      mockTokenStorage.getAccessToken.mockResolvedValue(null);
      mockTokenStorage.getRefreshToken.mockResolvedValue(null);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.restoreSession();
      });

      expect(mockAuthApi.refreshToken).not.toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during session restore', async () => {
      mockTokenStorage.getAccessToken.mockResolvedValue('mock-access-token');
      mockTokenStorage.getRefreshToken.mockResolvedValue('mock-refresh-token');
      mockTokenStorage.isAccessTokenExpired.mockResolvedValue(false);
      mockAuthApi.refreshToken.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockAuthResponse), 100))
      );

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.restoreSession();
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('setUser', () => {
    it('should set user and update authentication state', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should clear state when user is null', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set initial state
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
      });

      act(() => {
        result.current.setUser(null);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set error
      useAuthStore.setState({ error: 'Some error' });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should not affect other state', () => {
      const { result } = renderHook(() => useAuthStore());

      useAuthStore.setState({
        error: 'Some error',
        isAuthenticated: true,
        user: mockUser,
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });
  });
});
