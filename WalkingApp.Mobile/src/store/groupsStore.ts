import { create } from 'zustand';
import { groupsApi } from '@services/api/groupsApi';

export interface Group {
  id: string;
  name: string;
  description?: string;
  competition_type: 'daily' | 'weekly' | 'monthly';
  is_private: boolean;
  member_count: number;
  created_at: string;
}

export interface GroupMember {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  steps: number;
  rank: number;
}

interface GroupsState {
  groups: Group[];
  currentGroup: Group | null;
  leaderboard: GroupMember[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchGroups: () => Promise<void>;
  fetchGroup: (groupId: string) => Promise<void>;
  fetchLeaderboard: (groupId: string) => Promise<void>;
  createGroup: (data: CreateGroupData) => Promise<Group>;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  competition_type: 'daily' | 'weekly' | 'monthly';
  is_private: boolean;
}

export const useGroupsStore = create<GroupsState>((set) => ({
  groups: [],
  currentGroup: null,
  leaderboard: [],
  isLoading: false,
  error: null,

  fetchGroups: async () => {
    set({ isLoading: true, error: null });
    try {
      const groups = await groupsApi.getGroups();
      set({ groups, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchGroup: async (groupId) => {
    set({ isLoading: true, error: null });
    try {
      const group = await groupsApi.getGroup(groupId);
      set({ currentGroup: group, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchLeaderboard: async (groupId) => {
    set({ isLoading: true, error: null });
    try {
      const leaderboard = await groupsApi.getLeaderboard(groupId);
      set({ leaderboard, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createGroup: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const group = await groupsApi.createGroup(data);
      set({ isLoading: false });
      return group;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  joinGroup: async (groupId) => {
    set({ isLoading: true, error: null });
    try {
      await groupsApi.joinGroup(groupId);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  leaveGroup: async (groupId) => {
    set({ isLoading: true, error: null });
    try {
      await groupsApi.leaveGroup(groupId);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
}));
