import { create } from 'zustand';
import { friendsApi } from '@services/api/friendsApi';
import { getErrorMessage } from '@utils/errorUtils';
import { track, setUserProperties } from '@services/analytics';
import { evaluate, MilestoneContext } from '@services/milestones';
import { useAuthStore } from './authStore';

export interface Friend {
  id: string;
  user_id: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  today_steps?: number;
  status: 'pending' | 'accepted';
}

interface FriendsState {
  friends: Friend[];
  requests: Friend[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchFriends: () => Promise<void>;
  fetchFriendsWithSteps: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  sendRequest: (userId: string) => Promise<void>;
  acceptRequest: (userId: string) => Promise<void>;
  declineRequest: (userId: string) => Promise<void>;
  removeFriend: (userId: string) => Promise<void>;
}

/**
 * Helper to find request ID from user ID.
 * The backend API expects request IDs, but the UI passes user IDs.
 * This function looks up the request in the store state or fetches requests if needed.
 */
async function findRequestIdByUserId(
  userId: string,
  requests: Friend[],
  fetchRequests: () => Promise<void>,
  getState: () => FriendsState
): Promise<string> {
  // First, try to find the request in local state
  let request = requests.find(r => r.user_id === userId);

  if (request) {
    return request.id;
  }

  // If not found, fetch requests and try again
  await fetchRequests();
  request = getState().requests.find(r => r.user_id === userId);

  if (request) {
    return request.id;
  }

  // If still not found, the userId might be the request ID itself (backward compatibility)
  // This handles cases where the caller already has the request ID
  return userId;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  requests: [],
  isLoading: false,
  error: null,

  fetchFriends: async () => {
    set({ isLoading: true, error: null });
    try {
      const friends = await friendsApi.getFriends();
      set({ friends, isLoading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  fetchFriendsWithSteps: async () => {
    set({ isLoading: true, error: null });
    try {
      const friends = await friendsApi.getFriendsWithSteps();
      set({ friends, isLoading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  fetchRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const requests = await friendsApi.getRequests();
      set({ requests, isLoading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  sendRequest: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      await friendsApi.sendRequest(userId);

      // Track friend request sent event
      track('friend_request_sent', { friend_id: userId });

      set({ isLoading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  acceptRequest: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const previousFriendCount = get().friends.length;

      // Find the request ID from the user ID
      const requestId = await findRequestIdByUserId(
        userId,
        get().requests,
        get().fetchRequests,
        get
      );

      await friendsApi.acceptRequest(requestId);
      const requests = get().requests.filter(r => r.user_id !== userId && r.id !== requestId);
      set({ requests, isLoading: false });
      await get().fetchFriends();

      const newFriendCount = get().friends.length;

      // Track analytics events
      track('friend_request_accepted', { friend_id: userId });
      track('friend_added', { friend_id: userId });

      // Update user properties with new friend count
      setUserProperties({ friend_count: newFriendCount });

      // Evaluate milestones for friend count changes
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        const context: MilestoneContext = {
          currentMetrics: { friend_count: newFriendCount },
          previousMetrics: { friend_count: previousFriendCount },
          userId: currentUser.id,
        };
        await evaluate(context);
      }
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  declineRequest: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      // Find the request ID from the user ID
      const requestId = await findRequestIdByUserId(
        userId,
        get().requests,
        get().fetchRequests,
        get
      );

      await friendsApi.declineRequest(requestId);
      const requests = get().requests.filter(r => r.user_id !== userId && r.id !== requestId);

      // Track friend request declined event
      track('friend_request_declined', { friend_id: userId });

      set({ requests, isLoading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  removeFriend: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      await friendsApi.removeFriend(userId);
      const friends = get().friends.filter(f => f.user_id !== userId);

      // Track friend removed event
      track('friend_removed', { friend_id: userId });

      // Update user properties with new friend count
      setUserProperties({ friend_count: friends.length });

      set({ friends, isLoading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },
}));
