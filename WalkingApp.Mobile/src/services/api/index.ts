// Re-export HTTP client and types
export { apiClient } from './client';
export { ApiError } from './types';
export type { ApiResponse, ApiErrorResponse } from './types';

// Re-export all API services for convenience
export { authApi } from './authApi';
export { usersApi } from './usersApi';
export { userPreferencesApi } from './userPreferencesApi';
export { stepsApi } from './stepsApi';
export { friendsApi } from './friendsApi';
export { groupsApi } from './groupsApi';
export { notificationsApi } from './notificationsApi';
export { activityApi } from './activityApi';

// Re-export types
export type { ActivityItem, ActivityFeedResponse } from './activityApi';
export type { UserPreferences, UserPreferencesUpdate, PrivacyLevel } from './userPreferencesApi';
export { DEFAULT_PREFERENCES } from './userPreferencesApi';
export type {
  UserProfileData,
  PublicUserProfile,
  UserStats,
  WeeklyActivity,
  Achievement,
  MutualGroup,
} from './usersApi';
export type {
  StepEntry,
  StepStats,
  DailyStepsResponse,
  StepHistoryResponse,
  RecordStepsRequest,
  StepHistoryParams,
  DailyHistoryParams,
} from './stepsApi';
