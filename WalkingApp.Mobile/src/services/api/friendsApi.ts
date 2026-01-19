import { supabase } from '../supabase';
import { Friend } from '@store/friendsStore';

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

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

  /**
   * Get all accepted friends with their today's step count
   */
  getFriendsWithSteps: async (): Promise<Friend[]> => {
    // First, get all accepted friendships with user data
    const { data: friendships, error: friendshipsError } = await supabase
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

    if (friendshipsError) throw friendshipsError;

    if (!friendships || friendships.length === 0) {
      return [];
    }

    // Get friend user IDs
    const friendUserIds = friendships.map((f: any) => f.users.id);
    const today = getTodayDateString();

    // Fetch today's step entries for all friends
    const { data: stepEntries, error: stepsError } = await supabase
      .from('step_entries')
      .select('user_id, step_count')
      .in('user_id', friendUserIds)
      .eq('date', today);

    if (stepsError) throw stepsError;

    // Create a map of user_id to step_count for quick lookup
    const stepsMap = new Map<string, number>();
    stepEntries?.forEach((entry: any) => {
      stepsMap.set(entry.user_id, entry.step_count);
    });

    // Map friendships to Friend objects with today_steps
    return friendships.map((friendship: any) => ({
      id: friendship.id,
      user_id: friendship.users.id,
      display_name: friendship.users.display_name,
      username: friendship.users.username,
      avatar_url: friendship.users.avatar_url,
      status: friendship.status,
      today_steps: stepsMap.get(friendship.users.id) ?? 0,
    }));
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
