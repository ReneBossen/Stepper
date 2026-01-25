import * as SecureStore from 'expo-secure-store';

/**
 * Secure storage keys for authentication tokens.
 */
const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

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
   */
  setTokens: async (
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ): Promise<void> => {
    // Calculate absolute expiry time from relative expiresIn
    const expiryTime = Date.now() + (expiresIn * 1000);

    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiryTime.toString()),
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
      return Date.now() > (expiryTime - bufferMs);
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true; // Assume expired on error
    }
  },

  /**
   * Clear all stored authentication tokens.
   *
   * Should be called on logout or when tokens become invalid.
   */
  clearTokens: async (): Promise<void> => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY),
    ]);
  },
};
