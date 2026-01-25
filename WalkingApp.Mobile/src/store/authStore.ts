import { create } from 'zustand';
import { authApi } from '@services/api/authApi';
import { tokenStorage } from '@services/tokenStorage';
import { getErrorMessage } from '@utils/errorUtils';
import type { AuthUser } from '../types/auth';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  restoreSession: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ email, password });

      // Store tokens securely
      await tokenStorage.setTokens(
        response.accessToken,
        response.refreshToken,
        response.expiresIn
      );

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
      throw error;
    }
  },

  signUp: async (email, password, displayName) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register({ email, password, displayName });

      // Store tokens securely
      await tokenStorage.setTokens(
        response.accessToken,
        response.refreshToken,
        response.expiresIn
      );

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
      throw error;
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      // Get current access token to invalidate on server
      const accessToken = await tokenStorage.getAccessToken();
      if (accessToken) {
        await authApi.logout(accessToken);
      }

      // Clear tokens locally regardless of server response
      await tokenStorage.clearTokens();

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error: unknown) {
      // Still clear local state even if server logout fails
      await tokenStorage.clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        error: getErrorMessage(error),
        isLoading: false,
      });
    }
  },

  resetPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.forgotPassword(email);
      set({ isLoading: false });
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
      throw error;
    }
  },

  restoreSession: async () => {
    set({ isLoading: true, error: null });
    try {
      // Check if we have stored tokens
      const accessToken = await tokenStorage.getAccessToken();
      const refreshToken = await tokenStorage.getRefreshToken();

      if (!accessToken || !refreshToken) {
        // No tokens stored, user is not authenticated
        set({ isLoading: false });
        return;
      }

      // Check if access token is expired
      const isExpired = await tokenStorage.isAccessTokenExpired();

      if (isExpired) {
        // Try to refresh the token
        try {
          const response = await authApi.refreshToken(refreshToken);

          // Store new tokens
          await tokenStorage.setTokens(
            response.accessToken,
            response.refreshToken,
            response.expiresIn
          );

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // Refresh failed, clear tokens and require re-login
          await tokenStorage.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        // Access token is still valid, but we need user info
        // Refresh anyway to get user info and ensure session is valid
        try {
          const response = await authApi.refreshToken(refreshToken);

          // Store new tokens
          await tokenStorage.setTokens(
            response.accessToken,
            response.refreshToken,
            response.expiresIn
          );

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // Token invalid, clear and require re-login
          await tokenStorage.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      }
    } catch (error: unknown) {
      // Any error during restore, clear tokens
      await tokenStorage.clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        error: getErrorMessage(error),
        isLoading: false,
      });
    }
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },

  clearError: () => set({ error: null }),
}));
