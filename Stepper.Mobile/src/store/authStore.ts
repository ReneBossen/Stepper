import { create } from 'zustand';
import { authApi } from '@services/api/authApi';
import { refreshSession, setOnSessionExpired } from '@services/api/client';
import { ApiError } from '@services/api/types';
import { tokenStorage } from '@services/tokenStorage';
import { useUserStore } from '@store/userStore';
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

      // Store tokens and user info securely so the session survives app
      // restarts without needing a network round-trip to rehydrate the user.
      await tokenStorage.setTokens(
        response.accessToken,
        response.refreshToken,
        response.expiresIn
      );
      await tokenStorage.setUserInfo(response.user);

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

      // Store tokens and user info securely so the session survives app
      // restarts without needing a network round-trip to rehydrate the user.
      await tokenStorage.setTokens(
        response.accessToken,
        response.refreshToken,
        response.expiresIn
      );
      await tokenStorage.setUserInfo(response.user);

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
      const accessToken = await tokenStorage.getAccessToken();
      const refreshToken = await tokenStorage.getRefreshToken();

      if (!accessToken) {
        // No tokens stored, user is not authenticated
        set({ isLoading: false });
        return;
      }

      const tokenType = await tokenStorage.getTokenType();
      const storedUser = await tokenStorage.getUserInfo();
      const isExpired = await tokenStorage.isAccessTokenExpired();

      // OAuth tokens cannot be refreshed via the backend. Only clear them
      // when they have definitively expired.
      if (tokenType === 'oauth') {
        if (isExpired) {
          await tokenStorage.clearTokens();
          set({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }

        if (storedUser) {
          set({ user: storedUser, isAuthenticated: true, isLoading: false });
        } else {
          await tokenStorage.clearTokens();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
        return;
      }

      // Backend tokens: prefer an offline restore from persisted user info.
      // Transient network/backend problems must NOT log the user out.
      if (!isExpired && storedUser) {
        set({ user: storedUser, isAuthenticated: true, isLoading: false });
        return;
      }

      if (!refreshToken) {
        // Legacy session with access token but no refresh token — keep the
        // user in the app if we have their info; otherwise nothing to restore.
        if (storedUser) {
          set({ user: storedUser, isAuthenticated: true, isLoading: false });
        } else {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
        return;
      }

      try {
        // Routed through the shared in-flight mutex in client.ts so we never
        // race with API-call-driven refreshes on app resume.
        const response = await refreshSession();

        set({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error: unknown) {
        // Only treat an explicit 401 from the refresh endpoint as a truly
        // invalid session. Network errors, timeouts, or 5xx must not evict
        // the user — fall back to the persisted user info so they remain
        // signed in and can retry. Note: refreshSession() has already
        // cleared tokens and notified the session-expired callback on 401,
        // so we just need to update local state.
        if (error instanceof ApiError && error.isUnauthorized) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        if (storedUser) {
          set({ user: storedUser, isAuthenticated: true, isLoading: false });
        } else {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: getErrorMessage(error),
          });
        }
      }
    } catch (error: unknown) {
      // Never clear tokens for unknown errors — leave the session intact
      // and surface the error so the UI can decide what to do.
      set({
        isLoading: false,
        error: getErrorMessage(error),
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
  // Match the manual sign-out path so auto-eviction doesn't leave stale
  // profile data (name, avatar, theme preference) behind.
  useUserStore.getState().clearUser();
});
