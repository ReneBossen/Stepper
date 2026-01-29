import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '../types/auth';

/**
 * Secure storage keys for authentication tokens.
 */
const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';
const TOKEN_TYPE_KEY = 'auth_token_type';
const USER_INFO_KEY = 'auth_user_info';

/**
 * Token type indicating the authentication source.
 * - 'oauth': Tokens from Supabase OAuth (Google, etc.) - cannot be refreshed via backend
 * - 'backend': Tokens from backend email/password auth - can be refreshed via backend
 */
export type TokenType = 'oauth' | 'backend';

/**
 * Token storage service for securely storing JWT tokens.
 *
 * Uses expo-secure-store for encrypted storage on iOS and Android.
 * Stores access token, refresh token, and token expiry time.
 */
export const tokenStorage = {
  /**
   * Store authentication tokens securely.
   *
   * @param accessToken - JWT access token for API requests
   * @param refreshToken - Refresh token for obtaining new access tokens
   * @param expiresIn - Token expiration time in seconds
   * @param tokenType - Type of token ('oauth' or 'backend'), defaults to 'backend'
   */
  setTokens: async (
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    tokenType: TokenType = 'backend'
  ): Promise<void> => {
    // Calculate absolute expiry time from relative expiresIn
    const expiryTime = Date.now() + (expiresIn * 1000);

    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiryTime.toString()),
      SecureStore.setItemAsync(TOKEN_TYPE_KEY, tokenType),
    ]);
  },

  /**
   * Get the stored access token.
   *
   * @returns The access token, or null if not stored
   */
  getAccessToken: async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  },

  /**
   * Get the stored refresh token.
   *
   * @returns The refresh token, or null if not stored
   */
  getRefreshToken: async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  },

  /**
   * Check if the access token is expired.
   *
   * Uses a 60-second buffer to ensure we refresh before actual expiry,
   * avoiding failed requests due to clock skew or network latency.
   *
   * @returns True if expired or expiry unknown, false if still valid
   */
  isAccessTokenExpired: async (): Promise<boolean> => {
    try {
      const expiryStr = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
      if (!expiryStr) {
        return true; // No expiry stored, assume expired
      }

      const expiryTime = parseInt(expiryStr, 10);
      if (isNaN(expiryTime)) {
        return true; // Invalid expiry value
      }

      // 60-second buffer before actual expiry
      const bufferMs = 60 * 1000;
      const now = Date.now();
      const isExpired = now > (expiryTime - bufferMs);
      return isExpired;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true; // Assume expired on error
    }
  },

  /**
   * Clear all stored authentication tokens and user info.
   *
   * Should be called on logout or when tokens become invalid.
   */
  clearTokens: async (): Promise<void> => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY),
      SecureStore.deleteItemAsync(TOKEN_TYPE_KEY),
      SecureStore.deleteItemAsync(USER_INFO_KEY),
    ]);
  },

  /**
   * Get the stored token type.
   *
   * @returns The token type ('oauth' or 'backend'), or null if not stored
   */
  getTokenType: async (): Promise<TokenType | null> => {
    try {
      const tokenType = await SecureStore.getItemAsync(TOKEN_TYPE_KEY);
      if (tokenType === 'oauth' || tokenType === 'backend') {
        return tokenType;
      }
      return null;
    } catch (error) {
      console.error('Error getting token type:', error);
      return null;
    }
  },

  /**
   * Store user information securely.
   *
   * Used for OAuth tokens where we cannot refresh to get user info.
   *
   * @param user - The user information to store
   */
  setUserInfo: async (user: AuthUser): Promise<void> => {
    try {
      await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error storing user info:', error);
    }
  },

  /**
   * Get the stored user information.
   *
   * @returns The stored user info, or null if not stored or invalid
   */
  getUserInfo: async (): Promise<AuthUser | null> => {
    try {
      const userJson = await SecureStore.getItemAsync(USER_INFO_KEY);
      if (userJson) {
        return JSON.parse(userJson) as AuthUser;
      }
      return null;
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  },
};
