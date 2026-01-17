import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '../authStore';
import * as supabaseService from '@services/supabase';

// Mock the supabase service
jest.mock('@services/supabase');

const mockSignInWithEmail = supabaseService.signInWithEmail as jest.MockedFunction<typeof supabaseService.signInWithEmail>;
const mockSignUpWithEmail = supabaseService.signUpWithEmail as jest.MockedFunction<typeof supabaseService.signUpWithEmail>;
const mockSignOut = supabaseService.signOut as jest.MockedFunction<typeof supabaseService.signOut>;
const mockResetPassword = supabaseService.resetPassword as jest.MockedFunction<typeof supabaseService.resetPassword>;

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    useAuthStore.setState({
      session: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('signIn', () => {
    it('should sign in successfully with valid credentials', async () => {
      const mockSession = {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        user: { id: '123', email: 'test@example.com' },
      } as any;

      const mockUser = { id: '123', email: 'test@example.com' } as any;

      mockSignInWithEmail.mockResolvedValue({
        session: mockSession,
        user: mockUser,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during sign in', async () => {
      mockSignInWithEmail.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ session: {} as any, user: {} as any }), 100))
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
      mockSignInWithEmail.mockRejectedValue(error);

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
      mockSignInWithEmail.mockRejectedValue(error);

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

      mockSignInWithEmail.mockResolvedValue({
        session: {} as any,
        user: {} as any,
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('signUp', () => {
    it('should sign up successfully with valid data', async () => {
      const mockSession = {
        access_token: 'mock-token',
        user: { id: '456', email: 'new@example.com' },
      } as any;

      const mockUser = { id: '456', email: 'new@example.com' } as any;

      mockSignUpWithEmail.mockResolvedValue({
        session: mockSession,
        user: mockUser,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signUp('new@example.com', 'password123', 'New User');
      });

      expect(mockSignUpWithEmail).toHaveBeenCalledWith('new@example.com', 'password123', 'New User');
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should set isAuthenticated based on session presence', async () => {
      // When session is null (email confirmation required)
      mockSignUpWithEmail.mockResolvedValue({
        session: null,
        user: { id: '456', email: 'new@example.com' } as any,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signUp('new@example.com', 'password123', 'New User');
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.session).toBeNull();
    });

    it('should handle sign up error', async () => {
      const error = new Error('Email already exists');
      mockSignUpWithEmail.mockRejectedValue(error);

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
      mockSignUpWithEmail.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ session: {} as any, user: {} as any }), 100))
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
      mockSignOut.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());

      // Set initial authenticated state
      useAuthStore.setState({
        session: { access_token: 'token' } as any,
        user: { id: '123' } as any,
        isAuthenticated: true,
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle sign out error', async () => {
      const error = new Error('Sign out failed');
      mockSignOut.mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Sign out failed');
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should not throw error on sign out failure', async () => {
      const error = new Error('Network error');
      mockSignOut.mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      // Should not throw, just set error
      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.resetPassword('test@example.com');
      });

      expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle reset password error', async () => {
      const error = new Error('Email not found');
      mockResetPassword.mockRejectedValue(error);

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
      mockResetPassword.mockImplementation(() =>
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

  describe('setSession', () => {
    it('should set session and update authentication state', () => {
      const mockSession = {
        access_token: 'token',
        user: { id: '123', email: 'test@example.com' },
      } as any;

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setSession(mockSession);
      });

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockSession.user);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should clear state when session is null', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set initial state
      useAuthStore.setState({
        session: { access_token: 'token' } as any,
        user: { id: '123' } as any,
        isAuthenticated: true,
      });

      act(() => {
        result.current.setSession(null);
      });

      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should extract user from session', () => {
      const mockSession = {
        access_token: 'token',
        user: { id: '456', email: 'new@example.com' },
      } as any;

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setSession(mockSession);
      });

      expect(result.current.user).toEqual(mockSession.user);
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
        user: { id: '123' } as any,
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual({ id: '123' });
    });
  });
});
