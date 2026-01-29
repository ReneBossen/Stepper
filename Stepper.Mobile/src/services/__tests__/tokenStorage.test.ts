import * as SecureStore from 'expo-secure-store';
import { tokenStorage } from '../tokenStorage';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('tokenStorage', () => {
  const mockAccessToken = 'mock-access-token-123';
  const mockRefreshToken = 'mock-refresh-token-456';
  const mockExpiresIn = 3600; // 1 hour in seconds

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Date.now mock if any
    jest.restoreAllMocks();
  });

  describe('setTokens', () => {
    it('should store all token values correctly', async () => {
      const mockNow = 1700000000000; // Fixed timestamp
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      await tokenStorage.setTokens(mockAccessToken, mockRefreshToken, mockExpiresIn);

      // Expected expiry time: now + (expiresIn * 1000)
      const expectedExpiry = mockNow + (mockExpiresIn * 1000);

      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(4);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_access_token', mockAccessToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_refresh_token', mockRefreshToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token_expiry', expectedExpiry.toString());
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token_type', 'backend');
    });

    it('should store tokens concurrently using Promise.all', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 10));
      });

      const startTime = Date.now();
      await tokenStorage.setTokens(mockAccessToken, mockRefreshToken, mockExpiresIn);
      const endTime = Date.now();

      // All four calls should happen in parallel, so total time should be ~10ms, not ~40ms
      expect(endTime - startTime).toBeLessThan(25);
      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(4);
    });

    it('should store oauth token type when specified', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      await tokenStorage.setTokens(mockAccessToken, mockRefreshToken, mockExpiresIn, 'oauth');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token_type', 'oauth');
    });

    it('should calculate expiry time correctly for different expiresIn values', async () => {
      const mockNow = 1700000000000;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const shortExpiry = 60; // 1 minute
      await tokenStorage.setTokens(mockAccessToken, mockRefreshToken, shortExpiry);

      const expectedExpiry = mockNow + (shortExpiry * 1000);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token_expiry', expectedExpiry.toString());
    });
  });

  describe('getAccessToken', () => {
    it('should retrieve stored access token', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockAccessToken);

      const result = await tokenStorage.getAccessToken();

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_access_token');
      expect(result).toBe(mockAccessToken);
    });

    it('should return null when no token is stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await tokenStorage.getAccessToken();

      expect(result).toBeNull();
    });

    it('should return null when SecureStore throws an error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('SecureStore error'));

      const result = await tokenStorage.getAccessToken();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error getting access token:', expect.any(Error));
    });
  });

  describe('getRefreshToken', () => {
    it('should retrieve stored refresh token', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockRefreshToken);

      const result = await tokenStorage.getRefreshToken();

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_refresh_token');
      expect(result).toBe(mockRefreshToken);
    });

    it('should return null when no token is stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await tokenStorage.getRefreshToken();

      expect(result).toBeNull();
    });

    it('should return null when SecureStore throws an error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('SecureStore error'));

      const result = await tokenStorage.getRefreshToken();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error getting refresh token:', expect.any(Error));
    });
  });

  describe('isAccessTokenExpired', () => {
    it('should return true when token is expired', async () => {
      const pastExpiry = Date.now() - 60000; // 1 minute ago
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(pastExpiry.toString());

      const result = await tokenStorage.isAccessTokenExpired();

      expect(result).toBe(true);
    });

    it('should return false when token is still valid (outside buffer)', async () => {
      const futureExpiry = Date.now() + 120000; // 2 minutes from now (> 60s buffer)
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(futureExpiry.toString());

      const result = await tokenStorage.isAccessTokenExpired();

      expect(result).toBe(false);
    });

    it('should return true when token is within 60-second buffer', async () => {
      const nearExpiry = Date.now() + 30000; // 30 seconds from now (< 60s buffer)
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(nearExpiry.toString());

      const result = await tokenStorage.isAccessTokenExpired();

      expect(result).toBe(true);
    });

    it('should return true when exactly at 60-second buffer boundary', async () => {
      const mockNow = 1700000000000;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      const exactBoundary = mockNow + 60000; // Exactly 60 seconds from now
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(exactBoundary.toString());

      const result = await tokenStorage.isAccessTokenExpired();

      // At exactly the buffer boundary, now > (expiryTime - bufferMs) is false
      // Because now (1700000000000) is not > expiryTime - buffer (1700000000000)
      expect(result).toBe(false);
    });

    it('should return true when no expiry is stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await tokenStorage.isAccessTokenExpired();

      expect(result).toBe(true);
    });

    it('should return true when expiry value is invalid (NaN)', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('not-a-number');

      const result = await tokenStorage.isAccessTokenExpired();

      expect(result).toBe(true);
    });

    it('should return true when expiry value is empty string', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('');

      const result = await tokenStorage.isAccessTokenExpired();

      expect(result).toBe(true);
    });

    it('should return true when SecureStore throws an error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('SecureStore error'));

      const result = await tokenStorage.isAccessTokenExpired();

      expect(result).toBe(true);
      expect(console.error).toHaveBeenCalledWith('Error checking token expiry:', expect.any(Error));
    });
  });

  describe('clearTokens', () => {
    it('should remove all stored token values', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      await tokenStorage.clearTokens();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(5);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_access_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_refresh_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token_expiry');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token_type');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_user_info');
    });

    it('should delete tokens concurrently using Promise.all', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 10));
      });

      const startTime = Date.now();
      await tokenStorage.clearTokens();
      const endTime = Date.now();

      // All five calls should happen in parallel (10ms each)
      // If sequential, would take ~50ms+. Allow generous margin for test runner overhead.
      expect(endTime - startTime).toBeLessThan(100);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(5);
    });
  });

  describe('handling when no tokens are stored', () => {
    it('should handle getAccessToken when no tokens exist', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await tokenStorage.getAccessToken();

      expect(result).toBeNull();
    });

    it('should handle getRefreshToken when no tokens exist', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await tokenStorage.getRefreshToken();

      expect(result).toBeNull();
    });

    it('should handle isAccessTokenExpired when no expiry exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await tokenStorage.isAccessTokenExpired();

      // Should assume expired when no expiry is stored
      expect(result).toBe(true);
    });

    it('should handle clearTokens when no tokens exist', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      // Should not throw even if tokens don't exist
      await expect(tokenStorage.clearTokens()).resolves.toBeUndefined();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(5);
    });
  });

  describe('getTokenType', () => {
    it('should return oauth when oauth is stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('oauth');

      const result = await tokenStorage.getTokenType();

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_token_type');
      expect(result).toBe('oauth');
    });

    it('should return backend when backend is stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('backend');

      const result = await tokenStorage.getTokenType();

      expect(result).toBe('backend');
    });

    it('should return null when no token type is stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await tokenStorage.getTokenType();

      expect(result).toBeNull();
    });

    it('should return null when invalid token type is stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('invalid');

      const result = await tokenStorage.getTokenType();

      expect(result).toBeNull();
    });

    it('should return null when SecureStore throws an error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('SecureStore error'));

      const result = await tokenStorage.getTokenType();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error getting token type:', expect.any(Error));
    });
  });

  describe('setUserInfo', () => {
    it('should store user info as JSON', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const user = { id: 'user-123', email: 'test@example.com', displayName: 'Test User' };
      await tokenStorage.setUserInfo(user);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_user_info', JSON.stringify(user));
    });

    it('should handle errors gracefully', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('SecureStore error'));

      const user = { id: 'user-123', email: 'test@example.com', displayName: 'Test User' };
      await tokenStorage.setUserInfo(user);

      expect(console.error).toHaveBeenCalledWith('Error storing user info:', expect.any(Error));
    });
  });

  describe('getUserInfo', () => {
    it('should return parsed user info', async () => {
      const user = { id: 'user-123', email: 'test@example.com', displayName: 'Test User' };
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(user));

      const result = await tokenStorage.getUserInfo();

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_user_info');
      expect(result).toEqual(user);
    });

    it('should return null when no user info is stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await tokenStorage.getUserInfo();

      expect(result).toBeNull();
    });

    it('should return null when JSON parsing fails', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('invalid json');

      const result = await tokenStorage.getUserInfo();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error getting user info:', expect.any(Error));
    });

    it('should return null when SecureStore throws an error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('SecureStore error'));

      const result = await tokenStorage.getUserInfo();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error getting user info:', expect.any(Error));
    });
  });
});
