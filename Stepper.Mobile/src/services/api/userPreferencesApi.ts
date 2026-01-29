import { apiClient } from './client';

/**
 * Privacy visibility level for user preferences.
 * - 'public': Visible to everyone
 * - 'partial': Visible to friends only
 * - 'private': Visible to nobody
 */
export type PrivacyLevel = 'public' | 'partial' | 'private';

/**
 * User preferences stored in the user_preferences table.
 * This replaces the JSONB preferences column on the users table.
 */
export interface UserPreferences {
  id: string;
  daily_step_goal: number;
  units: 'metric' | 'imperial';
  notifications_enabled: boolean;
  // Granular notification preferences
  notify_friend_requests: boolean;
  notify_friend_accepted: boolean;
  notify_friend_milestones: boolean;
  notify_group_invites: boolean;
  notify_leaderboard_updates: boolean;
  notify_competition_reminders: boolean;
  notify_goal_achieved: boolean;
  notify_streak_reminders: boolean;
  notify_weekly_summary: boolean;
  // Privacy settings
  privacy_profile_visibility: PrivacyLevel;
  privacy_find_me: PrivacyLevel;
  privacy_show_steps: PrivacyLevel;
  created_at: string;
  updated_at: string;
}

/**
 * Partial preferences for updates - all fields optional except id.
 */
export type UserPreferencesUpdate = Partial<Omit<UserPreferences, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Default preferences values used when user has no preferences record.
 */
export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'created_at' | 'updated_at'> = {
  daily_step_goal: 10000,
  units: 'metric',
  notifications_enabled: true,
  // Granular notification preferences
  notify_friend_requests: true,
  notify_friend_accepted: true,
  notify_friend_milestones: true,
  notify_group_invites: true,
  notify_leaderboard_updates: false,
  notify_competition_reminders: true,
  notify_goal_achieved: true,
  notify_streak_reminders: true,
  notify_weekly_summary: true,
  // Privacy settings
  privacy_profile_visibility: 'public',
  privacy_find_me: 'public',
  privacy_show_steps: 'partial',
};

/**
 * Backend API response shape for user preferences.
 * Uses camelCase from .NET backend.
 * Note: Backend has a simplified preferences model compared to mobile.
 */
interface BackendPreferencesResponse {
  notificationsEnabled: boolean;
  dailyStepGoal: number;
  distanceUnit: string;
  privateProfile: boolean;
}

/**
 * Maps backend preferences response (camelCase, simplified) to mobile format (snake_case, full).
 * Provides default values for fields not supported by the backend.
 */
function mapPreferencesResponse(backend: BackendPreferencesResponse, userId: string): UserPreferences {
  const now = new Date().toISOString();
  return {
    id: userId,
    daily_step_goal: backend.dailyStepGoal,
    units: backend.distanceUnit === 'imperial' ? 'imperial' : 'metric',
    notifications_enabled: backend.notificationsEnabled,
    // Granular notification preferences - derive from master toggle
    notify_friend_requests: backend.notificationsEnabled,
    notify_friend_accepted: backend.notificationsEnabled,
    notify_friend_milestones: backend.notificationsEnabled,
    notify_group_invites: backend.notificationsEnabled,
    notify_leaderboard_updates: false, // Default to false as per DEFAULT_PREFERENCES
    notify_competition_reminders: backend.notificationsEnabled,
    notify_goal_achieved: backend.notificationsEnabled,
    notify_streak_reminders: backend.notificationsEnabled,
    notify_weekly_summary: backend.notificationsEnabled,
    // Privacy settings - derive from privateProfile flag
    privacy_profile_visibility: backend.privateProfile ? 'private' : 'public',
    privacy_find_me: backend.privateProfile ? 'private' : 'public',
    privacy_show_steps: backend.privateProfile ? 'private' : 'partial',
    created_at: now,
    updated_at: now,
  };
}

/**
 * Gets the current user ID from the backend profile endpoint.
 * Used to populate the id field in preferences.
 */
async function getCurrentUserId(): Promise<string> {
  interface ProfileResponse {
    id: string;
  }
  const response = await apiClient.get<ProfileResponse>('/users/me');
  return response.id;
}

export const userPreferencesApi = {
  /**
   * Fetches the current user's preferences from the backend API.
   * Maps the backend's simplified preferences model to the mobile's full model.
   */
  async getPreferences(): Promise<UserPreferences> {
    const [prefsResponse, userId] = await Promise.all([
      apiClient.get<BackendPreferencesResponse>('/users/me/preferences'),
      getCurrentUserId(),
    ]);

    return mapPreferencesResponse(prefsResponse, userId);
  },

  /**
   * Updates the current user's preferences via the backend API.
   * Maps the mobile's full preferences model to the backend's simplified model.
   */
  async updatePreferences(updates: UserPreferencesUpdate): Promise<UserPreferences> {
    // Map mobile format (snake_case, granular) to backend format (camelCase, simplified)
    const requestBody: Record<string, unknown> = {};

    // Map notifications_enabled to backend
    if (updates.notifications_enabled !== undefined) {
      requestBody.notificationsEnabled = updates.notifications_enabled;
    }

    // Map daily_step_goal to backend
    if (updates.daily_step_goal !== undefined) {
      requestBody.dailyStepGoal = updates.daily_step_goal;
    }

    // Map units to backend's distanceUnit
    if (updates.units !== undefined) {
      requestBody.distanceUnit = updates.units;
    }

    // Map privacy settings to backend's privateProfile
    // If any privacy setting is set to 'private', set privateProfile to true
    if (updates.privacy_profile_visibility !== undefined ||
        updates.privacy_find_me !== undefined ||
        updates.privacy_show_steps !== undefined) {
      const isPrivate =
        updates.privacy_profile_visibility === 'private' ||
        updates.privacy_find_me === 'private' ||
        updates.privacy_show_steps === 'private';
      requestBody.privateProfile = isPrivate;
    }

    const [prefsResponse, userId] = await Promise.all([
      apiClient.put<BackendPreferencesResponse>('/users/me/preferences', requestBody),
      getCurrentUserId(),
    ]);

    // Start with mapped backend response
    const mappedPrefs = mapPreferencesResponse(prefsResponse, userId);

    // Override with specific updates that the backend doesn't store
    // This preserves granular settings locally even though backend only stores simplified version
    return {
      ...mappedPrefs,
      // Apply granular notification overrides if they were in the update
      ...(updates.notify_friend_requests !== undefined && { notify_friend_requests: updates.notify_friend_requests }),
      ...(updates.notify_friend_accepted !== undefined && { notify_friend_accepted: updates.notify_friend_accepted }),
      ...(updates.notify_friend_milestones !== undefined && { notify_friend_milestones: updates.notify_friend_milestones }),
      ...(updates.notify_group_invites !== undefined && { notify_group_invites: updates.notify_group_invites }),
      ...(updates.notify_leaderboard_updates !== undefined && { notify_leaderboard_updates: updates.notify_leaderboard_updates }),
      ...(updates.notify_competition_reminders !== undefined && { notify_competition_reminders: updates.notify_competition_reminders }),
      ...(updates.notify_goal_achieved !== undefined && { notify_goal_achieved: updates.notify_goal_achieved }),
      ...(updates.notify_streak_reminders !== undefined && { notify_streak_reminders: updates.notify_streak_reminders }),
      ...(updates.notify_weekly_summary !== undefined && { notify_weekly_summary: updates.notify_weekly_summary }),
      // Apply granular privacy overrides if they were in the update
      ...(updates.privacy_profile_visibility !== undefined && { privacy_profile_visibility: updates.privacy_profile_visibility }),
      ...(updates.privacy_find_me !== undefined && { privacy_find_me: updates.privacy_find_me }),
      ...(updates.privacy_show_steps !== undefined && { privacy_show_steps: updates.privacy_show_steps }),
    };
  },
};
