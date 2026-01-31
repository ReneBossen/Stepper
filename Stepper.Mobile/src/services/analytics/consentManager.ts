/**
 * GDPR Consent Manager for analytics tracking.
 * Manages user consent state with persistence in AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage keys for consent data
 */
const STORAGE_KEYS = {
  CONSENT_STATE: '@stepper/analytics_consent',
  CONSENT_TIMESTAMP: '@stepper/analytics_consent_timestamp',
  CONSENT_VERSION: '@stepper/analytics_consent_version',
} as const;

/**
 * Current consent policy version.
 * Increment this when the privacy policy changes significantly.
 */
export const CONSENT_VERSION = '1.0';

/**
 * Consent state values
 */
export type ConsentStatus = 'granted' | 'denied' | 'unknown';

/**
 * Full consent state including metadata
 */
export interface ConsentState {
  /**
   * Whether consent has been granted
   */
  status: ConsentStatus;

  /**
   * ISO timestamp when consent was recorded
   */
  timestamp: string | null;

  /**
   * Version of the consent policy agreed to
   */
  version: string | null;
}

/**
 * Default consent state (unknown/not yet asked)
 */
const DEFAULT_CONSENT_STATE: ConsentState = {
  status: 'unknown',
  timestamp: null,
  version: null,
};

/**
 * In-memory cache of consent state
 */
let cachedConsentState: ConsentState | null = null;

/**
 * Load consent state from AsyncStorage.
 *
 * @returns The current consent state
 */
export async function loadConsentState(): Promise<ConsentState> {
  try {
    const [statusStr, timestamp, version] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.CONSENT_STATE),
      AsyncStorage.getItem(STORAGE_KEYS.CONSENT_TIMESTAMP),
      AsyncStorage.getItem(STORAGE_KEYS.CONSENT_VERSION),
    ]);

    const status = statusStr as ConsentStatus | null;

    if (!status) {
      cachedConsentState = DEFAULT_CONSENT_STATE;
      return DEFAULT_CONSENT_STATE;
    }

    cachedConsentState = {
      status,
      timestamp,
      version,
    };

    return cachedConsentState;
  } catch (error) {
    console.error('[ConsentManager] Failed to load consent state:', error);
    return DEFAULT_CONSENT_STATE;
  }
}

/**
 * Get the current consent state.
 * Uses cached value if available, otherwise loads from storage.
 *
 * @returns The current consent state
 */
export async function getConsentState(): Promise<ConsentState> {
  if (cachedConsentState !== null) {
    return cachedConsentState;
  }

  return loadConsentState();
}

/**
 * Check if the user has granted analytics consent.
 *
 * @returns true if consent is granted, false otherwise
 */
export async function hasConsent(): Promise<boolean> {
  const state = await getConsentState();
  return state.status === 'granted';
}

/**
 * Check if the user has explicitly denied analytics consent.
 *
 * @returns true if consent is denied, false otherwise
 */
export async function hasDeniedConsent(): Promise<boolean> {
  const state = await getConsentState();
  return state.status === 'denied';
}

/**
 * Check if consent has not been asked yet.
 *
 * @returns true if consent is unknown, false otherwise
 */
export async function isConsentUnknown(): Promise<boolean> {
  const state = await getConsentState();
  return state.status === 'unknown';
}

/**
 * Grant analytics consent.
 * Records the consent timestamp and version.
 */
export async function grantConsent(): Promise<void> {
  const timestamp = new Date().toISOString();

  try {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.CONSENT_STATE, 'granted'),
      AsyncStorage.setItem(STORAGE_KEYS.CONSENT_TIMESTAMP, timestamp),
      AsyncStorage.setItem(STORAGE_KEYS.CONSENT_VERSION, CONSENT_VERSION),
    ]);

    cachedConsentState = {
      status: 'granted',
      timestamp,
      version: CONSENT_VERSION,
    };

    console.log('[ConsentManager] Consent granted');
  } catch (error) {
    console.error('[ConsentManager] Failed to save consent:', error);
    throw error;
  }
}

/**
 * Revoke/deny analytics consent.
 * Records the revocation timestamp.
 */
export async function revokeConsent(): Promise<void> {
  const timestamp = new Date().toISOString();

  try {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.CONSENT_STATE, 'denied'),
      AsyncStorage.setItem(STORAGE_KEYS.CONSENT_TIMESTAMP, timestamp),
      AsyncStorage.setItem(STORAGE_KEYS.CONSENT_VERSION, CONSENT_VERSION),
    ]);

    cachedConsentState = {
      status: 'denied',
      timestamp,
      version: CONSENT_VERSION,
    };

    console.log('[ConsentManager] Consent revoked');
  } catch (error) {
    console.error('[ConsentManager] Failed to save consent revocation:', error);
    throw error;
  }
}

/**
 * Clear all consent data.
 * Used when deleting user data or resetting the app.
 */
export async function clearConsentData(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.CONSENT_STATE),
      AsyncStorage.removeItem(STORAGE_KEYS.CONSENT_TIMESTAMP),
      AsyncStorage.removeItem(STORAGE_KEYS.CONSENT_VERSION),
    ]);

    cachedConsentState = DEFAULT_CONSENT_STATE;

    console.log('[ConsentManager] Consent data cleared');
  } catch (error) {
    console.error('[ConsentManager] Failed to clear consent data:', error);
    throw error;
  }
}

/**
 * Check if the consent version has changed since the user consented.
 * This can be used to re-prompt users when the privacy policy changes.
 *
 * @returns true if the consent is outdated, false otherwise
 */
export async function isConsentOutdated(): Promise<boolean> {
  const state = await getConsentState();

  // If consent was never given, it's not "outdated"
  if (state.status !== 'granted') {
    return false;
  }

  // Check if the version has changed
  return state.version !== CONSENT_VERSION;
}

/**
 * Get a synchronous snapshot of the cached consent state.
 * Returns null if the state hasn't been loaded yet.
 *
 * Note: This is provided for performance-critical paths but
 * you should prefer the async methods when possible.
 */
export function getCachedConsentState(): ConsentState | null {
  return cachedConsentState;
}

/**
 * Check consent synchronously using cached state.
 * Returns false if state is not cached or consent not granted.
 *
 * Note: This is provided for performance-critical paths but
 * you should prefer the async hasConsent() when possible.
 */
export function hasConsentSync(): boolean {
  return cachedConsentState?.status === 'granted';
}

/**
 * Initialize the consent manager by loading state from storage.
 * Call this early in app startup.
 */
export async function initializeConsentManager(): Promise<ConsentState> {
  return loadConsentState();
}
