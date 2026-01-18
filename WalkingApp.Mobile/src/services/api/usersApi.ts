import { supabase } from '../supabase';
import { UserProfile, UserPreferences } from '@store/userStore';

export const usersApi = {
  getCurrentUser: async (): Promise<UserProfile> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  updateProfile: async (updates: Partial<UserProfile>): Promise<UserProfile> => {
    // Get current user ID for WHERE clause
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updatePreferences: async (prefs: Partial<UserPreferences>): Promise<UserPreferences> => {
    // Get current user ID for WHERE clause
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: current } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .single();

    const merged = { ...current?.preferences, ...prefs };

    const { data, error } = await supabase
      .from('users')
      .update({ preferences: merged })
      .eq('id', user.id)
      .select('preferences')
      .single();

    if (error) throw error;
    return data.preferences;
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
