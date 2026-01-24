import { supabase } from '../supabase';

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
  privacy_find_me: 'public',
  privacy_show_steps: 'partial',
};

export const userPreferencesApi = {
  /**
   * Fetches the current user's preferences from the user_preferences table.
   * If no preferences exist, returns default values.
   */
  async getPreferences(): Promise<UserPreferences> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      // If no row exists, return defaults with user id
      if (error.code === 'PGRST116') {
        return {
          id: user.id,
          ...DEFAULT_PREFERENCES,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      throw error;
    }

    return data;
  },

  /**
   * Updates the current user's preferences in the user_preferences table.
   * Uses upsert to create the row if it doesn't exist.
   */
  async updatePreferences(updates: UserPreferencesUpdate): Promise<UserPreferences> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
