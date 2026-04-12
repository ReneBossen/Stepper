import {
  isHealthDataAvailable,
  requestAuthorization,
  queryStatisticsCollectionForQuantity,
  type QueryStatisticsResponse,
} from '@kingstinct/react-native-healthkit';
import {
  HealthDataProvider,
  AuthorizationStatus,
  DailyStepData,
} from './types';
import { getErrorMessage } from '../../utils/errorUtils';

const STEP_COUNT_IDENTIFIER = 'HKQuantityTypeIdentifierStepCount' as const;
const DISTANCE_WALKING_RUNNING_IDENTIFIER =
  'HKQuantityTypeIdentifierDistanceWalkingRunning' as const;

const READ_IDENTIFIERS = [
  STEP_COUNT_IDENTIFIER,
  DISTANCE_WALKING_RUNNING_IDENTIFIER,
] as const;

const DAILY_INTERVAL = { day: 1 } as const;

/**
 * Formats a Date object to YYYY-MM-DD string format in local time.
 */
function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the start of the day (midnight local time) for a given Date.
 * Used as the anchor date for HealthKit's daily statistics collection.
 */
function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * HealthKit service implementation for iOS.
 * Provides access to Apple Health step and distance data via
 * @kingstinct/react-native-healthkit (Nitro Modules, New Architecture compatible).
 */
export class HealthKitService implements HealthDataProvider {
  private isInitialized = false;

  async isAvailable(): Promise<boolean> {
    try {
      return isHealthDataAvailable();
    } catch (error) {
      console.warn(
        '[HealthKitService] isAvailable exception:',
        getErrorMessage(error)
      );
      return false;
    }
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

      if (this.isInitialized) {
        return 'authorized';
      }

      return 'not_determined';
    } catch (error) {
      console.warn(
        '[HealthKitService] getAuthorizationStatus error:',
        getErrorMessage(error)
      );
      return 'not_available';
    }
  }

  /**
   * Requests user authorization to access HealthKit data.
   * Displays the iOS HealthKit permission prompt on first call.
   *
   * Note: Apple's privacy model does not expose whether the user actually
   * granted read permissions — requestAuthorization resolves to true as long
   * as the prompt was shown, even if everything was denied. Denied reads
   * simply return empty results.
   */
  async requestAuthorization(): Promise<AuthorizationStatus> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return 'not_available';
      }

      const granted = await requestAuthorization({
        toRead: READ_IDENTIFIERS,
      });

      if (!granted) {
        this.isInitialized = false;
        return 'not_available';
      }

      this.isInitialized = true;
      return 'authorized';
    } catch (error) {
      console.warn(
        '[HealthKitService] requestAuthorization exception:',
        getErrorMessage(error)
      );
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
      if (!this.isInitialized) {
        const status = await this.requestAuthorization();
        if (status !== 'authorized') {
          console.warn('[HealthKitService] Not authorized to fetch step data');
          return [];
        }
      }

      const [steps, distances] = await Promise.all([
        this.fetchDailySteps(startDate, endDate),
        this.fetchDailyDistance(startDate, endDate),
      ]);

      const distanceByDate = new Map<string, number>();
      for (const distance of distances) {
        distanceByDate.set(distance.date, distance.value);
      }

      const result: DailyStepData[] = steps.map((step) => ({
        date: step.date,
        stepCount: Math.round(step.value),
        distanceMeters: distanceByDate.get(step.date) ?? 0,
        source: 'healthkit' as const,
      }));

      return result;
    } catch (error) {
      console.error(
        '[HealthKitService] getStepData error:',
        getErrorMessage(error)
      );
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
  }

  private async fetchDailySteps(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; value: number }>> {
    try {
      const results = await queryStatisticsCollectionForQuantity(
        STEP_COUNT_IDENTIFIER,
        ['cumulativeSum'],
        startOfDay(startDate),
        DAILY_INTERVAL,
        {
          filter: { date: { startDate, endDate } },
          unit: 'count',
        }
      );

      return this.mapBucketsToDaily(results);
    } catch (error) {
      console.warn(
        '[HealthKitService] fetchDailySteps error:',
        getErrorMessage(error)
      );
      return [];
    }
  }

  private async fetchDailyDistance(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; value: number }>> {
    try {
      const results = await queryStatisticsCollectionForQuantity(
        DISTANCE_WALKING_RUNNING_IDENTIFIER,
        ['cumulativeSum'],
        startOfDay(startDate),
        DAILY_INTERVAL,
        {
          filter: { date: { startDate, endDate } },
          unit: 'm',
        }
      );

      return this.mapBucketsToDaily(results);
    } catch (error) {
      console.warn(
        '[HealthKitService] fetchDailyDistance error:',
        getErrorMessage(error)
      );
      return [];
    }
  }

  private mapBucketsToDaily(
    buckets: readonly QueryStatisticsResponse[]
  ): Array<{ date: string; value: number }> {
    const totals = new Map<string, number>();

    for (const bucket of buckets) {
      const anchor = bucket.startDate;
      if (!anchor) {
        continue;
      }
      const date = formatDateToYYYYMMDD(anchor);
      const value = bucket.sumQuantity?.quantity ?? 0;
      totals.set(date, (totals.get(date) ?? 0) + value);
    }

    return Array.from(totals.entries()).map(([date, value]) => ({
      date,
      value,
    }));
  }
}

/**
 * Factory function to create a HealthKitService instance.
 */
export function createHealthKitService(): HealthKitService {
  return new HealthKitService();
}
