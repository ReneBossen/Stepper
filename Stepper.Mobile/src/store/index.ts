// Re-export all stores for convenience
export { useAuthStore } from './authStore';
export { useUserStore } from './userStore';
export { useStepsStore } from './stepsStore';
export { useFriendsStore } from './friendsStore';
export { useGroupsStore } from './groupsStore';
export { useNotificationsStore } from './notificationsStore';
export { useActivityStore } from './activityStore';
export {
  useAnalyticsStore,
  selectConsentStatus,
  selectHasConsent,
  selectNeedsConsentPrompt,
} from './analyticsStore';

// Re-export types
export type { UserProfile, UserPreferences } from './userStore';
export type { StepEntry, StepStats } from './stepsStore';
export type { Friend } from './friendsStore';
export type { Group, GroupMember, CreateGroupData } from './groupsStore';
export type { Notification } from './notificationsStore';
export type { ActivityItem } from './activityStore';
