/**
 * Analytics service public exports.
 * Provides the main interface for analytics functionality.
 */

// Core analytics service
export {
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
  grantConsent,
  revokeConsent,
  getAnalyticsConsentState,
  hasAnalyticsConsent,
  isReady,
  deleteAnalyticsData,
  analyticsService,
} from './analyticsService';

// Consent manager
export {
  hasConsent,
  hasDeniedConsent,
  isConsentUnknown,
  isConsentOutdated,
  getConsentState,
  hasConsentSync,
  clearConsentData,
  CONSENT_VERSION,
  type ConsentState,
  type ConsentStatus,
} from './consentManager';

// PostHog client (for advanced usage)
export {
  getPostHogClient,
  isPostHogInitialized,
  getDistinctId,
  getAnonymousId,
} from './postHogClient';

// Types
export type {
  // Event types
  AnalyticsEvent,
  AuthenticationEvent,
  HealthEvent,
  SocialEvent,
  CompetitionEvent,
  EngagementEvent,
  GoalEvent,
  SettingsEvent,
  ErrorEvent,

  // Event property types
  BaseEventProperties,
  EventPropertiesMap,
  RegistrationMethodProperties,
  LoginCompletedProperties,
  OnboardingStepCompletedProperties,
  HealthPermissionProperties,
  HealthSyncProperties,
  HealthSyncFailedProperties,
  StepEntryAddedProperties,
  FriendEventProperties,
  SocialThresholdReachedProperties,
  GroupEventProperties,
  LeaderboardViewedProperties,
  RankChangedProperties,
  CompetitionPeriodEndedProperties,
  InviteSentProperties,
  ScreenViewedProperties,
  TabSwitchedProperties,
  NotificationProperties,
  ActivityFeedItemClickedProperties,
  DailyGoalAchievedProperties,
  DailyGoalMissedProperties,
  StreakMilestoneProperties,
  PersonalBestAchievedProperties,
  GoalChangedProperties,
  WeeklySummaryViewedProperties,
  PreferenceChangedProperties,
  PrivacySettingChangedProperties,
  NotificationSettingChangedProperties,
  ThemeChangedProperties,
  DataExportRequestedProperties,
  ErrorEventProperties,

  // User property types
  UserProperties,
  UserPropertiesUpdate,
  HealthProvider,
  ThemePreference,
  Platform,

  // Feature flag types
  FeatureFlag,
  FeatureFlagValue,

  // Service interface
  IAnalyticsService,
} from './analyticsTypes';
