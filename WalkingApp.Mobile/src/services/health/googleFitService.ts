import GoogleFit, { Scopes, BucketUnit } from 'react-native-google-fit';
import {
  HealthDataProvider,
  AuthorizationStatus,
  DailyStepData,
} from './types';
import { getErrorMessage } from '../../utils/errorUtils';

/**
 * Google Fit authorization options with required scopes.
 */
const authOptions = {
  scopes: [Scopes.FITNESS_ACTIVITY_READ, Scopes.FITNESS_LOCATION_READ],
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
 * Google Fit step data response structure.
 */
interface GoogleFitStepSample {
  date: string;
  value: number;
  source?: string;
}

/**
 * Google Fit distance data response structure.
 */
interface GoogleFitDistanceSample {
  date: string;
  distance: number;
  source?: string;
}

/**
 * Google Fit service implementation for Android.
 * Provides access to Google Fit step and distance data.
 */
export class GoogleFitService implements HealthDataProvider {
  private hasAuthorized = false;

  /**
   * Checks if Google Fit is available on this device.
   * Google Fit requires Google Play Services to be installed.
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Google Fit availability check
      // The library doesn't expose a direct isAvailable method,
      // but authorization will fail if Google Play Services aren't available
      return true;
    } catch (error) {
      console.warn('[GoogleFitService] isAvailable error:', getErrorMessage(error));
      return false;
    }
  }

  /**
   * Gets the current authorization status for Google Fit access.
   */
  async getAuthorizationStatus(): Promise<AuthorizationStatus> {
    try {
      // Check if we've previously authorized in this session
      if (this.hasAuthorized) {
        return 'authorized';
      }

      // Try to check authorization status
      // Note: checkIsAuthorized() sets an internal flag
      await GoogleFit.checkIsAuthorized();

      if (GoogleFit.isAuthorized) {
        this.hasAuthorized = true;
        return 'authorized';
      }

      return 'not_determined';
    } catch (error) {
      console.warn('[GoogleFitService] getAuthorizationStatus error:', getErrorMessage(error));
      return 'not_available';
    }
  }

  /**
   * Requests user authorization to access Google Fit data.
   * This will display the Google Fit permission prompt.
   */
  async requestAuthorization(): Promise<AuthorizationStatus> {
    try {
      const authResult = await GoogleFit.authorize(authOptions);

      if (authResult.success) {
        this.hasAuthorized = true;
        return 'authorized';
      }

      // Type narrow to the failure case which has a message property
      const failureResult = authResult as { success: false; message: string };

      // Check if the user denied permission
      if (
        failureResult.message?.includes('denied') ||
        failureResult.message?.includes('cancel')
      ) {
        return 'denied';
      }

      console.warn('[GoogleFitService] Authorization failed:', failureResult.message);
      return 'not_available';
    } catch (error) {
      console.warn('[GoogleFitService] requestAuthorization error:', getErrorMessage(error));
      return 'not_available';
    }
  }

  /**
   * Retrieves step data for the specified date range.
   * Data is aggregated by day and includes both steps and distance.
   *
   * @param startDate - Start of the date range (inclusive)
   * @param endDate - End of the date range (inclusive)
   * @returns Array of daily step data from Google Fit
   */
  async getStepData(startDate: Date, endDate: Date): Promise<DailyStepData[]> {
    try {
      // Ensure we're authorized
      const status = await this.getAuthorizationStatus();
      if (status !== 'authorized') {
        const authResult = await this.requestAuthorization();
        if (authResult !== 'authorized') {
          console.warn('[GoogleFitService] Not authorized to fetch step data');
          return [];
        }
      }

      // Set end date to end of day to include the full day
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);

      // Fetch steps and distance in parallel
      const [steps, distances] = await Promise.all([
        this.fetchDailySteps(startDate, adjustedEndDate),
        this.fetchDailyDistance(startDate, adjustedEndDate),
      ]);

      // Create a map of distances by date for easy lookup
      const distanceByDate = new Map<string, number>();
      for (const distance of distances) {
        distanceByDate.set(distance.date, distance.distance);
      }

      // Combine steps with distances
      const result: DailyStepData[] = steps.map((step) => ({
        date: step.date,
        stepCount: Math.round(step.value),
        distanceMeters: distanceByDate.get(step.date) ?? 0,
        source: 'googlefit' as const,
      }));

      return result;
    } catch (error) {
      console.error('[GoogleFitService] getStepData error:', getErrorMessage(error));
      return [];
    }
  }

  /**
   * Disconnects from Google Fit and revokes access.
   */
  async disconnect(): Promise<void> {
    try {
      // GoogleFit.disconnect() is synchronous and returns void
      GoogleFit.disconnect();
      this.hasAuthorized = false;
    } catch (error) {
      console.warn('[GoogleFitService] disconnect error:', getErrorMessage(error));
      // Reset state even if disconnect fails
      this.hasAuthorized = false;
    }
  }

  /**
   * Fetches daily step count samples from Google Fit.
   */
  private async fetchDailySteps(
    startDate: Date,
    endDate: Date
  ): Promise<GoogleFitStepSample[]> {
    try {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        bucketUnit: BucketUnit.DAY,
        bucketInterval: 1,
      };

      const result = await GoogleFit.getDailyStepCountSamples(options);

      if (!result || !Array.isArray(result)) {
        return [];
      }

      // Google Fit returns data grouped by source
      // We need to aggregate across all sources
      const stepsByDate = new Map<string, number>();

      for (const sourceData of result) {
        // Process the 'steps' array which contains { date: string, value: number }
        if (sourceData.steps && Array.isArray(sourceData.steps)) {
          for (const sample of sourceData.steps) {
            const date = formatDateToYYYYMMDD(new Date(sample.date));
            const currentSteps = stepsByDate.get(date) ?? 0;
            // Use the higher value if we have multiple sources
            const newValue = sample.value ?? 0;
            stepsByDate.set(date, Math.max(currentSteps, newValue));
          }
        }

        // Process rawSteps if available (different structure: startDate, steps)
        if (sourceData.rawSteps && Array.isArray(sourceData.rawSteps)) {
          for (const rawSample of sourceData.rawSteps) {
            const date = formatDateToYYYYMMDD(new Date(rawSample.startDate));
            const currentSteps = stepsByDate.get(date) ?? 0;
            const newValue = rawSample.steps ?? 0;
            stepsByDate.set(date, Math.max(currentSteps, newValue));
          }
        }
      }

      return Array.from(stepsByDate.entries()).map(([date, value]) => ({
        date,
        value,
      }));
    } catch (error) {
      console.warn('[GoogleFitService] fetchDailySteps error:', getErrorMessage(error));
      return [];
    }
  }

  /**
   * Fetches daily distance samples from Google Fit.
   * Returns distance in meters.
   */
  private async fetchDailyDistance(
    startDate: Date,
    endDate: Date
  ): Promise<GoogleFitDistanceSample[]> {
    try {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        bucketUnit: BucketUnit.DAY,
        bucketInterval: 1,
      };

      const result = await GoogleFit.getDailyDistanceSamples(options);

      if (!result || !Array.isArray(result)) {
        return [];
      }

      // Aggregate distances by date
      const distanceByDate = new Map<string, number>();

      for (const sample of result) {
        // DistanceResponse uses startDate, not date
        const date = formatDateToYYYYMMDD(new Date(sample.startDate));
        const currentDistance = distanceByDate.get(date) ?? 0;
        // Distance is returned in meters
        const newDistance = sample.distance ?? 0;
        distanceByDate.set(date, Math.max(currentDistance, newDistance));
      }

      return Array.from(distanceByDate.entries()).map(([date, distance]) => ({
        date,
        distance,
      }));
    } catch (error) {
      console.warn('[GoogleFitService] fetchDailyDistance error:', getErrorMessage(error));
      return [];
    }
  }
}

/**
 * Factory function to create a GoogleFitService instance.
 */
export function createGoogleFitService(): GoogleFitService {
  return new GoogleFitService();
}
