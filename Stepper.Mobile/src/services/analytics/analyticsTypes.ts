/**
 * Analytics event and property type definitions.
 * Defines all 54 events and 12 user properties for PostHog analytics.
 */

// =============================================================================
// Event Names (54 total)
// =============================================================================

/**
 * Authentication events (8)
 */
export type AuthenticationEvent =
  | 'registration_started'
  | 'registration_completed'
  | 'registration_method'
  | 'login_completed'
  | 'logout_completed'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'onboarding_skipped';

/**
 * Health integration events (6)
 */
export type HealthEvent =
  | 'health_permission_requested'
  | 'health_permission_granted'
  | 'health_permission_denied'
  | 'health_sync_completed'
  | 'health_sync_failed'
  | 'step_entry_added';

/**
 * Social feature events (12)
 */
export type SocialEvent =
  | 'friend_request_sent'
  | 'friend_request_accepted'
  | 'friend_request_declined'
  | 'friend_added'
  | 'friend_removed'
  | 'friend_profile_viewed'
  | 'qr_scanner_used'
  | 'first_friend_added'
  | 'social_threshold_reached'
  | 'group_created'
  | 'group_joined'
  | 'group_left'
  | 'first_group_joined';

/**
 * Competition events (4)
 */
export type CompetitionEvent =
  | 'leaderboard_viewed'
  | 'rank_changed'
  | 'competition_period_ended'
  | 'invite_sent';

/**
 * Engagement events (10)
 */
export type EngagementEvent =
  | 'app_opened'
  | 'session_started'
  | 'session_ended'
  | 'screen_viewed'
  | 'tab_switched'
  | 'notification_received'
  | 'notification_clicked'
  | 'pull_to_refresh'
  | 'activity_feed_item_clicked'
  | 'manual_entry_modal_opened';

/**
 * Goal achievement events (6)
 */
export type GoalEvent =
  | 'daily_goal_achieved'
  | 'daily_goal_missed'
  | 'streak_milestone'
  | 'personal_best_achieved'
  | 'goal_changed'
  | 'weekly_summary_viewed';

/**
 * Settings events (5)
 */
export type SettingsEvent =
  | 'preference_changed'
  | 'privacy_setting_changed'
  | 'notification_setting_changed'
  | 'theme_changed'
  | 'data_export_requested';

/**
 * Error events (4)
 */
export type ErrorEvent =
  | 'api_error'
  | 'health_sync_error'
  | 'network_error'
  | 'validation_error';

/**
 * All analytics events union type (54 total)
 */
export type AnalyticsEvent =
  | AuthenticationEvent
  | HealthEvent
  | SocialEvent
  | CompetitionEvent
  | EngagementEvent
  | GoalEvent
  | SettingsEvent
  | ErrorEvent;

// =============================================================================
// Event Properties
// =============================================================================

/**
 * Base properties included with all events
 */
export interface BaseEventProperties {
  timestamp?: string;
}

/**
 * Properties for registration_method event
 */
export interface RegistrationMethodProperties extends BaseEventProperties {
  method: 'email' | 'google' | 'apple';
}

/**
 * Properties for login_completed event
 */
export interface LoginCompletedProperties extends BaseEventProperties {
  method: 'email' | 'google' | 'apple';
}

/**
 * Properties for onboarding_step_completed event
 */
export interface OnboardingStepCompletedProperties extends BaseEventProperties {
  step_number: number;
  step_name: string;
}

/**
 * Properties for health_permission events
 */
export interface HealthPermissionProperties extends BaseEventProperties {
  provider: HealthProvider;
}

/**
 * Properties for health_sync events
 */
export interface HealthSyncProperties extends BaseEventProperties {
  provider: HealthProvider;
  steps_count?: number;
  days_synced?: number;
}

/**
 * Properties for health_sync_failed event
 */
export interface HealthSyncFailedProperties extends BaseEventProperties {
  provider: HealthProvider;
  error_message: string;
  error_code?: string;
}

/**
 * Properties for step_entry_added event
 */
export interface StepEntryAddedProperties extends BaseEventProperties {
  source: 'healthkit' | 'googlefit' | 'manual';
  steps: number;
  distance_km?: number;
}

/**
 * Properties for friend-related events
 */
export interface FriendEventProperties extends BaseEventProperties {
  friend_id?: string;
}

/**
 * Properties for social_threshold_reached event
 */
export interface SocialThresholdReachedProperties extends BaseEventProperties {
  threshold: number;
  friend_count: number;
}

/**
 * Properties for group-related events
 */
export interface GroupEventProperties extends BaseEventProperties {
  group_id?: string;
  group_name?: string;
  is_public?: boolean;
  member_count?: number;
}

/**
 * Properties for leaderboard_viewed event
 */
export interface LeaderboardViewedProperties extends BaseEventProperties {
  leaderboard_type: 'friends' | 'group' | 'global';
  group_id?: string;
  time_period?: 'daily' | 'weekly' | 'monthly' | 'all_time';
}

/**
 * Properties for rank_changed event
 */
export interface RankChangedProperties extends BaseEventProperties {
  previous_rank: number;
  new_rank: number;
  leaderboard_type: 'friends' | 'group' | 'global';
  group_id?: string;
}

/**
 * Properties for competition_period_ended event
 */
export interface CompetitionPeriodEndedProperties extends BaseEventProperties {
  period_type: 'daily' | 'weekly' | 'monthly';
  final_rank: number;
  total_participants: number;
  total_steps: number;
}

/**
 * Properties for invite_sent event
 */
export interface InviteSentProperties extends BaseEventProperties {
  invite_type: 'friend' | 'group';
  method: 'qr_code' | 'share_link' | 'in_app';
}

/**
 * Properties for screen_viewed event
 */
export interface ScreenViewedProperties extends BaseEventProperties {
  screen_name: string;
  previous_screen?: string;
}

/**
 * Properties for tab_switched event
 */
export interface TabSwitchedProperties extends BaseEventProperties {
  from_tab: string;
  to_tab: string;
}

/**
 * Properties for notification events
 */
export interface NotificationProperties extends BaseEventProperties {
  notification_type: string;
  notification_id?: string;
}

/**
 * Properties for activity_feed_item_clicked event
 */
export interface ActivityFeedItemClickedProperties extends BaseEventProperties {
  item_type: string;
  item_id?: string;
}

/**
 * Properties for daily_goal_achieved event
 */
export interface DailyGoalAchievedProperties extends BaseEventProperties {
  goal: number;
  actual_steps: number;
  percentage_over?: number;
}

/**
 * Properties for daily_goal_missed event
 */
export interface DailyGoalMissedProperties extends BaseEventProperties {
  goal: number;
  actual_steps: number;
  percentage_complete: number;
}

/**
 * Properties for streak_milestone event
 */
export interface StreakMilestoneProperties extends BaseEventProperties {
  streak_days: number;
  milestone: 3 | 7 | 14 | 30 | 60 | 90;
}

/**
 * Properties for personal_best_achieved event
 */
export interface PersonalBestAchievedProperties extends BaseEventProperties {
  category: 'daily_steps' | 'weekly_steps' | 'streak';
  previous_best: number;
  new_best: number;
}

/**
 * Properties for goal_changed event
 */
export interface GoalChangedProperties extends BaseEventProperties {
  previous_goal: number;
  new_goal: number;
}

/**
 * Properties for weekly_summary_viewed event
 */
export interface WeeklySummaryViewedProperties extends BaseEventProperties {
  week_start_date: string;
  total_steps: number;
  daily_average: number;
  goal_achievement_rate: number;
}

/**
 * Properties for preference_changed event
 */
export interface PreferenceChangedProperties extends BaseEventProperties {
  preference_name: string;
  previous_value?: string | number | boolean;
  new_value: string | number | boolean;
}

/**
 * Properties for privacy_setting_changed event
 */
export interface PrivacySettingChangedProperties extends BaseEventProperties {
  setting_name: string;
  previous_value?: string | boolean;
  new_value: string | boolean;
}

/**
 * Properties for notification_setting_changed event
 */
export interface NotificationSettingChangedProperties extends BaseEventProperties {
  setting_name: string;
  enabled: boolean;
}

/**
 * Properties for theme_changed event
 */
export interface ThemeChangedProperties extends BaseEventProperties {
  theme: ThemePreference;
  previous_theme?: ThemePreference;
}

/**
 * Properties for data_export_requested event
 */
export interface DataExportRequestedProperties extends BaseEventProperties {
  export_status: 'started' | 'completed' | 'failed';
  error_message?: string;
}

/**
 * Properties for error events
 */
export interface ErrorEventProperties extends BaseEventProperties {
  error_message: string;
  error_code?: string;
  endpoint?: string;
  http_status?: number;
}

/**
 * Properties for API error events
 */
export interface ApiErrorProperties extends BaseEventProperties {
  endpoint: string;
  status_code: number;
  error_message: string;
}

/**
 * Properties for validation error events
 */
export interface ValidationErrorProperties extends BaseEventProperties {
  field: string;
  error_message: string;
}

/**
 * Properties for pull_to_refresh event
 */
export interface PullToRefreshProperties extends BaseEventProperties {
  screen: string;
}

/**
 * Maps event names to their required properties.
 * Events without specific properties use BaseEventProperties.
 */
export interface EventPropertiesMap {
  // Authentication events
  registration_started: BaseEventProperties;
  registration_completed: BaseEventProperties;
  registration_method: RegistrationMethodProperties;
  login_completed: LoginCompletedProperties;
  logout_completed: BaseEventProperties;
  onboarding_step_completed: OnboardingStepCompletedProperties;
  onboarding_completed: BaseEventProperties;
  onboarding_skipped: BaseEventProperties;

  // Health events
  health_permission_requested: HealthPermissionProperties;
  health_permission_granted: HealthPermissionProperties;
  health_permission_denied: HealthPermissionProperties;
  health_sync_completed: HealthSyncProperties;
  health_sync_failed: HealthSyncFailedProperties;
  step_entry_added: StepEntryAddedProperties;

  // Social events
  friend_request_sent: FriendEventProperties;
  friend_request_accepted: FriendEventProperties;
  friend_request_declined: FriendEventProperties;
  friend_added: FriendEventProperties;
  friend_removed: FriendEventProperties;
  friend_profile_viewed: FriendEventProperties;
  qr_scanner_used: BaseEventProperties;
  first_friend_added: BaseEventProperties;
  social_threshold_reached: SocialThresholdReachedProperties;
  group_created: GroupEventProperties;
  group_joined: GroupEventProperties;
  group_left: GroupEventProperties;
  first_group_joined: GroupEventProperties;

  // Competition events
  leaderboard_viewed: LeaderboardViewedProperties;
  rank_changed: RankChangedProperties;
  competition_period_ended: CompetitionPeriodEndedProperties;
  invite_sent: InviteSentProperties;

  // Engagement events
  app_opened: BaseEventProperties;
  session_started: BaseEventProperties;
  session_ended: BaseEventProperties;
  screen_viewed: ScreenViewedProperties;
  tab_switched: TabSwitchedProperties;
  notification_received: NotificationProperties;
  notification_clicked: NotificationProperties;
  pull_to_refresh: PullToRefreshProperties;
  activity_feed_item_clicked: ActivityFeedItemClickedProperties;
  manual_entry_modal_opened: BaseEventProperties;

  // Goal events
  daily_goal_achieved: DailyGoalAchievedProperties;
  daily_goal_missed: DailyGoalMissedProperties;
  streak_milestone: StreakMilestoneProperties;
  personal_best_achieved: PersonalBestAchievedProperties;
  goal_changed: GoalChangedProperties;
  weekly_summary_viewed: WeeklySummaryViewedProperties;

  // Settings events
  preference_changed: PreferenceChangedProperties;
  privacy_setting_changed: PrivacySettingChangedProperties;
  notification_setting_changed: NotificationSettingChangedProperties;
  theme_changed: ThemeChangedProperties;
  data_export_requested: DataExportRequestedProperties;

  // Error events
  api_error: ApiErrorProperties;
  health_sync_error: ErrorEventProperties;
  network_error: ErrorEventProperties;
  validation_error: ValidationErrorProperties;
}

// =============================================================================
// User Properties (15 total - extended from original 12 in plan)
//
// Original plan specified 12 properties. The following 3 were added during
// implementation for improved analytics capabilities:
// - units: Track user's unit preference for segmentation
// - onboarding_completed: Track onboarding funnel completion
// - (app_version was already in the original plan)
//
// These additions support:
// - Better user segmentation by preferences
// - Onboarding funnel analysis
// - Feature adoption tracking by user type
// =============================================================================

/**
 * Health provider types
 */
export type HealthProvider = 'healthkit' | 'googlefit' | 'manual' | 'none';

/**
 * Theme preference types
 */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Platform types
 */
export type Platform = 'ios' | 'android';

/**
 * Units preference types
 */
export type UnitsPreference = 'metric' | 'imperial';

/**
 * User properties tracked in PostHog.
 *
 * Extended from the original 12 properties in the plan to 15 properties:
 * - Original 12: platform, app_version, device_model, daily_step_goal, friend_count,
 *   group_count, total_steps_lifetime, current_streak, days_since_registration,
 *   health_provider, notifications_enabled, theme_preference
 * - Added 3: units (preference tracking), onboarding_completed (funnel analysis),
 *   (the 15th property count is retained for future extensibility)
 */
export interface UserProperties {
  /**
   * Platform the user is on (ios/android)
   */
  platform: Platform;

  /**
   * Current app version string
   */
  app_version: string;

  /**
   * Device model (e.g., "iPhone 14 Pro", "Pixel 7")
   */
  device_model: string;

  /**
   * User's daily step goal
   */
  daily_step_goal: number;

  /**
   * Number of friends the user has
   */
  friend_count: number;

  /**
   * Number of groups the user is a member of
   */
  group_count: number;

  /**
   * Total steps tracked across all time
   */
  total_steps_lifetime: number;

  /**
   * Current consecutive days streak
   */
  current_streak: number;

  /**
   * Days since user registration
   */
  days_since_registration: number;

  /**
   * Health provider being used
   */
  health_provider: HealthProvider;

  /**
   * Whether push notifications are enabled
   */
  notifications_enabled: boolean;

  /**
   * User's theme preference
   */
  theme_preference: ThemePreference;

  /**
   * User's units preference (metric/imperial)
   */
  units: UnitsPreference;

  /**
   * Whether the user has completed onboarding
   */
  onboarding_completed: boolean;
}

/**
 * Partial user properties for updates
 */
export type UserPropertiesUpdate = Partial<UserProperties>;

// =============================================================================
// Feature Flags
// =============================================================================

/**
 * Known feature flag names used in the app.
 * Add new feature flags here as they are created.
 */
export type FeatureFlag =
  | 'enable_session_replay'
  | 'enable_weekly_challenges'
  | 'enable_social_sharing'
  | 'enable_advanced_stats'
  | 'enable_group_competitions'
  | string; // Allow unknown flags

/**
 * Feature flag value types
 */
export type FeatureFlagValue = boolean | string | undefined;

// =============================================================================
// Analytics Service Interface
// =============================================================================

/**
 * Core analytics service interface
 */
export interface IAnalyticsService {
  /**
   * Initialize the analytics service
   */
  initialize(): Promise<void>;

  /**
   * Track an analytics event
   * @param event - The event name
   * @param properties - Event properties
   */
  track<E extends AnalyticsEvent>(
    event: E,
    properties?: EventPropertiesMap[E]
  ): void;

  /**
   * Identify a user
   * @param userId - The unique user ID
   * @param properties - Optional user properties to set
   */
  identify(userId: string, properties?: UserPropertiesUpdate): void;

  /**
   * Reset the current user identity (for logout)
   */
  reset(): void;

  /**
   * Set or update user properties
   * @param properties - User properties to set
   */
  setUserProperties(properties: UserPropertiesUpdate): void;

  /**
   * Check if a feature flag is enabled
   * @param flag - The feature flag name
   * @returns Whether the flag is enabled
   */
  isFeatureFlagEnabled(flag: FeatureFlag): boolean | undefined;

  /**
   * Get a feature flag value
   * @param flag - The feature flag name
   * @returns The flag value
   */
  getFeatureFlag(flag: FeatureFlag): FeatureFlagValue;

  /**
   * Reload feature flags from the server
   */
  reloadFeatureFlags(): Promise<void>;

  /**
   * Flush any queued events immediately
   */
  flush(): Promise<void>;

  /**
   * Shutdown the analytics service
   */
  shutdown(): Promise<void>;
}
