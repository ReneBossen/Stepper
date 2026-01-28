/**
 * Step estimation utilities for calculating distance from step count.
 *
 * These utilities are used when the user manually enters steps without
 * providing a distance, allowing us to estimate the distance based on
 * average stride length.
 */

// Average stride length in meters (~30 inches for average adult)
const AVERAGE_STRIDE_LENGTH_METERS = 0.762;

/**
 * Estimates distance in meters from step count using average stride length.
 *
 * @param stepCount - The number of steps taken
 * @returns Estimated distance in meters
 */
export function estimateDistanceFromSteps(stepCount: number): number {
  if (stepCount < 0) {
    return 0;
  }
  return stepCount * AVERAGE_STRIDE_LENGTH_METERS;
}

/**
 * Formats distance for display based on user's unit preference.
 *
 * @param meters - Distance in meters
 * @param units - User's preferred unit system ('metric' or 'imperial')
 * @returns Formatted distance string with unit label
 */
export function formatDistance(meters: number, units: 'metric' | 'imperial'): string {
  if (meters < 0) {
    return units === 'metric' ? '0.00 km' : '0.00 mi';
  }

  if (units === 'metric') {
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  } else {
    const miles = meters / 1609.344;
    return `${miles.toFixed(2)} mi`;
  }
}

/**
 * Converts distance from display units to meters.
 *
 * @param value - Distance value in display units (km or miles)
 * @param units - The unit system the value is in ('metric' or 'imperial')
 * @returns Distance in meters
 */
export function convertToMeters(value: number, units: 'metric' | 'imperial'): number {
  if (value < 0) {
    return 0;
  }

  if (units === 'metric') {
    return value * 1000; // km to meters
  } else {
    return value * 1609.344; // miles to meters
  }
}

/**
 * Converts distance from meters to display units.
 *
 * @param meters - Distance in meters
 * @param units - The target unit system ('metric' or 'imperial')
 * @returns Distance value in the specified unit system
 */
export function convertFromMeters(meters: number, units: 'metric' | 'imperial'): number {
  if (meters < 0) {
    return 0;
  }

  if (units === 'metric') {
    return meters / 1000; // meters to km
  } else {
    return meters / 1609.344; // meters to miles
  }
}
