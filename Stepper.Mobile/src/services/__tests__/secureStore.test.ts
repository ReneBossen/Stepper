import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ExpoSecureStoreAdapter, isSecureStoreAvailable } from '../secureStore';

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

describe('ExpoSecureStoreAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getItem', () => {
    it('should successfully retrieve an item from SecureStore', async () => {
      const mockValue = 'test-token';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockValue);

      const result = await ExpoSecureStoreAdapter.getItem('auth-token');

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth-token');
      expect(result).toBe(mockValue);
    });

    it('should return null when item does not exist', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await ExpoSecureStoreAdapter.getItem('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully and return null', async () => {
      const error = new Error('SecureStore error');
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(error);

      const result = await ExpoSecureStoreAdapter.getItem('auth-token');

      expect(console.error).toHaveBeenCalledWith('SecureStore getItem error:', error);
      expect(result).toBeNull();
    });

    it('should handle empty string values', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('');

      const result = await ExpoSecureStoreAdapter.getItem('empty-key');

      expect(result).toBe('');
    });
  });

  describe('setItem', () => {
    it('should successfully store an item in SecureStore', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      await ExpoSecureStoreAdapter.setItem('auth-token', 'new-token-value');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth-token', 'new-token-value');
    });

    it('should handle errors and throw them', async () => {
      const error = new Error('Storage full');
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(error);

      await expect(
        ExpoSecureStoreAdapter.setItem('auth-token', 'value')
      ).rejects.toThrow('Storage full');

      expect(console.error).toHaveBeenCalledWith('SecureStore setItem error:', error);
    });

    it('should handle storing large values', async () => {
      const largeValue = 'a'.repeat(2048);
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      await ExpoSecureStoreAdapter.setItem('large-key', largeValue);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('large-key', largeValue);
    });

    it('should handle special characters in values', async () => {
      const specialValue = 'test@#$%^&*(){}[]|\\:";\'<>?,./';
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      await ExpoSecureStoreAdapter.setItem('special-key', specialValue);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('special-key', specialValue);
    });
  });

  describe('removeItem', () => {
    it('should successfully remove an item from SecureStore', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      await ExpoSecureStoreAdapter.removeItem('auth-token');

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth-token');
    });

    it('should handle errors and throw them', async () => {
      const error = new Error('Delete failed');
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(error);

      await expect(
        ExpoSecureStoreAdapter.removeItem('auth-token')
      ).rejects.toThrow('Delete failed');

      expect(console.error).toHaveBeenCalledWith('SecureStore removeItem error:', error);
    });

    it('should handle removing non-existent items', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      await ExpoSecureStoreAdapter.removeItem('nonexistent-key');

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('nonexistent-key');
    });
  });
});

describe('isSecureStoreAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when running on web platform', async () => {
    (Platform as any).OS = 'web';

    const result = await isSecureStoreAvailable();

    expect(result).toBe(false);
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('should return true when SecureStore is available on iOS', async () => {
    (Platform as any).OS = 'ios';
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

    const result = await isSecureStoreAvailable();

    expect(result).toBe(true);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('test', 'test');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('test');
  });

  it('should return true when SecureStore is available on Android', async () => {
    (Platform as any).OS = 'android';
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

    const result = await isSecureStoreAvailable();

    expect(result).toBe(true);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('test', 'test');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('test');
  });

  it('should return false when SecureStore test write fails', async () => {
    (Platform as any).OS = 'ios';
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('Not available'));

    const result = await isSecureStoreAvailable();

    expect(result).toBe(false);
  });

  it('should return false when SecureStore test delete fails', async () => {
    (Platform as any).OS = 'ios';
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(new Error('Delete failed'));

    const result = await isSecureStoreAvailable();

    expect(result).toBe(false);
  });

  it('should clean up test data even when available', async () => {
    (Platform as any).OS = 'ios';
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

    await isSecureStoreAvailable();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('test');
  });
});
