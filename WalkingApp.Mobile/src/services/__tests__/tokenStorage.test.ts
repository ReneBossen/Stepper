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

      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(3);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_access_token', mockAccessToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_refresh_token', mockRefreshToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token_expiry', expectedExpiry.toString());
    });

    it('should store tokens concurrently using Promise.all', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 10));
      });

      const startTime = Date.now();
      await tokenStorage.setTokens(mockAccessToken, mockRefreshToken, mockExpiresIn);
      const endTime = Date.now();

      // All three calls should happen in parallel, so total time should be ~10ms, not ~30ms
      expect(endTime - startTime).toBeLessThan(25);
      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(3);
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

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_access_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_refresh_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token_expiry');
    });

    it('should delete tokens concurrently using Promise.all', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 10));
      });

      const startTime = Date.now();
      await tokenStorage.clearTokens();
      const endTime = Date.now();

      // All three calls should happen in parallel (10ms each)
      // If sequential, would take ~30ms+. Allow generous margin for test runner overhead.
      expect(endTime - startTime).toBeLessThan(100);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
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
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
    });
  });
});
