import { supabase } from '../supabase';
import { Friend } from '@store/friendsStore';

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Database schema notes:
 * - friendships table uses requester_id (who sent request) and addressee_id (who received request)
 * - There is no direct FK between friendships and users table (both reference auth.users)
 * - To get friend details, we first query friendships, then query users table separately
 */

export interface UserSearchResult {
  id: string;
  display_name: string;
  username: string;
  avatar_url?: string;
}

export interface OutgoingRequest {
  id: string;
  user_id: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  created_at: string;
}

export const friendsApi = {
  /**
   * Get all accepted friends for the current user.
   * A friend can be either the requester or addressee - we return the "other" person.
   */
  getFriends: async (): Promise<Friend[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get friendships where current user is involved and status is accepted
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error) throw error;
    if (!friendships || friendships.length === 0) return [];

    // Get the friend IDs (the other person in each friendship)
    const friendIds = friendships.map(f =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    // Fetch user details from users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, display_name, avatar_url')
      .in('id', friendIds);

    if (usersError) throw usersError;

    // Map to Friend objects
    return friendships.map(f => {
      const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      const friendUser = users?.find(u => u.id === friendId);
      return {
        id: f.id,
        user_id: friendId,
        display_name: friendUser?.display_name || 'Unknown',
        username: friendUser?.display_name || '', // username not in DB, fallback to display_name
        avatar_url: friendUser?.avatar_url,
        status: f.status as 'pending' | 'accepted',
      };
    });
  },

  /**
   * Get all accepted friends with their today's step count
   */
  getFriendsWithSteps: async (): Promise<Friend[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get friendships where current user is involved and status is accepted
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (friendshipsError) throw friendshipsError;
    if (!friendships || friendships.length === 0) return [];

    // Get the friend IDs (the other person in each friendship)
    const friendIds = friendships.map(f =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    // Fetch user details from users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, display_name, avatar_url')
      .in('id', friendIds);

    if (usersError) throw usersError;

    const today = getTodayDateString();

    // Fetch today's step entries for all friends
    const { data: stepEntries, error: stepsError } = await supabase
      .from('step_entries')
      .select('user_id, step_count')
      .in('user_id', friendIds)
      .eq('date', today);

    if (stepsError) throw stepsError;

    // Create a map of user_id to step_count for quick lookup
    const stepsMap = new Map<string, number>();
    stepEntries?.forEach((entry) => {
      stepsMap.set(entry.user_id, entry.step_count);
    });

    // Map friendships to Friend objects with today_steps
    return friendships.map(f => {
      const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      const friendUser = users?.find(u => u.id === friendId);
      return {
        id: f.id,
        user_id: friendId,
        display_name: friendUser?.display_name || 'Unknown',
        username: friendUser?.display_name || '', // username not in DB, fallback to display_name
        avatar_url: friendUser?.avatar_url,
        status: f.status as 'pending' | 'accepted',
        today_steps: stepsMap.get(friendId) ?? 0,
      };
    });
  },

  /**
   * Get pending friend requests where current user is the addressee (recipient).
   * Returns the requester's information.
   */
  getRequests: async (): Promise<Friend[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get pending friendships where current user is the addressee (recipient)
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('id, requester_id, status')
      .eq('addressee_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;
    if (!friendships || friendships.length === 0) return [];

    // Get the requester IDs
    const requesterIds = friendships.map(f => f.requester_id);

    // Fetch user details from users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, display_name, avatar_url')
      .in('id', requesterIds);

    if (usersError) throw usersError;

    // Map to Friend objects
    return friendships.map(f => {
      const requesterUser = users?.find(u => u.id === f.requester_id);
      return {
        id: f.id,
        user_id: f.requester_id,
        display_name: requesterUser?.display_name || 'Unknown',
        username: requesterUser?.display_name || '', // username not in DB, fallback to display_name
        avatar_url: requesterUser?.avatar_url,
        status: f.status as 'pending' | 'accepted',
      };
    });
  },

  /**
   * Send a friend request to another user.
   * Current user becomes the requester, target user becomes the addressee.
   */
  sendRequest: async (userId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: userId,
        status: 'pending',
      });

    if (error) throw error;
  },

  /**
   * Accept a pending friend request.
   * The requesterId is the user who sent the request (we are the addressee).
   */
  acceptRequest: async (requesterId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('requester_id', requesterId)
      .eq('addressee_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;
  },

  /**
   * Decline a pending friend request.
   * The requesterId is the user who sent the request (we are the addressee).
   */
  declineRequest: async (requesterId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('requester_id', requesterId)
      .eq('addressee_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;
  },

  /**
   * Remove an existing friend relationship.
   * The friendUserId can be either requester or addressee - we need to find and delete either case.
   */
  removeFriend: async (friendUserId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Try to delete where we are requester and friend is addressee
    const { error: error1 } = await supabase
      .from('friendships')
      .delete()
      .eq('requester_id', user.id)
      .eq('addressee_id', friendUserId)
      .eq('status', 'accepted');

    // Also try to delete where friend is requester and we are addressee
    const { error: error2 } = await supabase
      .from('friendships')
      .delete()
      .eq('requester_id', friendUserId)
      .eq('addressee_id', user.id)
      .eq('status', 'accepted');

    // If both fail, throw an error
    if (error1 && error2) throw error1;
  },

  /**
   * Search for users by username or display_name.
   * Excludes the current user and users who are already friends or have pending requests.
   */
  searchUsers: async (query: string): Promise<UserSearchResult[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (!query.trim()) return [];

    // Search users by display_name (case-insensitive)
    const { data: users, error } = await supabase
      .from('users')
      .select('id, display_name, avatar_url')
      .neq('id', user.id)
      .ilike('display_name', `%${query}%`)
      .limit(20);

    if (error) throw error;
    if (!users || users.length === 0) return [];

    // Get existing friendships to filter out
    const userIds = users.map(u => u.id);
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(
        `and(requester_id.eq.${user.id},addressee_id.in.(${userIds.join(',')})),` +
        `and(addressee_id.eq.${user.id},requester_id.in.(${userIds.join(',')}))`
      );

    if (friendshipsError) throw friendshipsError;

    // Build set of user IDs that have existing friendships
    const existingFriendIds = new Set<string>();
    friendships?.forEach(f => {
      if (f.requester_id === user.id) {
        existingFriendIds.add(f.addressee_id);
      } else {
        existingFriendIds.add(f.requester_id);
      }
    });

    // Filter out users with existing friendships
    return users
      .filter(u => !existingFriendIds.has(u.id))
      .map(u => ({
        id: u.id,
        display_name: u.display_name || 'Unknown',
        username: u.display_name || '', // username not in DB, fallback to display_name
        avatar_url: u.avatar_url,
      }));
  },

  /**
   * Get outgoing friend requests (where current user is the requester and status is pending).
   */
  getOutgoingRequests: async (): Promise<OutgoingRequest[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get pending friendships where current user is the requester
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('id, addressee_id, created_at')
      .eq('requester_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!friendships || friendships.length === 0) return [];

    // Get the addressee IDs
    const addresseeIds = friendships.map(f => f.addressee_id);

    // Fetch user details from users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, display_name, avatar_url')
      .in('id', addresseeIds);

    if (usersError) throw usersError;

    // Map to OutgoingRequest objects
    return friendships.map(f => {
      const addresseeUser = users?.find(u => u.id === f.addressee_id);
      return {
        id: f.id,
        user_id: f.addressee_id,
        display_name: addresseeUser?.display_name || 'Unknown',
        username: addresseeUser?.display_name || '', // username not in DB, fallback to display_name
        avatar_url: addresseeUser?.avatar_url,
        created_at: f.created_at,
      };
    });
  },

  /**
   * Get a user by their ID (for QR code scanning).
   */
  getUserById: async (userId: string): Promise<UserSearchResult | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (userId === user.id) {
      throw new Error('Cannot add yourself as a friend');
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, avatar_url')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return {
      id: data.id,
      display_name: data.display_name || 'Unknown',
      username: data.display_name || '',
      avatar_url: data.avatar_url,
    };
  },

  /**
   * Check if a friendship or pending request already exists with a user.
   */
  checkFriendshipStatus: async (targetUserId: string): Promise<'none' | 'pending_sent' | 'pending_received' | 'accepted'> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if there's an existing friendship
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id, status')
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),` +
        `and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`
      );

    if (error) throw error;
    if (!friendships || friendships.length === 0) return 'none';

    const friendship = friendships[0];
    if (friendship.status === 'accepted') return 'accepted';

    if (friendship.requester_id === user.id) {
      return 'pending_sent';
    } else {
      return 'pending_received';
    }
  },

  /**
   * Cancel a pending outgoing friend request.
   */
  cancelRequest: async (addresseeId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('requester_id', user.id)
      .eq('addressee_id', addresseeId)
      .eq('status', 'pending');

    if (error) throw error;
  },
};
