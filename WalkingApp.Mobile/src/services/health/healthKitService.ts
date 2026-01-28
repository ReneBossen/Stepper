import AppleHealthKit, {
  HealthValue,
  HealthKitPermissions,
  HealthInputOptions,
  HealthUnit,
} from 'react-native-health';
import {
  HealthDataProvider,
  AuthorizationStatus,
  DailyStepData,
} from './types';
import { getErrorMessage } from '../../utils/errorUtils';

/**
 * HealthKit permissions configuration for step and distance tracking.
 */
const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
    ],
    write: [],
  },
};

/**
 * Formats a Date object to YYYY-MM-DD string format.
 */
function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extracts the date portion (YYYY-MM-DD) from an ISO timestamp.
 */
function extractDateFromISO(isoString: string): string {
  return isoString.split('T')[0];
}

/**
 * HealthKit service implementation for iOS.
 * Provides access to Apple Health step and distance data.
 */
export class HealthKitService implements HealthDataProvider {
  private isInitialized = false;

  /**
   * Checks if HealthKit is available on this device.
   * HealthKit is only available on iOS devices.
   */
  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        AppleHealthKit.isAvailable((error: unknown, available: boolean) => {
          if (error) {
            console.warn('[HealthKitService] isAvailable error:', getErrorMessage(error));
            resolve(false);
            return;
          }
          resolve(available);
        });
      } catch (error) {
        console.warn('[HealthKitService] isAvailable exception:', getErrorMessage(error));
        resolve(false);
      }
    });
  }

  /**
   * Gets the current authorization status for HealthKit access.
   *
   * Note: Due to Apple's privacy model, we cannot directly query read permission status.
   * HealthKit only allows checking authorization status for write permissions.
   * We return 'authorized' if the service has been initialized successfully,
   * 'not_available' if HealthKit is not available, or 'not_determined' otherwise.
   */
  async getAuthorizationStatus(): Promise<AuthorizationStatus> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return 'not_available';
      }

      // Apple doesn't allow checking read permission status directly
      // We can only know if we've successfully initialized before
      if (this.isInitialized) {
        return 'authorized';
      }

      return 'not_determined';
    } catch (error) {
      console.warn('[HealthKitService] getAuthorizationStatus error:', getErrorMessage(error));
      return 'not_available';
    }
  }

  /**
   * Requests user authorization to access HealthKit data.
   * This will display the iOS HealthKit permission prompt.
   *
   * Note: Due to Apple's privacy model, we cannot determine if the user
   * actually granted read permissions. initHealthKit succeeds even if
   * the user denies all permissions - the data will just be empty.
   */
  async requestAuthorization(): Promise<AuthorizationStatus> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return 'not_available';
      }

      return new Promise((resolve) => {
        AppleHealthKit.initHealthKit(permissions, (error: string) => {
          if (error) {
            console.warn('[HealthKitService] initHealthKit error:', error);
            // Apple doesn't distinguish between denied and other errors
            // We assume not_available as the safe fallback
            this.isInitialized = false;
            resolve('not_available');
            return;
          }

          this.isInitialized = true;
          resolve('authorized');
        });
      });
    } catch (error) {
      console.warn('[HealthKitService] requestAuthorization exception:', getErrorMessage(error));
      return 'not_available';
    }
  }

  /**
   * Retrieves step data for the specified date range.
   * Data is aggregated by day and includes both steps and distance.
   *
   * @param startDate - Start of the date range (inclusive)
   * @param endDate - End of the date range (inclusive)
   * @returns Array of daily step data from HealthKit
   */
  async getStepData(startDate: Date, endDate: Date): Promise<DailyStepData[]> {
    try {
      // Ensure we're initialized
      if (!this.isInitialized) {
        const status = await this.requestAuthorization();
        if (status !== 'authorized') {
          console.warn('[HealthKitService] Not authorized to fetch step data');
          return [];
        }
      }

      // Fetch steps and distance in parallel
      const [steps, distances] = await Promise.all([
        this.fetchDailySteps(startDate, endDate),
        this.fetchDailyDistance(startDate, endDate),
      ]);

      // Create a map of distances by date for easy lookup
      const distanceByDate = new Map<string, number>();
      for (const distance of distances) {
        distanceByDate.set(distance.date, distance.value);
      }

      // Combine steps with distances
      const result: DailyStepData[] = steps.map((step) => ({
        date: step.date,
        stepCount: Math.round(step.value),
        distanceMeters: distanceByDate.get(step.date) ?? 0,
        source: 'healthkit' as const,
      }));

      return result;
    } catch (error) {
      console.error('[HealthKitService] getStepData error:', getErrorMessage(error));
      return [];
    }
  }

  /**
   * Disconnects from HealthKit.
   *
   * Note: HealthKit permissions are managed via iOS Settings.
   * There is no programmatic way to revoke HealthKit permissions.
   * This method resets the internal initialized state.
   */
  async disconnect(): Promise<void> {
    this.isInitialized = false;
    // No actual disconnect needed - permissions managed via iOS Settings
  }

  /**
   * Fetches daily step count samples from HealthKit.
   */
  private fetchDailySteps(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; value: number }>> {
    return new Promise((resolve) => {
      const options: HealthInputOptions = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        includeManuallyAdded: true,
      };

      AppleHealthKit.getDailyStepCountSamples(
        options,
        (error: string, results: HealthValue[]) => {
          if (error) {
            console.warn('[HealthKitService] getDailyStepCountSamples error:', error);
            resolve([]);
            return;
          }

          if (!results || !Array.isArray(results)) {
            resolve([]);
            return;
          }

          // Aggregate by date (HealthKit may return multiple samples per day)
          const stepsByDate = new Map<string, number>();

          for (const sample of results) {
            const date = extractDateFromISO(sample.startDate);
            const currentSteps = stepsByDate.get(date) ?? 0;
            stepsByDate.set(date, currentSteps + (sample.value ?? 0));
          }

          const dailySteps = Array.from(stepsByDate.entries()).map(
            ([date, value]) => ({ date, value })
          );

          resolve(dailySteps);
        }
      );
    });
  }

  /**
   * Fetches daily distance samples from HealthKit.
   * Returns distance in meters.
   */
  private fetchDailyDistance(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; value: number }>> {
    return new Promise((resolve) => {
      const options: HealthInputOptions = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        unit: HealthUnit.meter,
        includeManuallyAdded: true,
      };

      AppleHealthKit.getDailyDistanceWalkingRunningSamples(
        options,
        (error: string, results: HealthValue[]) => {
          if (error) {
            console.warn(
              '[HealthKitService] getDailyDistanceWalkingRunningSamples error:',
              error
            );
            resolve([]);
            return;
          }

          if (!results || !Array.isArray(results)) {
            resolve([]);
            return;
          }

          // Aggregate by date
          const distanceByDate = new Map<string, number>();

          for (const sample of results) {
            const date = extractDateFromISO(sample.startDate);
            const currentDistance = distanceByDate.get(date) ?? 0;
            distanceByDate.set(date, currentDistance + (sample.value ?? 0));
          }

          const dailyDistances = Array.from(distanceByDate.entries()).map(
            ([date, value]) => ({ date, value })
          );

          resolve(dailyDistances);
        }
      );
    });
  }
}

/**
 * Factory function to create a HealthKitService instance.
 */
export function createHealthKitService(): HealthKitService {
  return new HealthKitService();
}
