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

      const updated = await userPreferencesApi.updatePreferences(prefs);
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
