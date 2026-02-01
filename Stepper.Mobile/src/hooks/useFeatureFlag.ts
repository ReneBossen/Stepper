/**
 * React hooks for feature flag management.
 * Provides convenient access to PostHog feature flags with type safety.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAnalyticsStore } from '@store/analyticsStore';
import type { FeatureFlag } from '@services/analytics/analyticsTypes';

/**
 * Hook for checking a single feature flag.
 *
 * Returns the feature flag value from PostHog, with support for a default value
 * when PostHog is unavailable or the flag hasn't loaded yet.
 *
 * @param flag - The feature flag name to check
 * @param defaultValue - Default value when flag is unavailable (defaults to false)
 * @returns Whether the feature flag is enabled
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   // Basic usage
 *   const isEnabled = useFeatureFlag('new-feature');
 *
 *   // With default value
 *   const showBeta = useFeatureFlag('beta-features', true);
 *
 *   if (!isEnabled) return null;
 *   return <NewFeature />;
 * }
 * ```
 */
export function useFeatureFlag(
  flag: FeatureFlag,
  defaultValue: boolean = false
): boolean {
  const isInitialized = useAnalyticsStore((state) => state.isInitialized);
  const isFeatureFlagEnabled = useAnalyticsStore(
    (state) => state.isFeatureFlagEnabled
  );

  // Get the flag value, using default if not initialized or undefined
  const flagValue = useMemo(() => {
    if (!isInitialized) {
      return defaultValue;
    }

    const value = isFeatureFlagEnabled(flag);

    // If the value is undefined (flag not loaded), use default
    if (value === undefined) {
      return defaultValue;
    }

    return value;
  }, [isInitialized, isFeatureFlagEnabled, flag, defaultValue]);

  return flagValue;
}

/**
 * Result type for useFeatureFlags hook.
 * Maps flag names to their boolean values.
 */
export type FeatureFlagsResult<T extends FeatureFlag[]> = {
  [K in T[number]]: boolean;
};

/**
 * Hook for checking multiple feature flags at once.
 *
 * Returns an object with flag names as keys and boolean values.
 * More efficient than calling useFeatureFlag multiple times.
 *
 * @param flags - Array of feature flag names to check
 * @param defaultValues - Optional object of default values for each flag
 * @returns Object mapping flag names to their values
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const flags = useFeatureFlags(
 *     ['new-dashboard', 'social-features', 'advanced-stats'],
 *     { 'social-features': true } // Default social-features to true
 *   );
 *
 *   return (
 *     <View>
 *       {flags['new-dashboard'] && <NewDashboard />}
 *       {flags['social-features'] && <SocialFeatures />}
 *       {flags['advanced-stats'] && <AdvancedStats />}
 *     </View>
 *   );
 * }
 * ```
 */
export function useFeatureFlags<T extends FeatureFlag[]>(
  flags: T,
  defaultValues?: Partial<Record<T[number], boolean>>
): FeatureFlagsResult<T> {
  const isInitialized = useAnalyticsStore((state) => state.isInitialized);
  const isFeatureFlagEnabled = useAnalyticsStore(
    (state) => state.isFeatureFlagEnabled
  );

  // Compute all flag values
  const flagValues = useMemo(() => {
    const result = {} as FeatureFlagsResult<T>;

    for (const flag of flags) {
      const defaultValue = defaultValues?.[flag as T[number]] ?? false;

      if (!isInitialized) {
        (result as Record<string, boolean>)[flag] = defaultValue;
        continue;
      }

      const value = isFeatureFlagEnabled(flag);

      // If the value is undefined (flag not loaded), use default
      if (value === undefined) {
        (result as Record<string, boolean>)[flag] = defaultValue;
      } else {
        (result as Record<string, boolean>)[flag] = value;
      }
    }

    return result;
  }, [isInitialized, isFeatureFlagEnabled, flags, defaultValues]);

  return flagValues;
}

/**
 * Extended hook that provides feature flag value with loading and refresh capabilities.
 *
 * Use this when you need more control over feature flag state,
 * such as showing loading indicators or manually refreshing flags.
 *
 * @param flag - The feature flag name to check
 * @param defaultValue - Default value when flag is unavailable (defaults to false)
 * @returns Object with flag value, loading state, and refresh function
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isEnabled, isLoading, refresh } = useFeatureFlagWithState('premium-features');
 *
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   return (
 *     <View>
 *       {isEnabled && <PremiumFeatures />}
 *       <Button onPress={refresh} title="Refresh Flags" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useFeatureFlagWithState(
  flag: FeatureFlag,
  defaultValue: boolean = false
): {
  /** Whether the feature flag is enabled */
  isEnabled: boolean;
  /** Whether feature flags are still loading */
  isLoading: boolean;
  /** Refresh feature flags from the server */
  refresh: () => Promise<void>;
} {
  const isInitialized = useAnalyticsStore((state) => state.isInitialized);
  const isInitializing = useAnalyticsStore((state) => state.isInitializing);
  const isFeatureFlagEnabled = useAnalyticsStore(
    (state) => state.isFeatureFlagEnabled
  );
  const reloadFeatureFlags = useAnalyticsStore(
    (state) => state.reloadFeatureFlags
  );

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Compute the flag value
  const isEnabled = useMemo(() => {
    if (!isInitialized) {
      return defaultValue;
    }

    const value = isFeatureFlagEnabled(flag);
    return value === undefined ? defaultValue : value;
  }, [isInitialized, isFeatureFlagEnabled, flag, defaultValue]);

  // Compute loading state
  const isLoading = isInitializing || isRefreshing;

  // Memoized refresh function
  const refresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      await reloadFeatureFlags();
    } finally {
      setIsRefreshing(false);
    }
  }, [reloadFeatureFlags]);

  return useMemo(
    () => ({
      isEnabled,
      isLoading,
      refresh,
    }),
    [isEnabled, isLoading, refresh]
  );
}

/**
 * Hook that automatically refreshes feature flags when user identity changes.
 *
 * This is useful when feature flags might be targeted to specific users
 * and you want to ensure flags are re-evaluated after login/logout.
 *
 * @param userId - The current user ID (null when logged out)
 *
 * @example
 * ```tsx
 * function App() {
 *   const userId = useAuthStore((state) => state.user?.id ?? null);
 *
 *   // Automatically refresh flags when user changes
 *   useFeatureFlagRefreshOnUserChange(userId);
 *
 *   return <Navigation />;
 * }
 * ```
 */
export function useFeatureFlagRefreshOnUserChange(
  userId: string | null
): void {
  const isInitialized = useAnalyticsStore((state) => state.isInitialized);
  const reloadFeatureFlags = useAnalyticsStore(
    (state) => state.reloadFeatureFlags
  );

  useEffect(() => {
    // Only refresh if analytics is initialized
    if (isInitialized) {
      // Reload flags when user changes
      reloadFeatureFlags();
    }
  }, [userId, isInitialized, reloadFeatureFlags]);
}
