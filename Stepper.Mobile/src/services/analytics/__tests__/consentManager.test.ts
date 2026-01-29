/**
 * Unit tests for the GDPR Consent Manager.
 * Tests consent state persistence, granting, revoking, and versioning.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadConsentState,
  getConsentState,
  hasConsent,
  hasDeniedConsent,
  isConsentUnknown,
  grantConsent,
  revokeConsent,
  clearConsentData,
  isConsentOutdated,
  getCachedConsentState,
  hasConsentSync,
  initializeConsentManager,
  CONSENT_VERSION,
} from '../consentManager';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Storage keys used by the consent manager
const STORAGE_KEYS = {
  CONSENT_STATE: '@stepper/analytics_consent',
  CONSENT_TIMESTAMP: '@stepper/analytics_consent_timestamp',
  CONSENT_VERSION: '@stepper/analytics_consent_version',
};

describe('consentManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the cached state by loading unknown state
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  describe('initializeConsentManager', () => {
    it('should load consent state from storage', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('granted')
        .mockResolvedValueOnce('2024-01-15T10:00:00.000Z')
        .mockResolvedValueOnce('1.0');

      const state = await initializeConsentManager();

      expect(state).toEqual({
        status: 'granted',
        timestamp: '2024-01-15T10:00:00.000Z',
        version: '1.0',
      });
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.CONSENT_STATE);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.CONSENT_TIMESTAMP);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.CONSENT_VERSION);
    });

    it('should return default state when no consent is stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const state = await initializeConsentManager();

      expect(state).toEqual({
        status: 'unknown',
        timestamp: null,
        version: null,
      });
    });
  });

  describe('hasConsent', () => {
    it('should return true when consent is granted', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('granted')
        .mockResolvedValueOnce('2024-01-15T10:00:00.000Z')
        .mockResolvedValueOnce('1.0');

      // Initialize the cache first
      await initializeConsentManager();

      const result = await hasConsent();

      expect(result).toBe(true);
    });

    it('should return false when consent is denied', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('denied')
        .mockResolvedValueOnce('2024-01-15T10:00:00.000Z')
        .mockResolvedValueOnce('1.0');

      await initializeConsentManager();

      const result = await hasConsent();

      expect(result).toBe(false);
    });

    it('should return false when consent is unknown', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await initializeConsentManager();

      const result = await hasConsent();

      expect(result).toBe(false);
    });
  });

  describe('hasDeniedConsent', () => {
    it('should return true when consent is explicitly denied', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('denied')
        .mockResolvedValueOnce('2024-01-15T10:00:00.000Z')
        .mockResolvedValueOnce('1.0');

      await initializeConsentManager();

      const result = await hasDeniedConsent();

      expect(result).toBe(true);
    });

    it('should return false when consent is granted', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('granted')
        .mockResolvedValueOnce('2024-01-15T10:00:00.000Z')
        .mockResolvedValueOnce('1.0');

      await initializeConsentManager();

      const result = await hasDeniedConsent();

      expect(result).toBe(false);
    });
  });

  describe('isConsentUnknown', () => {
    it('should return true when consent has not been asked', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await initializeConsentManager();

      const result = await isConsentUnknown();

      expect(result).toBe(true);
    });

    it('should return false when consent has been granted', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('granted')
        .mockResolvedValueOnce('2024-01-15T10:00:00.000Z')
        .mockResolvedValueOnce('1.0');

      await initializeConsentManager();

      const result = await isConsentUnknown();

      expect(result).toBe(false);
    });
  });

  describe('grantConsent', () => {
    it('should persist consent with timestamp and version', async () => {
      const mockDate = new Date('2024-01-20T15:30:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await grantConsent();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.CONSENT_STATE,
        'granted'
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.CONSENT_TIMESTAMP,
        '2024-01-20T15:30:00.000Z'
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.CONSENT_VERSION,
        CONSENT_VERSION
      );

      jest.restoreAllMocks();
    });

    it('should update cached state after granting consent', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await grantConsent();

      const cachedState = getCachedConsentState();

      expect(cachedState?.status).toBe('granted');
      expect(cachedState?.version).toBe(CONSENT_VERSION);
      expect(cachedState?.timestamp).toBeDefined();
    });

    it('should throw error when storage fails', async () => {
      const error = new Error('Storage error');
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(error);

      await expect(grantConsent()).rejects.toThrow('Storage error');
    });
  });

  describe('revokeConsent', () => {
    it('should persist denied consent with timestamp and version', async () => {
      const mockDate = new Date('2024-01-20T16:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await revokeConsent();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.CONSENT_STATE,
        'denied'
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.CONSENT_TIMESTAMP,
        '2024-01-20T16:00:00.000Z'
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.CONSENT_VERSION,
        CONSENT_VERSION
      );

      jest.restoreAllMocks();
    });

    it('should update cached state after revoking consent', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await revokeConsent();

      const cachedState = getCachedConsentState();

      expect(cachedState?.status).toBe('denied');
    });

    it('should throw error when storage fails', async () => {
      const error = new Error('Storage error');
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(error);

      await expect(revokeConsent()).rejects.toThrow('Storage error');
    });
  });

  describe('clearConsentData', () => {
    it('should remove all consent data from storage', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await clearConsentData();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.CONSENT_STATE);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.CONSENT_TIMESTAMP);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.CONSENT_VERSION);
    });

    it('should reset cached state to default', async () => {
      // First grant consent to populate cache
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      await grantConsent();

      expect(getCachedConsentState()?.status).toBe('granted');

      // Then clear consent data
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      await clearConsentData();

      const cachedState = getCachedConsentState();

      expect(cachedState?.status).toBe('unknown');
      expect(cachedState?.timestamp).toBeNull();
      expect(cachedState?.version).toBeNull();
    });

    it('should throw error when storage fails', async () => {
      const error = new Error('Storage error');
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(error);

      await expect(clearConsentData()).rejects.toThrow('Storage error');
    });
  });

  describe('getConsentState', () => {
    it('should return cached state if available', async () => {
      // Initialize with granted consent
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('granted')
        .mockResolvedValueOnce('2024-01-15T10:00:00.000Z')
        .mockResolvedValueOnce('1.0');

      await initializeConsentManager();

      // Clear mock calls
      jest.clearAllMocks();

      // Should use cache without calling AsyncStorage
      const state = await getConsentState();

      expect(state.status).toBe('granted');
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it('should load from storage when cache is empty', async () => {
      // Reset cache by simulating fresh module
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await initializeConsentManager();

      // Now should have cache
      jest.clearAllMocks();

      const state = await getConsentState();

      expect(state.status).toBe('unknown');
      // Should not call storage since cache is set
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });
  });

  describe('hasConsentSync', () => {
    it('should return true when cached consent is granted', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      await grantConsent();

      const result = hasConsentSync();

      expect(result).toBe(true);
    });

    it('should return false when cached consent is denied', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      await revokeConsent();

      const result = hasConsentSync();

      expect(result).toBe(false);
    });

    it('should return false when cached consent is unknown', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await initializeConsentManager();

      const result = hasConsentSync();

      expect(result).toBe(false);
    });
  });

  describe('isConsentOutdated', () => {
    it('should return false when consent is not granted', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await initializeConsentManager();

      const result = await isConsentOutdated();

      expect(result).toBe(false);
    });

    it('should return false when consent version matches current version', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('granted')
        .mockResolvedValueOnce('2024-01-15T10:00:00.000Z')
        .mockResolvedValueOnce(CONSENT_VERSION);

      await initializeConsentManager();

      const result = await isConsentOutdated();

      expect(result).toBe(false);
    });

    it('should return true when consent version differs from current version', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('granted')
        .mockResolvedValueOnce('2024-01-15T10:00:00.000Z')
        .mockResolvedValueOnce('0.9'); // Old version

      await initializeConsentManager();

      const result = await isConsentOutdated();

      expect(result).toBe(true);
    });
  });

  describe('loadConsentState error handling', () => {
    it('should return default state when AsyncStorage fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const state = await loadConsentState();

      expect(state).toEqual({
        status: 'unknown',
        timestamp: null,
        version: null,
      });
    });
  });

  describe('consent versioning', () => {
    it('should store current version when granting consent', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await grantConsent();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.CONSENT_VERSION,
        CONSENT_VERSION
      );
    });

    it('should preserve version in cached state', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await grantConsent();

      const state = getCachedConsentState();

      expect(state?.version).toBe(CONSENT_VERSION);
    });
  });
});
