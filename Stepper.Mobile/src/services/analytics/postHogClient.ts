/**
 * PostHog SDK wrapper for React Native.
 * Provides a thin wrapper around the PostHog SDK with proper typing.
 */

import type { PostHogEventProperties, JsonType } from '@posthog/core';
import { analyticsConfig } from '@config/analytics.config';
import type { FeatureFlagValue } from './analyticsTypes';

/**
 * PostHog class type for dynamic import.
 */
type PostHogType = import('posthog-react-native').default;

/**
 * PostHog client singleton instance.
 * Lazily initialized on first access.
 */
let postHogInstance: PostHogType | null = null;

/**
 * Cached PostHog class for creating instances.
 */
let PostHogClass: typeof import('posthog-react-native').default | null = null;

/**
 * Whether the client has been initialized.
 */
let isInitialized = false;

/**
 * Track opted out state locally since PostHog SDK doesn't expose it synchronously
 */
let isOptedOut = false;

/**
 * PostHog client configuration options.
 */
export interface PostHogClientOptions {
  /**
   * PostHog project API key
   */
  apiKey: string;

  /**
   * PostHog host URL
   */
  host: string;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Enable session replay
   */
  enableSessionReplay?: boolean;

  /**
   * Session replay configuration
   */
  sessionReplayConfig?: {
    maskAllTextInputs?: boolean;
    maskAllImages?: boolean;
    captureLog?: boolean;
    captureNetworkTelemetry?: boolean;
  };

  /**
   * Feature flags request timeout in milliseconds
   */
  featureFlagsRequestTimeoutMs?: number;

  /**
   * Flush interval in milliseconds
   */
  flushInterval?: number;

  /**
   * Maximum events to queue before flushing
   */
  flushAt?: number;
}

/**
 * Get the PostHog client instance.
 * Returns null if not initialized.
 */
export function getPostHogClient(): PostHogType | null {
  return postHogInstance;
}

/**
 * Check if PostHog client is initialized.
 */
export function isPostHogInitialized(): boolean {
  return isInitialized && postHogInstance !== null;
}

/**
 * Initialize the PostHog client.
 * Uses configuration from analytics.config.ts by default.
 * Uses dynamic import to gracefully handle missing native modules.
 *
 * @param options - Optional custom configuration
 * @returns The initialized PostHog client
 */
export async function initializePostHog(
  options?: Partial<PostHogClientOptions>
): Promise<PostHogType | null> {
  // Skip if already initialized
  if (isInitialized && postHogInstance) {
    return postHogInstance;
  }

  // Use config values with optional overrides
  const apiKey = options?.apiKey ?? analyticsConfig.apiKey;
  const host = options?.host ?? analyticsConfig.host;

  // Skip initialization if no API key
  if (!apiKey) {
    console.warn('[PostHog] No API key provided. Analytics disabled.');
    return null;
  }

  try {
    // Dynamic import to catch native module errors gracefully
    if (!PostHogClass) {
      const postHogModule = await import('posthog-react-native');
      PostHogClass = postHogModule.default;
    }

    postHogInstance = new PostHogClass(apiKey, {
      host,
      // Feature flag timeout
      featureFlagsRequestTimeoutMs:
        options?.featureFlagsRequestTimeoutMs ??
        analyticsConfig.featureFlagsRequestTimeoutMs,
      // Batching configuration
      flushInterval: options?.flushInterval ?? analyticsConfig.flushIntervalMs,
      flushAt: options?.flushAt ?? analyticsConfig.flushAt,
      // Session replay
      enableSessionReplay:
        options?.enableSessionReplay ?? analyticsConfig.sessionReplay.enabled,
      sessionReplayConfig: {
        maskAllTextInputs:
          options?.sessionReplayConfig?.maskAllTextInputs ??
          analyticsConfig.sessionReplay.maskAllTextInputs,
        maskAllImages:
          options?.sessionReplayConfig?.maskAllImages ??
          analyticsConfig.sessionReplay.maskAllImages,
        captureLog:
          options?.sessionReplayConfig?.captureLog ??
          analyticsConfig.sessionReplay.captureLog,
        captureNetworkTelemetry:
          options?.sessionReplayConfig?.captureNetworkTelemetry ??
          analyticsConfig.sessionReplay.captureNetworkTelemetry,
      },
    });

    isInitialized = true;
    isOptedOut = false;

    if (__DEV__) {
      console.log('[PostHog] Client initialized successfully');
    }

    return postHogInstance;
  } catch (error) {
    console.error('[PostHog] Failed to initialize client:', error);
    return null;
  }
}

/**
 * Converts a generic properties object to PostHog event properties format.
 *
 * PostHog SDK requires properties to be in a specific format (PostHogEventProperties).
 * This helper performs the type conversion from our internal Record<string, unknown>
 * format to the SDK's expected type.
 *
 * @param properties - Optional object containing event property key-value pairs.
 *                     Values should be JSON-serializable (string, number, boolean, null, array, or object).
 * @returns The properties cast to PostHogEventProperties format, or undefined if no properties provided.
 *
 * @example
 * toEventProperties({ user_id: '123', action: 'click' })
 * // Returns: { user_id: '123', action: 'click' } as PostHogEventProperties
 */
function toEventProperties(
  properties?: Record<string, unknown>
): PostHogEventProperties | undefined {
  if (!properties) {
    return undefined;
  }
  // Cast to PostHogEventProperties - values must be JsonType compatible
  return properties as PostHogEventProperties;
}

/**
 * Capture an event using the PostHog client.
 *
 * @param event - Event name
 * @param properties - Event properties
 */
export function captureEvent(
  event: string,
  properties?: Record<string, unknown>
): void {
  if (!postHogInstance) {
    if (__DEV__) {
      console.debug(`[PostHog] Event not sent (not initialized): ${event}`);
    }
    return;
  }

  if (__DEV__) {
    console.debug(`[PostHog] Event: ${event}`, properties ?? '');
  }
  postHogInstance.capture(event, toEventProperties(properties));
}

/**
 * Identify a user.
 *
 * @param distinctId - Unique user identifier
 * @param properties - User properties to set
 */
export function identifyUser(
  distinctId: string,
  properties?: Record<string, unknown>
): void {
  if (!postHogInstance) {
    if (__DEV__) {
      console.debug(`[PostHog] Identify not sent (not initialized): ${distinctId}`);
    }
    return;
  }

  postHogInstance.identify(distinctId, toEventProperties(properties));
}

/**
 * Reset the current user identity.
 * Should be called on logout.
 */
export function resetUser(): void {
  if (!postHogInstance) {
    return;
  }

  postHogInstance.reset();
}

/**
 * Converts a properties object to PostHog's JsonType for $set operations.
 *
 * PostHog's person property update operations ($set, $set_once) require
 * properties to be in JsonType format. This helper performs the necessary
 * type conversion from our internal format.
 *
 * JsonType is a recursive type that represents valid JSON values:
 * - Primitives: string, number, boolean, null
 * - Arrays: JsonType[]
 * - Objects: { [key: string]: JsonType }
 *
 * @param properties - Object containing person property key-value pairs.
 *                     All values must be JSON-serializable.
 * @returns The properties cast to JsonType format for PostHog SDK.
 *
 * @example
 * toJsonType({ daily_step_goal: 10000, theme: 'dark' })
 * // Returns: { daily_step_goal: 10000, theme: 'dark' } as JsonType
 */
function toJsonType(properties: Record<string, unknown>): JsonType {
  // Cast to JsonType - values must be JsonType compatible
  return properties as unknown as JsonType;
}

/**
 * Set user properties.
 * Properties are set using $set which overwrites existing values.
 *
 * @param properties - Properties to set
 */
export function setUserProperties(properties: Record<string, unknown>): void {
  if (!postHogInstance) {
    return;
  }

  // Use capture with $set to update person properties
  postHogInstance.capture('$set', {
    $set: toJsonType(properties),
  });
}

/**
 * Set user properties that are only set once.
 * Uses $set_once which will not overwrite existing values.
 *
 * @param properties - Properties to set once
 */
export function setUserPropertiesOnce(
  properties: Record<string, unknown>
): void {
  if (!postHogInstance) {
    return;
  }

  postHogInstance.capture('$set', {
    $set_once: toJsonType(properties),
  });
}

/**
 * Register super properties.
 * These properties are automatically included with every event.
 *
 * @param properties - Super properties to register
 */
export function registerSuperProperties(
  properties: Record<string, unknown>
): void {
  if (!postHogInstance) {
    return;
  }

  postHogInstance.register(toEventProperties(properties) ?? {});
}

/**
 * Check if a feature flag is enabled.
 *
 * @param flag - Feature flag key
 * @returns Whether the flag is enabled, or undefined if not loaded
 */
export function isFeatureEnabled(flag: string): boolean | undefined {
  if (!postHogInstance) {
    return undefined;
  }

  return postHogInstance.isFeatureEnabled(flag);
}

/**
 * Get a feature flag value.
 *
 * @param flag - Feature flag key
 * @returns The flag value, or undefined if not loaded
 */
export function getFeatureFlag(flag: string): FeatureFlagValue {
  if (!postHogInstance) {
    return undefined;
  }

  return postHogInstance.getFeatureFlag(flag);
}

/**
 * Get a feature flag payload.
 *
 * @param flag - Feature flag key
 * @returns The flag payload, or undefined if not loaded
 */
export function getFeatureFlagPayload(flag: string): unknown {
  if (!postHogInstance) {
    return undefined;
  }

  return postHogInstance.getFeatureFlagPayload(flag);
}

/**
 * Reload feature flags from the server.
 */
export async function reloadFeatureFlags(): Promise<void> {
  if (!postHogInstance) {
    return;
  }

  await postHogInstance.reloadFeatureFlagsAsync();
}

/**
 * Set person properties for feature flag evaluation.
 *
 * @param properties - Properties to set for flag evaluation
 */
export function setPersonPropertiesForFlags(
  properties: Record<string, string>
): void {
  if (!postHogInstance) {
    return;
  }

  postHogInstance.setPersonPropertiesForFlags(properties);
}

/**
 * Flush any queued events immediately.
 */
export async function flushEvents(): Promise<void> {
  if (!postHogInstance) {
    return;
  }

  try {
    await postHogInstance.flush();
  } catch (error) {
    if (__DEV__) {
      console.error('[PostHog] Flush error:', error);
    }
  }
}

/**
 * Shutdown the PostHog client.
 * Flushes remaining events and cleans up.
 */
export async function shutdownPostHog(): Promise<void> {
  if (!postHogInstance) {
    return;
  }

  try {
    await postHogInstance.flush();
    await postHogInstance.shutdown();
  } catch (error) {
    console.error('[PostHog] Error during shutdown:', error);
  } finally {
    postHogInstance = null;
    isInitialized = false;
  }
}

/**
 * Get the current distinct ID.
 * Returns the user's distinct ID or the anonymous ID.
 */
export function getDistinctId(): string | undefined {
  if (!postHogInstance) {
    return undefined;
  }

  return postHogInstance.getDistinctId();
}

/**
 * Get the current anonymous ID.
 */
export function getAnonymousId(): string | undefined {
  if (!postHogInstance) {
    return undefined;
  }

  return postHogInstance.getAnonymousId();
}

/**
 * Opt the user out of tracking.
 */
export function optOut(): void {
  if (!postHogInstance) {
    return;
  }

  isOptedOut = true;
  postHogInstance.optOut();
}

/**
 * Opt the user back into tracking.
 */
export function optIn(): void {
  if (!postHogInstance) {
    return;
  }

  isOptedOut = false;
  postHogInstance.optIn();
}

/**
 * Check if the user has opted out of tracking.
 */
export function hasOptedOut(): boolean {
  if (!postHogInstance) {
    return true; // Default to opted out if not initialized
  }

  return isOptedOut;
}
