import { create } from 'zustand';
import { authApi } from '@services/api/authApi';
import { setOnSessionExpired } from '@services/api/client';
import { tokenStorage } from '@services/tokenStorage';
import { getErrorMessage } from '@utils/errorUtils';
import { track, identify, reset as resetAnalytics, setUserProperties } from '@services/analytics';
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

      // Identify user in analytics
      identify(response.user.id, {});

      // Track login event
      track('login_completed', { method: 'email' });

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

      // If email confirmation is required, don't store tokens (they're empty)
      // Let the caller handle showing the confirmation screen
      if (response.requiresEmailConfirmation) {
        // Track registration events - user registered but needs email confirmation
        track('registration_pending_confirmation', { method: 'email' });

        set({ isLoading: false });
        return;
      }

      // Store tokens securely
      await tokenStorage.setTokens(
        response.accessToken,
        response.refreshToken,
        response.expiresIn
      );

      // Identify user in analytics
      identify(response.user.id, {});

      // Track registration events
      track('registration_completed', {});
      track('registration_method', { method: 'email' });

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

      // Track logout event
      track('logout_completed', {});

      // Reset analytics identity
      resetAnalytics();

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error: unknown) {
      // Still clear local state even if server logout fails
      await tokenStorage.clearTokens();

      // Track logout event even on error
      track('logout_completed', {});

      // Reset analytics identity
      resetAnalytics();

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

      const tokenType = await tokenStorage.getTokenType();

      // Handle OAuth tokens - check expiry before restoring
      if (tokenType === 'oauth') {
        const isExpired = await tokenStorage.isAccessTokenExpired();
        if (isExpired) {
          await tokenStorage.clearTokens();
          set({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }

        const storedUser = await tokenStorage.getUserInfo();
        if (storedUser) {
          set({ user: storedUser, isAuthenticated: true, isLoading: false });
        } else {
          // No stored user - clear and require re-login
          await tokenStorage.clearTokens();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
        return;
      }

      const isExpired = await tokenStorage.isAccessTokenExpired();

      // Handle backend tokens - can refresh via backend
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

// Register the session-expired callback so the API client can notify
// the auth store without importing it directly (decouples layers).
setOnSessionExpired(() => {
  useAuthStore.getState().setUser(null);
});
