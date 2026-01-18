import { create } from 'zustand';
import { usersApi } from '@services/api/usersApi';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  username: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
  preferences: UserPreferences;
  created_at: string;
  onboarding_completed: boolean;
}

export interface UserPreferences {
  units: 'metric' | 'imperial';
  daily_step_goal: number;
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
}

interface NotificationPreferences {
  push_enabled: boolean;
  friend_requests: boolean;
  friend_accepted: boolean;
  group_invites: boolean;
  goal_achieved: boolean;
}

interface PrivacySettings {
  profile_visibility: 'public' | 'friends' | 'private';
  activity_visibility: 'public' | 'friends' | 'private';
  find_me: 'everyone' | 'friends' | 'nobody';
}

interface UserState {
  currentUser: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCurrentUser: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  uploadAvatar: (uri: string) => Promise<string>;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  currentUser: null,
  isLoading: false,
  error: null,

  fetchCurrentUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await usersApi.getCurrentUser();
      set({ currentUser: user, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await usersApi.updateProfile(updates);
      set({ currentUser: updated, isLoading: false });
      return updated;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updatePreferences: async (prefs) => {
    set({ isLoading: true, error: null });
    try {
      const current = get().currentUser;
      if (!current) throw new Error('No user loaded');

      const updated = await usersApi.updatePreferences(prefs);
      set({
        currentUser: { ...current, preferences: updated },
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
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
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Clears the current user from the store and resets all state to initial values.
   * This should be called when the user signs out to ensure no stale user data remains.
   * Resets currentUser to null, isLoading to false, and error to null.
   */
  clearUser: () => {
    set({ currentUser: null, isLoading: false, error: null });
  },
}));
