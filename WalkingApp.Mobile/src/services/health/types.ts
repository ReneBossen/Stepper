/**
 * Authorization status for health data access.
 * Maps to platform-specific authorization states.
 */
export type AuthorizationStatus =
  | 'not_determined'
  | 'authorized'
  | 'denied'
  | 'not_available';

/**
 * Health data source identifier.
 * Used to track where step data originated.
 */
export type HealthSource = 'healthkit' | 'googlefit';

/**
 * Daily step data retrieved from health platforms.
 * Aggregates all step data for a single day.
 */
export interface DailyStepData {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Total step count for the day */
  stepCount: number;
  /** Total distance in meters for the day */
  distanceMeters: number;
  /** Source platform that provided this data */
  source: HealthSource;
}

/**
 * Interface for platform-specific health data providers.
 * Implementations will wrap HealthKit (iOS) and Google Fit (Android).
 */
export interface HealthDataProvider {
  /**
   * Checks if the health platform is available on this device.
   * @returns true if the platform SDK is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Gets the current authorization status for health data access.
   * @returns Current authorization status
   */
  getAuthorizationStatus(): Promise<AuthorizationStatus>;

  /**
   * Requests user authorization to access health data.
   * @returns The resulting authorization status after the request
   */
  requestAuthorization(): Promise<AuthorizationStatus>;

  /**
   * Retrieves step data for a date range.
   * @param startDate - Start of the date range (inclusive)
   * @param endDate - End of the date range (inclusive)
   * @returns Array of daily step data
   */
  getStepData(startDate: Date, endDate: Date): Promise<DailyStepData[]>;

  /**
   * Disconnects from the health platform and revokes access.
   * Note: This may not revoke system-level permissions on all platforms.
   */
  disconnect(): Promise<void>;
}

/**
 * Current state of health data synchronization.
 */
export interface SyncState {
  /** Whether health tracking is enabled by the user */
  isEnabled: boolean;
  /** ISO timestamp of the last successful sync, or null if never synced */
  lastSyncTimestamp: string | null;
  /** Status of the last sync attempt */
  lastSyncStatus: 'success' | 'failed' | 'never';
  /** Current platform type */
  platform: 'ios' | 'android' | 'unsupported';
}

/**
 * Result of enabling health tracking.
 */
export interface EnableResult {
  /** Whether enabling was successful */
  success: boolean;
  /** Authorization status after the enable attempt */
  status: AuthorizationStatus;
  /** Optional message providing more details */
  message?: string;
}

/**
 * Result of a sync operation.
 */
export interface SyncResult {
  /** Whether the sync completed successfully */
  success: boolean;
  /** Number of entries synced to the backend */
  entriesSynced: number;
  /** Optional array of error messages if sync partially failed */
  errors?: string[];
}
