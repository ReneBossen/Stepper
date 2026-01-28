import {
  initialize,
  requestPermission,
  readRecords,
  getSdkStatus,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import {
  HealthDataProvider,
  AuthorizationStatus,
  DailyStepData,
} from './types';
import { getErrorMessage } from '../../utils/errorUtils';

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
 * Health Connect service implementation for Android.
 * Uses Android's Health Connect API (successor to Google Fit).
 */
export class GoogleFitService implements HealthDataProvider {
  private isInitialized = false;
  private hasPermission = false;

  /**
   * Checks if Health Connect is available on this device.
   * Health Connect requires Android 14+ or the Health Connect app installed.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const status = await getSdkStatus();
      return status === SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch (error) {
      console.warn('[HealthConnectService] isAvailable error:', getErrorMessage(error));
      return false;
    }
  }

  /**
   * Gets the current authorization status for Health Connect access.
   */
  async getAuthorizationStatus(): Promise<AuthorizationStatus> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return 'not_available';
      }

      if (this.hasPermission) {
        return 'authorized';
      }

      // Initialize if not already done
      if (!this.isInitialized) {
        const initialized = await initialize();
        this.isInitialized = initialized;
        if (!initialized) {
          return 'not_available';
        }
      }

      return 'not_determined';
    } catch (error) {
      console.warn('[HealthConnectService] getAuthorizationStatus error:', getErrorMessage(error));
      return 'not_available';
    }
  }

  /**
   * Requests user authorization to access Health Connect data.
   * This will display the Health Connect permission prompt.
   */
  async requestAuthorization(): Promise<AuthorizationStatus> {
    try {
      // Initialize first if needed
      if (!this.isInitialized) {
        const initialized = await initialize();
        this.isInitialized = initialized;
        if (!initialized) {
          return 'not_available';
        }
      }

      // Request permissions for steps and distance
      const permissions = await requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'Distance' },
      ]);

      // Check if we got the permissions we need
      const hasStepsPermission = permissions.some(
        (p) => p.recordType === 'Steps' && p.accessType === 'read'
      );

      if (hasStepsPermission) {
        this.hasPermission = true;
        return 'authorized';
      }

      return 'denied';
    } catch (error) {
      console.warn('[HealthConnectService] requestAuthorization error:', getErrorMessage(error));
      return 'not_available';
    }
  }

  /**
   * Retrieves step data for the specified date range.
   * Data is aggregated by day and includes both steps and distance.
   *
   * @param startDate - Start of the date range (inclusive)
   * @param endDate - End of the date range (inclusive)
   * @returns Array of daily step data from Health Connect
   */
  async getStepData(startDate: Date, endDate: Date): Promise<DailyStepData[]> {
    try {
      // Ensure we're authorized
      const status = await this.getAuthorizationStatus();
      if (status !== 'authorized') {
        const authResult = await this.requestAuthorization();
        if (authResult !== 'authorized') {
          console.warn('[HealthConnectService] Not authorized to fetch step data');
          return [];
        }
      }

      // Set time range
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: startDate.toISOString(),
        endTime: new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(), // End of day
      };

      // Fetch steps and distance in parallel
      const [stepsResult, distanceResult] = await Promise.all([
        readRecords('Steps', { timeRangeFilter }),
        readRecords('Distance', { timeRangeFilter }).catch(() => ({ records: [] })),
      ]);

      // Aggregate steps by date
      const stepsByDate = new Map<string, number>();
      for (const record of stepsResult.records) {
        const date = formatDateToYYYYMMDD(new Date(record.startTime));
        const current = stepsByDate.get(date) ?? 0;
        stepsByDate.set(date, current + (record.count ?? 0));
      }

      // Aggregate distance by date
      const distanceByDate = new Map<string, number>();
      for (const record of distanceResult.records) {
        const date = formatDateToYYYYMMDD(new Date(record.startTime));
        const current = distanceByDate.get(date) ?? 0;
        // Distance is in meters
        const meters = record.distance?.inMeters ?? 0;
        distanceByDate.set(date, current + meters);
      }

      // Combine into result
      const result: DailyStepData[] = [];
      for (const [date, stepCount] of stepsByDate) {
        result.push({
          date,
          stepCount: Math.round(stepCount),
          distanceMeters: Math.round(distanceByDate.get(date) ?? 0),
          source: 'googlefit' as const,
        });
      }

      // Sort by date
      result.sort((a, b) => a.date.localeCompare(b.date));

      return result;
    } catch (error) {
      console.error('[HealthConnectService] getStepData error:', getErrorMessage(error));
      return [];
    }
  }

  /**
   * Disconnects from Health Connect.
   * Note: Health Connect doesn't have a direct disconnect - users manage permissions in settings.
   */
  async disconnect(): Promise<void> {
    this.hasPermission = false;
    this.isInitialized = false;
  }
}

/**
 * Factory function to create a GoogleFitService (Health Connect) instance.
 */
export function createGoogleFitService(): GoogleFitService {
  return new GoogleFitService();
}
