import { Platform } from 'react-native';
import { HealthDataProvider, HealthSource } from './types';
import { createHealthKitService } from './healthKitService';
import { createGoogleFitService } from './googleFitService';

/**
 * Platform type for health data availability.
 */
export type HealthPlatform = 'ios' | 'android' | 'unsupported';

/**
 * Gets the current platform type for health data.
 *
 * @returns The health platform type
 */
export function getHealthPlatform(): HealthPlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'unsupported';
}

/**
 * Creates the appropriate health data provider for the current platform.
 *
 * This factory function returns:
 * - HealthKit provider on iOS
 * - Google Fit provider on Android
 * - null on unsupported platforms
 *
 * @returns The health data provider for the current platform, or null if unsupported
 */
export function createHealthDataProvider(): HealthDataProvider | null {
  const platform = getHealthPlatform();

  switch (platform) {
    case 'ios':
      return createHealthKitService();
    case 'android':
      return createGoogleFitService();
    default:
      return null;
  }
}

/**
 * Gets the health source identifier for the current platform.
 *
 * @returns The health source string, or null if platform is unsupported
 */
export function getHealthSource(): HealthSource | null {
  const platform = getHealthPlatform();
  if (platform === 'ios') return 'healthkit';
  if (platform === 'android') return 'googlefit';
  return null;
}
