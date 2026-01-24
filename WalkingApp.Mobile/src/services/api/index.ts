// Re-export all API services for convenience
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
