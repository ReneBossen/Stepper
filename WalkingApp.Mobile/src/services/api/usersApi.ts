import { supabase } from '../supabase';

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

export const usersApi = {
  /**
   * Fetches the current user's profile from the users table.
   * Note: This no longer includes preferences - use userPreferencesApi for that.
   */
  getCurrentUser: async (): Promise<UserProfileData> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, created_at, onboarding_completed')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Updates the current user's profile in the users table.
   * Note: To update preferences, use userPreferencesApi.updatePreferences().
   */
  updateProfile: async (updates: Partial<UserProfileData>): Promise<UserProfileData> => {
    // Get current user ID for WHERE clause
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select('id, display_name, avatar_url, created_at, onboarding_completed')
      .single();

    if (error) throw error;
    return data;
  },

  uploadAvatar: async (uri: string): Promise<string> => {
    // Get current user ID for folder structure
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Upload to Supabase Storage with user-specific folder
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileName = `${user.id}/avatar-${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, {
        upsert: true, // Replace existing file if it exists
        contentType: 'image/jpeg',
      });

    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from('avatars')
      .getPublicUrl(data.path);

    return publicUrl.publicUrl;
  },

  /**
   * Fetches another user's public profile.
   * Returns limited data based on privacy settings.
   */
  getUserProfile: async (userId: string): Promise<PublicUserProfile> => {
    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, created_at')
      .eq('id', userId)
      .single();

    if (error) throw error;

    // Check privacy settings from user_preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('privacy_find_me')
      .eq('id', userId)
      .single();

    const isPrivate = prefs?.privacy_find_me === 'private';

    return {
      id: data.id,
      display_name: data.display_name,
      avatar_url: data.avatar_url,
      created_at: data.created_at,
      is_private: isPrivate,
    };
  },

  /**
   * Fetches user stats (friends count, groups count, badges count).
   */
  getUserStats: async (userId: string): Promise<UserStats> => {
    // Get friends count - count accepted friendships
    const { count: friendsCount } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    // Get groups count
    const { count: groupsCount } = await supabase
      .from('group_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // For now, badges are not implemented - return 0
    // TODO: Implement badges/achievements table
    const badgesCount = 0;

    return {
      friends_count: friendsCount ?? 0,
      groups_count: groupsCount ?? 0,
      badges_count: badgesCount,
    };
  },

  /**
   * Fetches weekly activity summary for a user.
   */
  getWeeklyActivity: async (userId: string): Promise<WeeklyActivity> => {
    // Calculate date range for current week (last 7 days)
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 6);

    const startDate = weekAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    // Get step entries for the week
    const { data: entries, error } = await supabase
      .from('step_entries')
      .select('date, step_count, distance_meters')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;

    const totalSteps = entries?.reduce((sum, e) => sum + e.step_count, 0) ?? 0;
    const totalDistance = entries?.reduce((sum, e) => sum + (e.distance_meters ?? 0), 0) ?? 0;
    const daysWithActivity = entries?.length ?? 0;
    const averageSteps = daysWithActivity > 0 ? Math.round(totalSteps / daysWithActivity) : 0;

    // Calculate streak
    let streak = 0;
    const { data: allEntries } = await supabase
      .from('step_entries')
      .select('date, step_count')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (allEntries) {
      const now = new Date();
      const currentDateUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

      for (const entry of allEntries) {
        const [year, month, day] = entry.date.split('-').map(Number);
        const entryDateUtc = Date.UTC(year, month - 1, day);
        const diffDays = Math.floor((currentDateUtc - entryDateUtc) / (1000 * 60 * 60 * 24));

        if (diffDays === streak && entry.step_count > 0) {
          streak++;
        } else {
          break;
        }
      }
    }

    return {
      total_steps: totalSteps,
      total_distance_meters: totalDistance,
      average_steps_per_day: averageSteps,
      current_streak: streak,
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get current user's groups
    const { data: myGroups } = await supabase
      .from('group_memberships')
      .select('group_id')
      .eq('user_id', user.id);

    if (!myGroups || myGroups.length === 0) return [];

    const myGroupIds = myGroups.map(g => g.group_id);

    // Get other user's groups that match
    const { data: theirGroups, error } = await supabase
      .from('group_memberships')
      .select(`
        group_id,
        groups (
          id,
          name
        )
      `)
      .eq('user_id', otherUserId)
      .in('group_id', myGroupIds);

    if (error) throw error;

    // Supabase returns groups as an object (single relation) but TypeScript infers array
    // We need to handle the actual runtime shape
    const results: MutualGroup[] = [];

    for (const membership of theirGroups ?? []) {
      const groups = membership.groups as unknown;
      // Handle both single object and array cases
      if (groups && typeof groups === 'object') {
        if (Array.isArray(groups) && groups.length > 0) {
          results.push({ id: groups[0].id, name: groups[0].name });
        } else if ('id' in groups && 'name' in groups) {
          const group = groups as { id: string; name: string };
          results.push({ id: group.id, name: group.name });
        }
      }
    }

    return results;
  },

};
