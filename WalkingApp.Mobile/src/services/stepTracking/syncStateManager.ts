import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncState } from '../health/types';
import { getHealthPlatform } from '../health/healthProviderFactory';

/**
 * Storage keys for sync state persistence.
 */
const STORAGE_KEYS = {
  HEALTH_TRACKING_ENABLED: '@stepper/health_tracking_enabled',
  LAST_SYNC_TIMESTAMP: '@stepper/last_sync_timestamp',
  LAST_SYNC_STATUS: '@stepper/last_sync_status',
} as const;

/**
 * Manages the persistence of health tracking sync state.
 * Uses AsyncStorage for local storage of user preferences and sync metadata.
 */
export const syncStateManager = {
  /**
   * Retrieves the current sync state from storage.
   *
   * @returns The current sync state
   */
  async getSyncState(): Promise<SyncState> {
    const [enabled, timestamp, status] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.HEALTH_TRACKING_ENABLED),
      AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIMESTAMP),
      AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_STATUS),
    ]);

    return {
      isEnabled: enabled === 'true',
      lastSyncTimestamp: timestamp,
      lastSyncStatus: (status as 'success' | 'failed') || 'never',
      platform: getHealthPlatform(),
    };
  },

  /**
   * Sets whether health tracking is enabled.
   *
   * @param enabled - Whether health tracking should be enabled
   */
  async setEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.HEALTH_TRACKING_ENABLED,
      enabled.toString()
    );
  },

  /**
   * Records a sync attempt result.
   *
   * @param timestamp - ISO timestamp of the sync
   * @param status - Whether the sync succeeded or failed
   */
  async setLastSync(timestamp: string, status: 'success' | 'failed'): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIMESTAMP, timestamp),
      AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_STATUS, status),
    ]);
  },

  /**
   * Clears all sync state from storage.
   * Used when disabling health tracking or signing out.
   */
  async clearSyncState(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.HEALTH_TRACKING_ENABLED,
      STORAGE_KEYS.LAST_SYNC_TIMESTAMP,
      STORAGE_KEYS.LAST_SYNC_STATUS,
    ]);
  },
};
