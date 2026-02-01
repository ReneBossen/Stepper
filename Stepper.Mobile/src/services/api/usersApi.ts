import { apiClient } from './client';

// =============================================================================
// User Data Export Types (GDPR Data Portability)
// =============================================================================

/**
 * Metadata for the data export.
 */
export interface ExportMetadata {
  exportedAt: string;
  userId: string;
  dataFormat: string;
}

/**
 * User profile data in export format.
 */
export interface ExportedProfile {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  qrCodeId: string;
  onboardingCompleted: boolean;
  createdAt: string;
}

/**
 * User preferences in export format.
 */
export interface ExportedPreferences {
  dailyStepGoal: number;
  units: string;
  notificationsEnabled: boolean;
  notifyDailyReminder: boolean;
  notifyFriendRequests: boolean;
  notifyGroupInvites: boolean;
  notifyAchievements: boolean;
  privacyProfileVisibility: string;
  privacyFindMe: string;
  privacyShowSteps: string;
}

/**
 * Step entry in export format.
 */
export interface ExportedStepEntry {
  date: string;
  stepCount: number;
  distanceMeters: number | null;
  source: string | null;
  recordedAt: string;
}

/**
 * Friendship data in export format.
 */
export interface ExportedFriendship {
  friendId: string;
  friendDisplayName: string;
  status: string;
  initiatedByMe: boolean;
  createdAt: string;
}

/**
 * Group membership in export format.
 */
export interface ExportedGroupMembership {
  groupId: string;
  groupName: string;
  role: string;
  joinedAt: string;
}

/**
 * Activity feed item in export format.
 */
export interface ExportedActivityItem {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

/**
 * Notification in export format.
 */
export interface ExportedNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

/**
 * Complete user data export response for GDPR compliance.
 */
export interface UserDataExport {
  exportMetadata: ExportMetadata;
  profile: ExportedProfile;
  preferences: ExportedPreferences;
  stepHistory: ExportedStepEntry[];
  friendships: ExportedFriendship[];
  groupMemberships: ExportedGroupMembership[];
  activityFeed: ExportedActivityItem[];
  notifications: ExportedNotification[];
}

// =============================================================================
// Existing Types
// =============================================================================

/**
 * User profile data from the users table.
 * Note: Preferences are now stored in the separate user_preferences table.
 */
export interface UserProfileData {
  id: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
  onboarding_completed: boolean;
}

/**
 * Public profile data for viewing other users.
 * Contains limited information based on privacy settings.
 */
export interface PublicUserProfile {
  id: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
  is_private: boolean;
}

/**
 * User statistics for profile display.
 */
export interface UserStats {
  friends_count: number;
  groups_count: number;
  badges_count: number;
}

/**
 * Weekly activity summary for profile.
 */
export interface WeeklyActivity {
  total_steps: number;
  total_distance_meters: number;
  average_steps_per_day: number;
  current_streak: number;
}

/**
 * Achievement badge representation.
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

/**
 * Mutual group between two users.
 */
export interface MutualGroup {
  id: string;
  name: string;
}

/**
 * Backend API response shape for user profile.
 * Uses camelCase from .NET backend.
 */
interface BackendProfileResponse {
  id: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
  onboardingCompleted: boolean;
  preferences?: {
    units: string;
    dailyStepGoal: number;
    notifications: {
      dailyReminder: boolean;
      friendRequests: boolean;
      groupInvites: boolean;
      achievements: boolean;
    };
    privacy: {
      showStepsToFriends: boolean;
      showGroupActivity: boolean;
      allowFriendRequests: boolean;
      privateProfile: boolean;
    };
  };
}

/**
 * Backend API response shape for avatar upload.
 */
interface BackendAvatarResponse {
  avatarUrl: string;
}

/**
 * Backend API response shape for user stats.
 */
interface BackendUserStatsResponse {
  friendsCount: number;
  groupsCount: number;
  badgesCount: number;
}

/**
 * Backend API response shape for user activity.
 */
interface BackendUserActivityResponse {
  totalSteps: number;
  totalDistanceMeters: number;
  averageStepsPerDay: number;
  currentStreak: number;
}

/**
 * Backend API response shape for mutual groups.
 */
interface BackendMutualGroupResponse {
  id: string;
  name: string;
}

/**
 * Maps backend profile response (camelCase) to mobile format (snake_case).
 */
function mapProfileResponse(backend: BackendProfileResponse): UserProfileData {
  return {
    id: backend.id,
    display_name: backend.displayName,
    avatar_url: backend.avatarUrl,
    created_at: backend.createdAt,
    onboarding_completed: backend.onboardingCompleted,
  };
}

export const usersApi = {
  /**
   * Fetches the current user's profile from the backend API.
   * Note: This no longer includes preferences - use userPreferencesApi for that.
   */
  getCurrentUser: async (): Promise<UserProfileData> => {
    const response = await apiClient.get<BackendProfileResponse>('/users/me');
    return mapProfileResponse(response);
  },

  /**
   * Updates the current user's profile via the backend API.
   * Note: To update preferences, use userPreferencesApi.updatePreferences().
   */
  updateProfile: async (updates: Partial<UserProfileData>): Promise<UserProfileData> => {
    // Map snake_case to camelCase for the request
    const requestBody: Record<string, unknown> = {};
    if (updates.display_name !== undefined) {
      requestBody.displayName = updates.display_name;
    }
    if (updates.avatar_url !== undefined) {
      requestBody.avatarUrl = updates.avatar_url;
    }
    if (updates.onboarding_completed !== undefined) {
      requestBody.onboardingCompleted = updates.onboarding_completed;
    }

    const response = await apiClient.put<BackendProfileResponse>('/users/me', requestBody);
    return mapProfileResponse(response);
  },

  /**
   * Uploads a new avatar image via the backend API.
   * The backend handles storage and returns the public URL.
   */
  uploadAvatar: async (uri: string): Promise<string> => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri,
      name: filename,
      type,
    } as unknown as Blob);

    const response = await apiClient.upload<BackendAvatarResponse>('/users/me/avatar', formData);
    return response.avatarUrl;
  },

  /**
   * Fetches another user's public profile.
   * Returns limited data based on privacy settings.
   */
  getUserProfile: async (userId: string): Promise<PublicUserProfile> => {
    const response = await apiClient.get<BackendProfileResponse>(`/users/${userId}`);
    return {
      id: response.id,
      display_name: response.displayName,
      avatar_url: response.avatarUrl,
      created_at: response.createdAt,
      is_private: false, // TODO: Backend doesn't provide this yet
    };
  },

  /**
   * Fetches user stats (friends count, groups count, badges count).
   */
  getUserStats: async (userId: string): Promise<UserStats> => {
    const response = await apiClient.get<BackendUserStatsResponse>(`/users/${userId}/stats`);
    return {
      friends_count: response.friendsCount,
      groups_count: response.groupsCount,
      badges_count: response.badgesCount,
    };
  },

  /**
   * Fetches weekly activity summary for a user.
   */
  getWeeklyActivity: async (userId: string): Promise<WeeklyActivity> => {
    const response = await apiClient.get<BackendUserActivityResponse>(`/users/${userId}/activity`);
    return {
      total_steps: response.totalSteps,
      total_distance_meters: response.totalDistanceMeters,
      average_steps_per_day: response.averageStepsPerDay,
      current_streak: response.currentStreak,
    };
  },

  /**
   * Fetches achievements for a user.
   * Currently returns mock data as achievements are not yet implemented.
   */
  getAchievements: async (_userId: string): Promise<Achievement[]> => {
    // TODO: Implement achievements table and logic
    // For now, return empty array - can be expanded when achievements feature is built
    return [];
  },

  /**
   * Fetches mutual groups between current user and another user.
   */
  getMutualGroups: async (otherUserId: string): Promise<MutualGroup[]> => {
    const response = await apiClient.get<BackendMutualGroupResponse[]>(`/users/${otherUserId}/mutual-groups`);
    return response;
  },

  /**
   * Downloads all user data for GDPR data portability compliance.
   * Returns a complete export of all personal data stored about the user.
   */
  downloadMyData: async (): Promise<UserDataExport> => {
    return apiClient.get<UserDataExport>('/users/me/data-export');
  },

};
