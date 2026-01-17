import { supabase } from '../supabase';
import { Friend } from '@store/friendsStore';

export const friendsApi = {
  getFriends: async (): Promise<Friend[]> => {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        friend_id,
        status,
        users!friendships_friend_id_fkey (
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .eq('status', 'accepted');

    if (error) throw error;

    return data?.map((friendship: any) => ({
      id: friendship.id,
      user_id: friendship.users.id,
      display_name: friendship.users.display_name,
      username: friendship.users.username,
      avatar_url: friendship.users.avatar_url,
      status: friendship.status,
    })) || [];
  },

  getRequests: async (): Promise<Friend[]> => {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        status,
        users!friendships_user_id_fkey (
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .eq('status', 'pending');

    if (error) throw error;

    return data?.map((friendship: any) => ({
      id: friendship.id,
      user_id: friendship.users.id,
      display_name: friendship.users.display_name,
      username: friendship.users.username,
      avatar_url: friendship.users.avatar_url,
      status: friendship.status,
    })) || [];
  },

  sendRequest: async (userId: string): Promise<void> => {
    const { error } = await supabase
      .from('friendships')
      .insert({
        friend_id: userId,
        status: 'pending',
      });

    if (error) throw error;
  },

  acceptRequest: async (userId: string): Promise<void> => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (error) throw error;
  },

  declineRequest: async (userId: string): Promise<void> => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (error) throw error;
  },

  removeFriend: async (userId: string): Promise<void> => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('friend_id', userId)
      .eq('status', 'accepted');

    if (error) throw error;
  },
};
