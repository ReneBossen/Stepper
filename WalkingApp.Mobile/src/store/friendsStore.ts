import { create } from 'zustand';
import { friendsApi } from '@services/api/friendsApi';

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
  fetchRequests: () => Promise<void>;
  sendRequest: (userId: string) => Promise<void>;
  acceptRequest: (userId: string) => Promise<void>;
  declineRequest: (userId: string) => Promise<void>;
  removeFriend: (userId: string) => Promise<void>;
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
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const requests = await friendsApi.getRequests();
      set({ requests, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  sendRequest: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      await friendsApi.sendRequest(userId);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  acceptRequest: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      await friendsApi.acceptRequest(userId);
      const requests = get().requests.filter(r => r.user_id !== userId);
      set({ requests, isLoading: false });
      await get().fetchFriends();
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  declineRequest: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      await friendsApi.declineRequest(userId);
      const requests = get().requests.filter(r => r.user_id !== userId);
      set({ requests, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  removeFriend: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      await friendsApi.removeFriend(userId);
      const friends = get().friends.filter(f => f.user_id !== userId);
      set({ friends, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
}));
