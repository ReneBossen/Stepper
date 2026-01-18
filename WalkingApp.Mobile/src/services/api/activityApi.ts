import { supabase } from '../supabase';

export interface ActivityItem {
  id: string;
  type: 'milestone' | 'friend_achievement' | 'group_join' | 'streak';
  userId?: string;
  userName?: string;
  avatarUrl?: string;
  message: string;
  timestamp: string;
}

export interface ActivityFeedResponse {
  items: ActivityItem[];
}

export const activityApi = {
  /**
   * Fetches the activity feed for the current user
   * This includes friend achievements, milestones, and group activities
   */
  getFeed: async (limit: number = 10): Promise<ActivityItem[]> => {
    // Fetch friend achievements (friends who hit step milestones)
    const { data: friendAchievements, error: friendError } = await supabase
      .from('activity_feed')
      .select(`
        id,
        type,
        user_id,
        message,
        created_at,
        users:user_id (
          display_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (friendError && friendError.code !== 'PGRST116') {
      throw friendError;
    }

    // Map the data to ActivityItem format
    const items: ActivityItem[] = (friendAchievements || []).map((item: any) => ({
      id: item.id,
      type: item.type as ActivityItem['type'],
      userId: item.user_id,
      userName: item.users?.display_name,
      avatarUrl: item.users?.avatar_url,
      message: item.message,
      timestamp: item.created_at,
    }));

    return items;
  },

  /**
   * Subscribes to real-time activity feed updates
   */
  subscribeToFeed: (callback: (item: ActivityItem) => void) => {
    const subscription = supabase
      .channel('activity_feed_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
        },
        async (payload) => {
          // Fetch the full item with user details
          const { data } = await supabase
            .from('activity_feed')
            .select(`
              id,
              type,
              user_id,
              message,
              created_at,
              users:user_id (
                display_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback({
              id: data.id,
              type: data.type as ActivityItem['type'],
              userId: data.user_id,
              userName: (data.users as any)?.display_name,
              avatarUrl: (data.users as any)?.avatar_url,
              message: data.message,
              timestamp: data.created_at,
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },
};
