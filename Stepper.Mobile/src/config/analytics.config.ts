import { POSTHOG_API_KEY, POSTHOG_HOST } from '@env';

/**
 * PostHog analytics configuration.
 * Reads API key and host from environment variables.
 */
export const analyticsConfig = {
  /**
   * PostHog project API key.
   * Required for PostHog SDK initialization.
   */
  apiKey: POSTHOG_API_KEY || '',

  /**
   * PostHog host URL.
   * Defaults to PostHog cloud (US) if not specified.
   */
  host: POSTHOG_HOST || 'https://us.i.posthog.com',

  /**
   * Whether analytics is enabled.
   * Returns false if API key is missing.
   */
  get isEnabled(): boolean {
    return Boolean(this.apiKey);
  },

  /**
   * Feature flags request timeout in milliseconds.
   */
  featureFlagsRequestTimeoutMs: 10000,

  /**
   * Flush interval for batching events in milliseconds.
   */
  flushIntervalMs: 30000,

  /**
   * Maximum number of events to queue before forcing a flush.
   */
  flushAt: 20,

  /**
   * Session replay configuration.
   */
  sessionReplay: {
    /**
     * Whether session replay is enabled.
     */
    enabled: true,

    /**
     * Mask all text input fields (passwords are always masked).
     * Enabled by default for privacy.
     */
    maskAllTextInputs: true,

    /**
     * Mask all images in the replay.
     * Disabled by default to allow seeing UI context.
     */
    maskAllImages: false,

    /**
     * Capture console logs in the replay.
     */
    captureLog: false,

    /**
     * Capture network telemetry (iOS only).
     */
    captureNetworkTelemetry: false,
  },
};

/**
 * Validates that required PostHog configuration is present.
 * @returns true if configuration is valid, false otherwise
 */
export function validateAnalyticsConfig(): boolean {
  if (!analyticsConfig.apiKey) {
    console.warn('PostHog API key not configured. Analytics will be disabled.');
    return false;
  }
  return true;
}
