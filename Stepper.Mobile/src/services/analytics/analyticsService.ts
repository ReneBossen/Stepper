/**
 * Core Analytics Service.
 * Provides a unified interface for analytics tracking with consent management.
 */

import { Platform as RNPlatform } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { analyticsConfig } from '@config/analytics.config';
import {
  initializePostHog,
  captureEvent,
  identifyUser,
  resetUser,
  setUserProperties as setPostHogUserProperties,
  isFeatureEnabled,
  getFeatureFlag as getPostHogFeatureFlag,
  reloadFeatureFlags as reloadPostHogFeatureFlags,
  flushEvents,
  shutdownPostHog,
  isPostHogInitialized,
  optIn,
  optOut,
  registerSuperProperties,
} from './postHogClient';
import {
  initializeConsentManager,
  hasConsentSync,
  hasConsent,
  grantConsent as grantConsentStorage,
  revokeConsent as revokeConsentStorage,
  getConsentState,
  type ConsentState,
} from './consentManager';
import type {
  AnalyticsEvent,
  EventPropertiesMap,
  UserPropertiesUpdate,
  FeatureFlag,
  FeatureFlagValue,
  IAnalyticsService,
  Platform,
} from './analyticsTypes';

/**
 * Whether the analytics service has been initialized.
 */
let isInitialized = false;

/**
 * Queue of events captured before initialization.
 * These are sent once the service is initialized.
 */
interface QueuedEvent {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: string;
}
let eventQueue: QueuedEvent[] = [];

/**
 * Maximum events to queue before dropping oldest.
 */
const MAX_QUEUE_SIZE = 100;

/**
 * Get device information for user properties.
 */
function getDeviceInfo(): {
  platform: Platform;
  app_version: string;
  device_model: string;
} {
  const platform: Platform = RNPlatform.OS === 'ios' ? 'ios' : 'android';
  const appVersion = Application.nativeApplicationVersion ?? 'unknown';
  const deviceModel = Device.modelName ?? 'unknown';

  return {
    platform,
    app_version: appVersion,
    device_model: deviceModel,
  };
}

/**
 * Process queued events after initialization.
 */
function processEventQueue(): void {
  if (eventQueue.length === 0) {
    return;
  }

  console.log(`[Analytics] Processing ${eventQueue.length} queued events`);

  // Check consent before processing
  if (!hasConsentSync()) {
    console.log('[Analytics] Consent not granted, discarding queued events');
    eventQueue = [];
    return;
  }

  // Send all queued events
  for (const item of eventQueue) {
    captureEvent(item.event, {
      ...item.properties,
      queued_at: item.timestamp,
    });
  }

  eventQueue = [];
}

/**
 * Queue an event for later processing.
 */
function queueEvent(event: string, properties?: Record<string, unknown>): void {
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    // Remove oldest event
    eventQueue.shift();
  }

  eventQueue.push({
    event,
    properties,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Initialize the analytics service.
 * Loads consent state and initializes PostHog if consent is granted.
 */
export async function initialize(): Promise<void> {
  if (isInitialized) {
    console.log('[Analytics] Already initialized');
    return;
  }

  try {
    // Load consent state
    const consentState = await initializeConsentManager();
    console.log('[Analytics] Consent state:', consentState.status);

    // Skip PostHog initialization if analytics is disabled
    if (!analyticsConfig.isEnabled) {
      console.log('[Analytics] Analytics disabled (no API key)');
      isInitialized = true;
      return;
    }

    // Initialize PostHog
    await initializePostHog();

    // If consent is not granted, opt out of tracking
    if (consentState.status !== 'granted') {
      optOut();
    } else {
      // Process any queued events
      processEventQueue();
    }

    // Register device info as super properties
    const deviceInfo = getDeviceInfo();
    registerSuperProperties({
      $app_version: deviceInfo.app_version,
      $device_model: deviceInfo.device_model,
      platform: deviceInfo.platform,
    });

    isInitialized = true;
    console.log('[Analytics] Service initialized');
  } catch (error) {
    console.error('[Analytics] Failed to initialize:', error);
    // Mark as initialized anyway to prevent repeated init attempts
    isInitialized = true;
  }
}

/**
 * Track an analytics event.
 * Respects consent state - events are not sent if consent is not granted.
 *
 * @param event - The event name
 * @param properties - Event properties
 */
export function track<E extends AnalyticsEvent>(
  event: E,
  properties?: EventPropertiesMap[E]
): void {
  // Check consent synchronously for performance
  if (!hasConsentSync()) {
    if (__DEV__) {
      console.debug(`[Analytics] Event blocked (no consent): ${event}`);
    }
    return;
  }

  // If not initialized, queue the event
  if (!isInitialized || !isPostHogInitialized()) {
    queueEvent(event, properties as Record<string, unknown>);
    return;
  }

  captureEvent(event, properties as Record<string, unknown>);
}

/**
 * Identify a user.
 * Links the anonymous session to a known user ID.
 *
 * @param userId - The unique user ID
 * @param properties - Optional user properties to set
 */
export function identify(
  userId: string,
  properties?: UserPropertiesUpdate
): void {
  if (!hasConsentSync()) {
    if (__DEV__) {
      console.debug(`[Analytics] Identify blocked (no consent): ${userId}`);
    }
    return;
  }

  if (!isPostHogInitialized()) {
    console.warn('[Analytics] Cannot identify - service not initialized');
    return;
  }

  // Merge device info with provided properties
  const deviceInfo = getDeviceInfo();
  const allProperties = {
    ...deviceInfo,
    ...properties,
  };

  identifyUser(userId, allProperties as Record<string, unknown>);
}

/**
 * Reset the current user identity.
 * Should be called on logout to disconnect the user from the device.
 */
export function reset(): void {
  if (!isPostHogInitialized()) {
    return;
  }

  resetUser();
  console.log('[Analytics] User reset');
}

/**
 * Set or update user properties.
 *
 * @param properties - User properties to set
 */
export function setUserProperties(properties: UserPropertiesUpdate): void {
  if (!hasConsentSync()) {
    return;
  }

  if (!isPostHogInitialized()) {
    return;
  }

  setPostHogUserProperties(properties as Record<string, unknown>);
}

/**
 * Check if a feature flag is enabled.
 *
 * @param flag - The feature flag name
 * @returns Whether the flag is enabled, or undefined if not loaded
 */
export function isFeatureFlagEnabled(flag: FeatureFlag): boolean | undefined {
  if (!isPostHogInitialized()) {
    return undefined;
  }

  return isFeatureEnabled(flag);
}

/**
 * Get a feature flag value.
 *
 * @param flag - The feature flag name
 * @returns The flag value
 */
export function getFeatureFlag(flag: FeatureFlag): FeatureFlagValue {
  if (!isPostHogInitialized()) {
    return undefined;
  }

  return getPostHogFeatureFlag(flag);
}

/**
 * Reload feature flags from the server.
 */
export async function reloadFeatureFlags(): Promise<void> {
  if (!isPostHogInitialized()) {
    return;
  }

  await reloadPostHogFeatureFlags();
}

/**
 * Flush any queued events immediately.
 */
export async function flush(): Promise<void> {
  if (!isPostHogInitialized()) {
    return;
  }

  await flushEvents();
}

/**
 * Shutdown the analytics service.
 * Flushes remaining events and cleans up.
 */
export async function shutdown(): Promise<void> {
  if (!isPostHogInitialized()) {
    return;
  }

  await shutdownPostHog();
  isInitialized = false;
  console.log('[Analytics] Service shutdown');
}

/**
 * Grant analytics consent.
 * Enables tracking and processes any queued events.
 */
export async function grantConsent(): Promise<void> {
  await grantConsentStorage();

  // Opt in to tracking
  if (isPostHogInitialized()) {
    optIn();
    processEventQueue();
  }
}

/**
 * Revoke analytics consent.
 * Disables all tracking.
 */
export async function revokeConsent(): Promise<void> {
  await revokeConsentStorage();

  // Opt out of tracking
  if (isPostHogInitialized()) {
    optOut();
  }

  // Clear the event queue
  eventQueue = [];
}

/**
 * Get the current consent state.
 */
export async function getAnalyticsConsentState(): Promise<ConsentState> {
  return getConsentState();
}

/**
 * Check if the user has granted analytics consent.
 */
export async function hasAnalyticsConsent(): Promise<boolean> {
  return hasConsent();
}

/**
 * Check if the analytics service is ready.
 */
export function isReady(): boolean {
  return isInitialized && isPostHogInitialized();
}

/**
 * Analytics service object implementing IAnalyticsService interface.
 * Provides a unified API for analytics operations.
 */
export const analyticsService: IAnalyticsService = {
  initialize,
  track,
  identify,
  reset,
  setUserProperties,
  isFeatureFlagEnabled,
  getFeatureFlag,
  reloadFeatureFlags,
  flush,
  shutdown,
};
