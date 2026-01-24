import { supabase } from '../supabase';

/**
 * User profile data from the users table.
 * Note: Preferences are now stored in the separate user_preferences table.
 */
export interface UserProfileData {
  id: string;
  email: string;
  display_name: string;
  username: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
  created_at: string;
  onboarding_completed: boolean;
}

export const usersApi = {
  /**
   * Fetches the current user's profile from the users table.
   * Note: This no longer includes preferences - use userPreferencesApi for that.
   */
  getCurrentUser: async (): Promise<UserProfileData> => {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, display_name, username, bio, location, avatar_url, created_at, onboarding_completed')
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
      .select('id, email, display_name, username, bio, location, avatar_url, created_at, onboarding_completed')
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
};
