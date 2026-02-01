import { create } from 'zustand';
import {
  initialize as initializeAnalytics,
  track as trackEvent,
  identify as identifyUser,
  reset as resetAnalytics,
  setUserProperties as setAnalyticsUserProperties,
  grantConsent as grantAnalyticsConsent,
  revokeConsent as revokeAnalyticsConsent,
  getAnalyticsConsentState,
  isFeatureFlagEnabled,
  getFeatureFlag,
  reloadFeatureFlags,
  flush as flushAnalytics,
  isReady,
} from '@services/analytics/analyticsService';
import { getErrorMessage } from '@utils/errorUtils';
import type {
  AnalyticsEvent,
  EventPropertiesMap,
  UserPropertiesUpdate,
  FeatureFlag,
  FeatureFlagValue,
} from '@services/analytics/analyticsTypes';
import type { ConsentState } from '@services/analytics/consentManager';

/**
 * Analytics store state
 */
interface AnalyticsState {
  /**
   * Whether the analytics service has been initialized
   */
  isInitialized: boolean;

  /**
   * Whether initialization is in progress
   */
  isInitializing: boolean;

  /**
   * Current consent state
   */
  consentState: ConsentState;

  /**
   * Error message if initialization failed
   */
  error: string | null;

  /**
   * Initialize the analytics service
   */
  initialize: () => Promise<void>;

  /**
   * Track an analytics event
   */
  track: <E extends AnalyticsEvent>(
    event: E,
    properties?: EventPropertiesMap[E]
  ) => void;

  /**
   * Identify the current user
   */
  identify: (userId: string, properties?: UserPropertiesUpdate) => void;

  /**
   * Reset user identity (for logout)
   */
  reset: () => void;

  /**
   * Update user properties
   */
  setUserProperties: (properties: UserPropertiesUpdate) => void;

  /**
   * Grant analytics consent
   */
  grantConsent: () => Promise<void>;

  /**
   * Revoke analytics consent
   */
  revokeConsent: () => Promise<void>;

  /**
   * Refresh consent state from storage
   */
  refreshConsentState: () => Promise<void>;

  /**
   * Check if a feature flag is enabled
   */
  isFeatureFlagEnabled: (flag: FeatureFlag) => boolean | undefined;

  /**
   * Get a feature flag value
   */
  getFeatureFlag: (flag: FeatureFlag) => FeatureFlagValue;

  /**
   * Reload feature flags from server
   */
  reloadFeatureFlags: () => Promise<void>;

  /**
   * Flush queued events
   */
  flush: () => Promise<void>;

  /**
   * Clear any errors
   */
  clearError: () => void;
}

/**
 * Default consent state
 */
const DEFAULT_CONSENT_STATE: ConsentState = {
  status: 'unknown',
  timestamp: null,
  version: null,
};

/**
 * Analytics Zustand store.
 * Provides a reactive interface for analytics operations.
 */
export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  isInitialized: false,
  isInitializing: false,
  consentState: DEFAULT_CONSENT_STATE,
  error: null,

  initialize: async () => {
    const { isInitialized, isInitializing } = get();

    // Skip if already initialized or initializing
    if (isInitialized || isInitializing) {
      return;
    }

    set({ isInitializing: true, error: null });

    try {
      await initializeAnalytics();

      // Get current consent state
      const consentState = await getAnalyticsConsentState();

      set({
        isInitialized: isReady(),
        isInitializing: false,
        consentState,
      });
    } catch (error: unknown) {
      set({
        isInitializing: false,
        error: getErrorMessage(error),
      });
    }
  },

  track: <E extends AnalyticsEvent>(
    event: E,
    properties?: EventPropertiesMap[E]
  ) => {
    trackEvent(event, properties);
  },

  identify: (userId: string, properties?: UserPropertiesUpdate) => {
    identifyUser(userId, properties);
  },

  reset: () => {
    resetAnalytics();
  },

  setUserProperties: (properties: UserPropertiesUpdate) => {
    setAnalyticsUserProperties(properties);
  },

  grantConsent: async () => {
    try {
      await grantAnalyticsConsent();

      const consentState = await getAnalyticsConsentState();
      set({ consentState });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) });
    }
  },

  revokeConsent: async () => {
    try {
      await revokeAnalyticsConsent();

      const consentState = await getAnalyticsConsentState();
      set({ consentState });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) });
    }
  },

  refreshConsentState: async () => {
    try {
      const consentState = await getAnalyticsConsentState();
      set({ consentState });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) });
    }
  },

  isFeatureFlagEnabled: (flag: FeatureFlag) => {
    return isFeatureFlagEnabled(flag);
  },

  getFeatureFlag: (flag: FeatureFlag) => {
    return getFeatureFlag(flag);
  },

  reloadFeatureFlags: async () => {
    try {
      await reloadFeatureFlags();
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) });
    }
  },

  flush: async () => {
    try {
      await flushAnalytics();
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) });
    }
  },

  clearError: () => set({ error: null }),
}));

/**
 * Selector for consent status
 */
export const selectConsentStatus = (state: AnalyticsState) =>
  state.consentState.status;

/**
 * Selector for checking if consent is granted
 */
export const selectHasConsent = (state: AnalyticsState) =>
  state.consentState.status === 'granted';

/**
 * Selector for checking if consent needs to be asked
 */
export const selectNeedsConsentPrompt = (state: AnalyticsState) =>
  state.consentState.status === 'unknown';
