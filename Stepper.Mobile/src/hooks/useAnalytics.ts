/**
 * React hook for analytics tracking.
 * Provides a convenient interface for tracking events and managing analytics in components.
 */

import { useCallback, useMemo } from 'react';
import { useAnalyticsStore, selectHasConsent } from '@store/analyticsStore';
import type {
  AnalyticsEvent,
  EventPropertiesMap,
  UserPropertiesUpdate,
  FeatureFlag,
} from '@services/analytics/analyticsTypes';

/**
 * Return type for the useAnalytics hook.
 */
export interface UseAnalyticsResult {
  // Tracking
  /**
   * Track an analytics event with type-safe properties.
   * Events are only sent if the user has granted consent.
   *
   * @param event - The event name (type-safe)
   * @param properties - Event properties (type-safe based on event)
   *
   * @example
   * track('screen_viewed', { screen_name: 'Home' });
   * track('daily_goal_achieved', { goal: 10000, actual_steps: 12345 });
   */
  track: <E extends AnalyticsEvent>(
    event: E,
    properties?: EventPropertiesMap[E]
  ) => void;

  /**
   * Identify the current user.
   * Links anonymous session to a known user ID.
   *
   * @param userId - The unique user ID (usually from auth)
   * @param properties - Optional user properties to set
   *
   * @example
   * identify('user_123', { daily_step_goal: 10000 });
   */
  identify: (userId: string, properties?: UserPropertiesUpdate) => void;

  /**
   * Reset user identity.
   * Should be called on logout to disconnect the user from the device.
   */
  reset: () => void;

  // User Properties
  /**
   * Set or update user properties.
   * These are persisted in PostHog for user segmentation.
   *
   * @param properties - User properties to set
   *
   * @example
   * setUserProperties({ friend_count: 5, group_count: 2 });
   */
  setUserProperties: (properties: UserPropertiesUpdate) => void;

  // Consent
  /**
   * Whether the user has granted analytics consent.
   */
  hasConsent: boolean;

  /**
   * Grant analytics consent.
   * Enables tracking and processes any queued events.
   */
  grantConsent: () => Promise<void>;

  /**
   * Revoke analytics consent.
   * Disables all tracking immediately.
   */
  revokeConsent: () => Promise<void>;

  // Feature Flags
  /**
   * Check if a feature flag is enabled.
   *
   * @param flag - The feature flag name
   * @returns Whether the flag is enabled, or undefined if not loaded
   *
   * @example
   * const showNewFeature = isFeatureFlagEnabled('new-feature-experiment');
   */
  isFeatureFlagEnabled: (flag: FeatureFlag) => boolean | undefined;

  // State
  /**
   * Whether the analytics service has been initialized.
   */
  isInitialized: boolean;

  /**
   * Whether initialization is in progress.
   */
  isInitializing: boolean;

  /**
   * Error message if something went wrong.
   */
  error: string | null;

  /**
   * Clear any error state.
   */
  clearError: () => void;

  /**
   * Initialize the analytics service.
   * Usually called automatically, but can be called manually if needed.
   */
  initialize: () => Promise<void>;

  /**
   * Flush any queued events immediately.
   * Useful before app backgrounding or navigation.
   */
  flush: () => Promise<void>;

  /**
   * Reload feature flags from the server.
   */
  reloadFeatureFlags: () => Promise<void>;
}

/**
 * React hook for analytics tracking.
 *
 * Provides a convenient, type-safe interface for tracking events,
 * identifying users, managing consent, and checking feature flags.
 *
 * @returns Object containing analytics functions and state
 *
 * @example
 * ```tsx
 * function HomeScreen() {
 *   const { track, hasConsent, isFeatureFlagEnabled } = useAnalytics();
 *
 *   useEffect(() => {
 *     track('screen_viewed', { screen_name: 'Home' });
 *   }, [track]);
 *
 *   const showNewFeature = isFeatureFlagEnabled('new-feature-experiment');
 *
 *   return (
 *     <View>
 *       {showNewFeature && <NewFeature />}
 *     </View>
 *   );
 * }
 * ```
 */
export function useAnalytics(): UseAnalyticsResult {
  // Get store state and actions
  const isInitialized = useAnalyticsStore((state) => state.isInitialized);
  const isInitializing = useAnalyticsStore((state) => state.isInitializing);
  const hasConsent = useAnalyticsStore(selectHasConsent);
  const error = useAnalyticsStore((state) => state.error);

  // Get store actions
  const storeTrack = useAnalyticsStore((state) => state.track);
  const storeIdentify = useAnalyticsStore((state) => state.identify);
  const storeReset = useAnalyticsStore((state) => state.reset);
  const storeSetUserProperties = useAnalyticsStore(
    (state) => state.setUserProperties
  );
  const storeGrantConsent = useAnalyticsStore((state) => state.grantConsent);
  const storeRevokeConsent = useAnalyticsStore((state) => state.revokeConsent);
  const storeIsFeatureFlagEnabled = useAnalyticsStore(
    (state) => state.isFeatureFlagEnabled
  );
  const storeClearError = useAnalyticsStore((state) => state.clearError);
  const storeInitialize = useAnalyticsStore((state) => state.initialize);
  const storeFlush = useAnalyticsStore((state) => state.flush);
  const storeReloadFeatureFlags = useAnalyticsStore(
    (state) => state.reloadFeatureFlags
  );

  // Memoize callbacks to prevent unnecessary re-renders in consumers
  // Following React best practice: custom hooks should wrap returned functions in useCallback

  const track = useCallback(
    <E extends AnalyticsEvent>(
      event: E,
      properties?: EventPropertiesMap[E]
    ): void => {
      storeTrack(event, properties);
    },
    [storeTrack]
  );

  const identify = useCallback(
    (userId: string, properties?: UserPropertiesUpdate): void => {
      storeIdentify(userId, properties);
    },
    [storeIdentify]
  );

  const reset = useCallback((): void => {
    storeReset();
  }, [storeReset]);

  const setUserProperties = useCallback(
    (properties: UserPropertiesUpdate): void => {
      storeSetUserProperties(properties);
    },
    [storeSetUserProperties]
  );

  const grantConsent = useCallback(async (): Promise<void> => {
    await storeGrantConsent();
  }, [storeGrantConsent]);

  const revokeConsent = useCallback(async (): Promise<void> => {
    await storeRevokeConsent();
  }, [storeRevokeConsent]);

  const isFeatureFlagEnabled = useCallback(
    (flag: FeatureFlag): boolean | undefined => {
      return storeIsFeatureFlagEnabled(flag);
    },
    [storeIsFeatureFlagEnabled]
  );

  const clearError = useCallback((): void => {
    storeClearError();
  }, [storeClearError]);

  const initialize = useCallback(async (): Promise<void> => {
    await storeInitialize();
  }, [storeInitialize]);

  const flush = useCallback(async (): Promise<void> => {
    await storeFlush();
  }, [storeFlush]);

  const reloadFeatureFlags = useCallback(async (): Promise<void> => {
    await storeReloadFeatureFlags();
  }, [storeReloadFeatureFlags]);

  // Return memoized result object
  return useMemo(
    () => ({
      // Tracking
      track,
      identify,
      reset,

      // User Properties
      setUserProperties,

      // Consent
      hasConsent,
      grantConsent,
      revokeConsent,

      // Feature Flags
      isFeatureFlagEnabled,

      // State
      isInitialized,
      isInitializing,
      error,
      clearError,
      initialize,
      flush,
      reloadFeatureFlags,
    }),
    [
      track,
      identify,
      reset,
      setUserProperties,
      hasConsent,
      grantConsent,
      revokeConsent,
      isFeatureFlagEnabled,
      isInitialized,
      isInitializing,
      error,
      clearError,
      initialize,
      flush,
      reloadFeatureFlags,
    ]
  );
}
