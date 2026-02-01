import { create } from 'zustand';
import {
  usersApi,
  UserProfileData,
  PublicUserProfile,
  UserStats,
  WeeklyActivity,
  Achievement,
  MutualGroup,
} from '@services/api/usersApi';
import { userPreferencesApi, UserPreferences, UserPreferencesUpdate, DEFAULT_PREFERENCES } from '@services/api/userPreferencesApi';
import { getErrorMessage } from '@utils/errorUtils';
import { track, setUserProperties } from '@services/analytics';

// Re-export types for consumers
export type { UserPreferences, UserPreferencesUpdate } from '@services/api/userPreferencesApi';
export type { PrivacyLevel } from '@services/api/userPreferencesApi';
export type { PublicUserProfile, UserStats, WeeklyActivity, Achievement, MutualGroup } from '@services/api/usersApi';

/**
 * Combined user profile with preferences.
 * Profile data comes from `users` table, preferences from `user_preferences` table.
 */
export interface UserProfile extends UserProfileData {
  preferences: UserPreferences;
}

/**
 * Theme preference stored locally (not in user_preferences table).
 * This is kept separate because theme affects the entire app and may need
 * to be accessed before user data is loaded.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * State for viewing another user's profile.
 */
export interface ViewedUserState {
  profile: PublicUserProfile | null;
  stats: UserStats | null;
  weeklyActivity: WeeklyActivity | null;
  achievements: Achievement[];
  mutualGroups: MutualGroup[];
}

interface UserState {
  currentUser: UserProfile | null;
  viewedUser: ViewedUserState | null;
  themePreference: ThemePreference;
  isLoading: boolean;
  isLoadingViewedUser: boolean;
  error: string | null;

  // Actions
  fetchCurrentUser: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfileData>) => Promise<UserProfile>;
  updatePreferences: (prefs: UserPreferencesUpdate) => Promise<void>;
  setThemePreference: (theme: ThemePreference) => void;
  uploadAvatar: (uri: string) => Promise<string>;
  clearUser: () => void;

  // Viewed user actions
  fetchUserProfile: (userId: string) => Promise<void>;
  fetchCurrentUserStats: () => Promise<UserStats>;
  fetchCurrentUserWeeklyActivity: () => Promise<WeeklyActivity>;
  fetchCurrentUserAchievements: () => Promise<Achievement[]>;
  clearViewedUser: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  currentUser: null,
  viewedUser: null,
  themePreference: 'system',
  isLoading: false,
  isLoadingViewedUser: false,
  error: null,

  fetchCurrentUser: async () => {
    set({ isLoading: true, error: null });
    try {
      // Fetch user profile and preferences in parallel
      const [profileData, preferences] = await Promise.all([
        usersApi.getCurrentUser(),
        userPreferencesApi.getPreferences(),
      ]);

      // Combine profile and preferences into UserProfile
      const user: UserProfile = {
        ...profileData,
        preferences,
      };

      set({ currentUser: user, isLoading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      const current = get().currentUser;
      const updated = await usersApi.updateProfile(updates);

      // Merge updated profile with existing preferences
      const userProfile: UserProfile = {
        ...updated,
        preferences: current?.preferences ?? {
          id: updated.id,
          ...DEFAULT_PREFERENCES,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      set({ currentUser: userProfile, isLoading: false });
      return userProfile;
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  updatePreferences: async (prefs) => {
    set({ isLoading: true, error: null });
    try {
      const current = get().currentUser;
      if (!current) throw new Error('No user loaded');

      const previousPrefs = current.preferences;
      const updated = await userPreferencesApi.updatePreferences(prefs);

      // Track preference changes
      if (prefs.daily_step_goal !== undefined && prefs.daily_step_goal !== previousPrefs?.daily_step_goal) {
        track('goal_changed', {
          previous_goal: previousPrefs?.daily_step_goal ?? 10000,
          new_goal: prefs.daily_step_goal,
        });
        setUserProperties({ daily_step_goal: prefs.daily_step_goal });
      }

      // Track privacy setting changes
      if (prefs.privacy_find_me !== undefined && prefs.privacy_find_me !== previousPrefs?.privacy_find_me) {
        track('privacy_setting_changed', { setting_name: 'privacy_find_me', new_value: prefs.privacy_find_me });
      }
      if (prefs.privacy_show_steps !== undefined && prefs.privacy_show_steps !== previousPrefs?.privacy_show_steps) {
        track('privacy_setting_changed', { setting_name: 'privacy_show_steps', new_value: prefs.privacy_show_steps });
      }

      // Track notification setting changes
      if (prefs.notifications_enabled !== undefined && prefs.notifications_enabled !== previousPrefs?.notifications_enabled) {
        track('notification_setting_changed', {
          setting_name: 'notifications_enabled',
          enabled: prefs.notifications_enabled,
        });
      }
      if (prefs.notify_goal_achieved !== undefined && prefs.notify_goal_achieved !== previousPrefs?.notify_goal_achieved) {
        track('notification_setting_changed', {
          setting_name: 'notify_goal_achieved',
          enabled: prefs.notify_goal_achieved,
        });
      }
      if (prefs.notify_friend_milestones !== undefined && prefs.notify_friend_milestones !== previousPrefs?.notify_friend_milestones) {
        track('notification_setting_changed', {
          setting_name: 'notify_friend_milestones',
          enabled: prefs.notify_friend_milestones,
        });
      }

      // Track units/preference changes
      if (prefs.units !== undefined && prefs.units !== previousPrefs?.units) {
        track('preference_changed', { preference_name: 'units', new_value: prefs.units });
        setUserProperties({ units: prefs.units });
      }

      set({
        currentUser: { ...current, preferences: updated },
        isLoading: false,
      });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  setThemePreference: (theme) => {
    const previous = get().themePreference;
    if (theme !== previous) {
      // Track theme changed event
      track('theme_changed', { theme });
      setUserProperties({ theme_preference: theme });
    }
    set({ themePreference: theme });
  },

  uploadAvatar: async (uri) => {
    set({ isLoading: true, error: null });
    try {
      const avatarUrl = await usersApi.uploadAvatar(uri);
      const current = get().currentUser;
      if (current) {
        set({
          currentUser: { ...current, avatar_url: avatarUrl },
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
      return avatarUrl;
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  /**
   * Clears the current user from the store and resets all state to initial values.
   * This should be called when the user signs out to ensure no stale user data remains.
   * Resets currentUser to null, themePreference to 'system', isLoading to false, and error to null.
   */
  clearUser: () => {
    set({
      currentUser: null,
      viewedUser: null,
      themePreference: 'system',
      isLoading: false,
      isLoadingViewedUser: false,
      error: null,
    });
  },

  /**
   * Fetches another user's full profile including stats, activity, achievements, and mutual groups.
   */
  fetchUserProfile: async (userId: string) => {
    set({ isLoadingViewedUser: true, error: null });
    try {
      // Track friend profile viewed event
      track('friend_profile_viewed', { friend_id: userId });

      // Fetch all data in parallel
      const [profile, stats, weeklyActivity, achievements, mutualGroups] = await Promise.all([
        usersApi.getUserProfile(userId),
        usersApi.getUserStats(userId),
        usersApi.getWeeklyActivity(userId),
        usersApi.getAchievements(userId),
        usersApi.getMutualGroups(userId),
      ]);

      set({
        viewedUser: {
          profile,
          stats,
          weeklyActivity,
          achievements,
          mutualGroups,
        },
        isLoadingViewedUser: false,
      });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoadingViewedUser: false });
    }
  },

  /**
   * Fetches stats for the current user's own profile.
   */
  fetchCurrentUserStats: async (): Promise<UserStats> => {
    const current = get().currentUser;
    if (!current) throw new Error('No user loaded');
    return usersApi.getUserStats(current.id);
  },

  /**
   * Fetches weekly activity for the current user's own profile.
   */
  fetchCurrentUserWeeklyActivity: async (): Promise<WeeklyActivity> => {
    const current = get().currentUser;
    if (!current) throw new Error('No user loaded');
    return usersApi.getWeeklyActivity(current.id);
  },

  /**
   * Fetches achievements for the current user's own profile.
   */
  fetchCurrentUserAchievements: async (): Promise<Achievement[]> => {
    const current = get().currentUser;
    if (!current) throw new Error('No user loaded');
    return usersApi.getAchievements(current.id);
  },

  /**
   * Clears the viewed user state.
   */
  clearViewedUser: () => {
    set({ viewedUser: null, isLoadingViewedUser: false });
  },
}));
