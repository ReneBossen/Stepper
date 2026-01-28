import {
  AuthorizationStatus,
  DailyStepData,
  EnableResult,
  HealthDataProvider,
  HealthSource,
  SyncResult,
  SyncState,
} from '../health/types';
import {
  createHealthDataProvider,
  getHealthPlatform,
  getHealthSource,
} from '../health/healthProviderFactory';
import { syncStateManager } from './syncStateManager';
import { stepsApi } from '../api/stepsApi';
import { getErrorMessage } from '@utils/errorUtils';
import { registerBackgroundSync, unregisterBackgroundSync } from './backgroundSyncTask';

/**
 * Number of days to sync when enabling health tracking for the first time.
 */
const INITIAL_SYNC_DAYS = 30;

/**
 * Number of days to sync during regular sync operations.
 */
const REGULAR_SYNC_DAYS = 7;

/**
 * Unified step tracking service that orchestrates health data sync.
 *
 * This service provides a platform-agnostic interface for:
 * - Checking health data availability
 * - Managing authorization
 * - Syncing step data to the backend
 * - Tracking sync state
 *
 * The service gracefully handles cases where health providers are not
 * available (e.g., on web or unsupported platforms).
 */
class UnifiedStepTrackingService {
  private provider: HealthDataProvider | null = null;
  private initialized = false;

  /**
   * Initializes the service by loading state and creating the health provider.
   * Should be called once on app startup.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.provider = createHealthDataProvider();
    this.initialized = true;
  }

  /**
   * Checks if health tracking is available on the current platform.
   *
   * @returns true if health tracking is supported and available
   */
  async isHealthTrackingAvailable(): Promise<boolean> {
    const platform = getHealthPlatform();
    if (platform === 'unsupported') {
      return false;
    }

    // If we don't have a provider yet, health tracking is not available
    // This will change in Phase 3/4 when providers are implemented
    if (!this.provider) {
      return false;
    }

    return this.provider.isAvailable();
  }

  /**
   * Checks if health tracking is currently enabled by the user.
   *
   * @returns true if the user has enabled health tracking
   */
  async isHealthTrackingEnabled(): Promise<boolean> {
    const state = await syncStateManager.getSyncState();
    return state.isEnabled;
  }

  /**
   * Gets the current authorization status for health data access.
   *
   * @returns The authorization status, or 'not_available' if no provider exists
   */
  async getHealthAuthorizationStatus(): Promise<AuthorizationStatus> {
    if (!this.provider) {
      return 'not_available';
    }

    return this.provider.getAuthorizationStatus();
  }

  /**
   * Enables health tracking by requesting authorization and performing initial sync.
   *
   * This method:
   * 1. Requests authorization from the health platform
   * 2. Saves the enabled preference
   * 3. Performs an initial sync of historical data
   *
   * @returns Result indicating success/failure and authorization status
   */
  async enableHealthTracking(): Promise<EnableResult> {
    if (!this.provider) {
      return {
        success: false,
        status: 'not_available',
        message: 'Health tracking is not available on this device',
      };
    }

    try {
      // Check if platform is available
      const isAvailable = await this.provider.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          status: 'not_available',
          message: 'Health data is not available on this device',
        };
      }

      // Request authorization
      const status = await this.provider.requestAuthorization();

      if (status !== 'authorized') {
        return {
          success: false,
          status,
          message: this.getAuthorizationMessage(status),
        };
      }

      // Save enabled state
      await syncStateManager.setEnabled(true);

      // Register background sync task
      const backgroundSyncRegistered = await registerBackgroundSync();
      if (!backgroundSyncRegistered) {
        console.warn('Background sync registration failed - sync will only occur in foreground');
      }

      // Perform initial sync with historical data
      const syncResult = await this.performSync(INITIAL_SYNC_DAYS);

      if (!syncResult.success) {
        return {
          success: false,
          status: 'authorized',
          message: `Authorization successful but sync failed: ${syncResult.errors?.join(', ')}`,
        };
      }

      return {
        success: true,
        status: 'authorized',
        message: `Successfully synced ${syncResult.entriesSynced} days of step data`,
      };
    } catch (error) {
      return {
        success: false,
        status: 'not_available',
        message: getErrorMessage(error),
      };
    }
  }

  /**
   * Disables health tracking and removes synced data.
   *
   * This method:
   * 1. Unregisters background sync task
   * 2. Deletes all synced step data from the backend
   * 3. Disconnects from the health provider
   * 4. Clears local sync state
   */
  async disableHealthTracking(): Promise<void> {
    // Unregister background sync task first
    try {
      await unregisterBackgroundSync();
    } catch (error) {
      console.warn('Failed to unregister background sync:', getErrorMessage(error));
    }

    const source = getHealthSource();

    // Delete synced data from backend
    if (source) {
      try {
        await stepsApi.deleteBySource(source);
      } catch (error) {
        // Log but continue - we still want to disable tracking locally
        console.warn('Failed to delete synced data from backend:', getErrorMessage(error));
      }
    }

    // Disconnect from provider if available
    if (this.provider) {
      try {
        await this.provider.disconnect();
      } catch (error) {
        // Log but continue
        console.warn('Failed to disconnect from health provider:', getErrorMessage(error));
      }
    }

    // Clear local state
    await syncStateManager.clearSyncState();
  }

  /**
   * Performs an on-demand sync of step data.
   *
   * @returns Result of the sync operation
   */
  async syncNow(): Promise<SyncResult> {
    const isEnabled = await this.isHealthTrackingEnabled();
    if (!isEnabled) {
      return {
        success: false,
        entriesSynced: 0,
        errors: ['Health tracking is not enabled'],
      };
    }

    return this.performSync(REGULAR_SYNC_DAYS);
  }

  /**
   * Gets the current sync state.
   *
   * @returns The current sync state
   */
  async getSyncState(): Promise<SyncState> {
    return syncStateManager.getSyncState();
  }

  /**
   * Gets the health source identifier for the current platform.
   *
   * @returns The health source string, or null if unsupported
   */
  getHealthSource(): HealthSource | null {
    return getHealthSource();
  }

  /**
   * Internal method to perform the actual sync operation.
   *
   * @param days - Number of days to sync
   * @returns Sync result
   */
  private async performSync(days: number): Promise<SyncResult> {
    if (!this.provider) {
      return {
        success: false,
        entriesSynced: 0,
        errors: ['No health provider available'],
      };
    }

    const errors: string[] = [];
    const timestamp = new Date().toISOString();

    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get step data from health provider
      const stepData = await this.provider.getStepData(startDate, endDate);

      if (stepData.length === 0) {
        await syncStateManager.setLastSync(timestamp, 'success');
        return {
          success: true,
          entriesSynced: 0,
        };
      }

      // Transform to API format
      const entries = this.transformStepDataForApi(stepData);

      // Sync to backend
      const response = await stepsApi.syncSteps({ entries });

      // Record successful sync
      await syncStateManager.setLastSync(timestamp, 'success');

      return {
        success: true,
        entriesSynced: response.total,
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      errors.push(errorMessage);

      // Record failed sync
      await syncStateManager.setLastSync(timestamp, 'failed');

      return {
        success: false,
        entriesSynced: 0,
        errors,
      };
    }
  }

  /**
   * Transforms health provider step data to API request format.
   *
   * @param stepData - Array of daily step data from health provider
   * @returns Array of entries formatted for the API
   */
  private transformStepDataForApi(stepData: DailyStepData[]): Array<{
    date: string;
    stepCount: number;
    distanceMeters?: number;
    source: string;
  }> {
    return stepData.map((day) => ({
      date: day.date,
      stepCount: day.stepCount,
      distanceMeters: day.distanceMeters > 0 ? day.distanceMeters : undefined,
      source: day.source,
    }));
  }

  /**
   * Gets a user-friendly message for an authorization status.
   *
   * @param status - The authorization status
   * @returns Human-readable message
   */
  private getAuthorizationMessage(status: AuthorizationStatus): string {
    switch (status) {
      case 'denied':
        return 'Permission denied. Please enable health data access in your device settings.';
      case 'not_determined':
        return 'Permission request was cancelled or not completed.';
      case 'not_available':
        return 'Health tracking is not available on this device.';
      case 'authorized':
        return 'Health tracking is authorized.';
      default:
        return 'Unknown authorization status.';
    }
  }
}

/**
 * Singleton instance of the unified step tracking service.
 */
export const unifiedStepTrackingService = new UnifiedStepTrackingService();
